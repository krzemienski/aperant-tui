/**
 * Agent start service — wires the board's `s` key to the REAL vendored
 * AgentManager.startTaskExecution pipeline (in-process, no IPC).
 *
 * The pipeline's real pre-flight (profile manager init + auth check) decides
 * the outcome. In an environment without credentials the real outcome is the
 * vendored 'error' event ("Authentication required…") — surfaced verbatim.
 * When credentials exist, the same path starts the real agent and the
 * outcome is the real 'task-started' event. Nothing is simulated either way.
 *
 * The import is lazy because the vendored closure pulls the full AI provider
 * SDK set; a resolution failure is itself a real, reportable error.
 */
import type { Project, Task } from '@shared/types';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSpecsDir } from '@shared/constants';
import { observability } from './observability';

export interface StartOutcome {
  ok: boolean;
  /** Real message from the vendored pipeline (or the real import failure). */
  detail: string;
  taskId: string;
  at: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Persistent agent event log (REAL, durable)
//
// Every event emitted by the vendored AgentManager is appended as one JSONL
// line to $APERANT_USER_DATA/logs/agent-events.jsonl. This is the TUI's own
// flight recorder: gate runs assert against it, users can tail it. Events are
// written verbatim (message + timestamp); serialization is defensive so a
// pathological payload can never break logging itself.
// ---------------------------------------------------------------------------

// The REAL vendored event contract (AgentManager is the emitter; verified
// against agent-process.ts/agent-manager.ts — there is no 'task-started' or
// 'task-failed' event anywhere in the vendored runtime):
//   error | log | execution-progress | task-event | exit | sdk-rate-limit
const OBSERVED_EVENTS = [
  'log',
  'error',
  'execution-progress',
  'task-event',
  'stream-event',
  'exit',
  'sdk-rate-limit',
  'roadmap-progress',
  'roadmap-log',
  'roadmap-complete',
  'roadmap-error',
] as const;

let eventLogAttached = false;

export function getAgentEventLogPath(): string {
  const base = process.env.APERANT_USER_DATA || path.join(os.homedir(), '.aperant');
  return path.join(base, 'logs', 'agent-events.jsonl');
}

function safePayload(value: unknown): unknown {
  if (value instanceof Error) return { error: value.message, stack: value.stack?.split('\n').slice(0, 4).join('\n') };
  if (typeof value === 'string') return value.slice(0, 4000);
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return String(value).slice(0, 1000);
  }
}

function appendEvent(event: string, args: unknown[]): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    taskId: args[0] ?? null,
    payload: args.slice(1).map(safePayload),
  }) + '\n';
  try {
    const p = getAgentEventLogPath();
    mkdirSync(path.dirname(p), { recursive: true });
    appendFileSync(p, line);
  } catch {
    /* logging must never crash the app */
  }
}

function attachEventLog(am: AgentManagerLike): void {
  if (eventLogAttached) return;
  eventLogAttached = true;
  for (const event of OBSERVED_EVENTS) {
    am.on(event, ((...args: unknown[]) => appendEvent(event, args)) as never);
  }
}

export type AgentManagerLike = {
  startTaskExecution: (
    taskId: string,
    projectPath: string,
    specId: string,
    options?: Record<string, unknown>,
    projectId?: string,
  ) => Promise<void>;
  startRoadmapGeneration: (
    projectId: string, projectPath: string, refresh?: boolean,
    enableCompetitorAnalysis?: boolean, refreshCompetitorAnalysis?: boolean,
    config?: { model?: string; thinkingLevel?: string },
  ) => void;
  startSpecCreation: (
    taskId: string,
    projectPath: string,
    taskDescription: string,
    specDir?: string,
    metadata?: { model?: string; provider?: string; phaseModels?: Record<string, string>; requireReviewBeforeCoding?: boolean },
    baseBranch?: string,
    projectId?: string,
  ) => Promise<void>;
  stopRoadmap: (projectId: string) => boolean;
  isRoadmapRunning: (projectId: string) => boolean;
  once: (event: string, cb: (...args: never[]) => void) => unknown;
  on: (event: string, cb: (...args: never[]) => void) => unknown;
  removeListener?: (event: string, cb: (...args: never[]) => void) => unknown;
};

let managerPromise: Promise<AgentManagerLike> | null = null;

/** The shared AgentManager singleton — roadmap/ideation services MUST reuse
 *  this instance: a second manager would fork the event stream and bypass
 *  the flight recorder and observability tap. */
export function getManager(): Promise<AgentManagerLike> {
  if (!managerPromise) {
    managerPromise = import('@main/agent/agent-manager').then(
      (m) => new m.AgentManager() as unknown as AgentManagerLike,
    );
  }
  return managerPromise;
}

// D5 fix: the previous set listened for 'task-started'/'task-failed'/'task-complete',
// which the vendored runtime NEVER emits — with a working account `s` would have
// timed out even though the agent genuinely started. The real first-outcome
// signals are: 'error' (pre-flight/runtime failure), 'execution-progress'
// (emitted synchronously after a successful worker spawn = started), 'exit'.
const START_EVENTS: Array<{ event: string; ok: boolean; label: (a: unknown[]) => string }> = [
  { event: 'error', ok: false, label: (a) => String(a[1] ?? 'agent pipeline error') },
  {
    event: 'execution-progress', ok: true,
    label: (a) => `agent started — phase ${(a[1] as { phase?: string })?.phase ?? 'planning'}`,
  },
  {
    event: 'exit', ok: false,
    label: (a) => `agent exited before producing progress (code ${String(a[1] ?? '?')})`,
  },
];

/** Start a task through the real vendored pipeline; resolve with the real first outcome event. */
export async function startTask(project: Project, task: Task): Promise<StartOutcome> {
  const at = new Date().toISOString();
  let am: AgentManagerLike;
  try {
    am = await getManager();
  } catch (err) {
    return {
      ok: false,
      taskId: task.id,
      at,
      detail: `vendored agent runtime unavailable: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    };
  }
  observability.attachToManager(am); // observability tap (swarm/trace/tokens views)
  return await new Promise<StartOutcome>((resolve) => {
    attachEventLog(am); // durable JSONL flight recorder — attached before start
    let settled = false;
    const handlers: Array<{ event: string; cb: (...args: unknown[]) => void }> = [];
    const cleanup = () => {
      const em = am as unknown as { removeListener: (e: string, cb: unknown) => void };
      for (const h of handlers) em.removeListener(h.event, h.cb);
    };
    const finish = (ok: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({ ok, taskId: task.id, at, detail });
    };
    const timer = setTimeout(() => {
      finish(false, 'no outcome event from agent pipeline within 30s');
    }, 30_000);
    for (const { event, ok, label } of START_EVENTS) {
      const cb = (...args: unknown[]) => finish(ok, label(args));
      handlers.push({ event, cb });
      am.once(event, cb as never);
    }
    // Port of the desktop TASK_START branch (execution-handlers.ts:292-360):
    // no spec.md → spec creation; spec.md but no plan subtasks → task
    // execution in sequential mode (the planner agent generates the plan
    // before the coder starts); else normal execution.
    const specsRel = getSpecsDir(project.autoBuildPath);
    const specDir = path.join(project.path, specsRel, task.specId);
    const hasSpec = existsSync(path.join(specDir, 'spec.md'));
    const planPath = path.join(specDir, 'implementation_plan.json');
    let planHasSubtasks = false;
    let taskDescription = task.title ?? task.id;
    try {
      const plan = JSON.parse(readFileSync(planPath, 'utf8')) as { phases?: unknown[]; description?: string };
      planHasSubtasks = Array.isArray(plan.phases)
        && plan.phases.some((ph) => Array.isArray((ph as { subtasks?: unknown[] }).subtasks) && (ph as { subtasks?: unknown[] }).subtasks!.length > 0);
      if (typeof plan.description === 'string' && plan.description) taskDescription = plan.description;
    } catch {
      // invalid/missing plan — treat as no subtasks (planner regenerates)
    }
    const starter: Promise<void> = !hasSpec
      ? am.startSpecCreation(task.id, project.path, taskDescription, specDir, { requireReviewBeforeCoding: false }, undefined, project.id)
      : am.startTaskExecution(task.id, project.path, task.specId, { parallel: false, workers: 1 }, project.id);
    starter.catch((err: unknown) => {
      finish(false, `start rejected: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    });
  });
}
