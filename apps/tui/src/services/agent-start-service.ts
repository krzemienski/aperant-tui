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
import type { Project, Task, ImplementationPlan } from '@shared/types';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSpecsDir, AUTO_BUILD_PATHS } from '@shared/constants';
import { readSettingsFile } from '@main/settings-utils';
import { buildDefaultQueueConfig } from '@main/ai/auth/resolver';
import { PROVIDER_ENV_VARS, PROVIDER_BASE_URL_ENV } from '@main/ai/auth/types';
import type { SupportedProvider } from '@main/ai/providers/types';
import { observability } from './observability';
import { findTaskWorktree } from '@main/worktree-paths';
import { getPlanPath, syncPlanPhasesToMainSync } from '@main/ipc-handlers/task/plan-file-utils';
import { safeParseJson } from '@main/utils/json-repair';
import { findTaskAndProject } from '@main/ipc-handlers/task/shared';
import { writeFileAtomicSync } from '@main/utils/atomic-file';
import { projectStore } from '@main/project-store';

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
  // D-D: the vendored queue also emits these during ideation runs
  // (agent-queue.ts runIdeationRunner:246-252) but they were never observed
  // here, so an ideation run left no trace in the durable JSONL flight
  // recorder and no observability tap.
  'ideation-progress',
  'ideation-log',
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

// ---------------------------------------------------------------------------
// F-17: plan sync on exit (TUI port of the desktop exit handler)
//
// The vendored desktop app syncs the worktree's implementation_plan.json
// phases back into the main project's plan on every agent process exit —
// apps/desktop/src/main/ipc-handlers/agent-events-handlers.ts:191-196:
//
//   // Sync subtask data from worktree plan to main project's plan file.
//   // The agent writes subtask statuses to the worktree; the main plan's
//   // phases may be stale. Syncing ensures getTasks() dedup (which prefers
//   // main) sees correct data.
//   if (finalPlan?.phases && exitTask && exitProject) {
//     syncPlanPhasesToMainSync(getPlanPath(exitProject, exitTask), finalPlan.phases, exitProjectId);
//   }
//
// That handler is registered ONLY by registerAgenteventsHandlers()
// (apps/desktop/src/main/ipc-handlers/index.ts:71), which is Electron IPC
// bootstrap the TUI never calls — the TUI talks to the SAME AgentManager
// class directly (getManager() below), so the underlying 'exit' event (real
// emitter, apps/desktop/src/main/agent/agent-process.ts:787/804/915) fires
// for the TUI too, but nothing was listening for it to do this sync. Without
// it a fully-completed task (worktree plan status: human_review, all
// subtasks done) permanently shows BACKLOG 0% on the board: the main
// project's implementation_plan.json never existed or never got the
// worktree's phases, ProjectStore.determineTaskStatusAndReason() defaults a
// null/missing plan to 'backlog', and getTasks() dedup explicitly PREFERS
// the main-project entry over the (correct) worktree entry
// (project-store.ts:350-358).
//
// PATCH (reopened as F-17): syncPlanPhasesToMainSync is a pure UPDATE — it
// readFileSync's mainPlanPath first (plan-file-utils.ts:587) and on ENOENT
// silently returns false without writing anything (:605-607). The desktop
// app never hits this because its flow writes a main-side plan earlier in
// the task lifecycle (persistPlanStatusAndReasonSync's "create a minimal
// plan" branch, task-state-manager.ts XState transitions, TASK_UPDATE_STATUS
// createPlanIfNotExists, etc.) — by exit time there is always something to
// update. The TUI has NONE of that machinery. Verified by reading every TUI
// write path: task-lifecycle-service.ts only calls persistPlanStatusSync
// (plan-file-utils.ts:167-197), which ALSO silently no-ops on ENOENT
// (:191-193, "File not found is expected — return false") — it never
// creates. roadmap-convert.ts explicitly does NOT write a plan (that omission
// is itself a documented, deliberate fix — see docs/plan/phases/
// phase-4-VALIDATION.md:47-52 and the VENDORED-CONTRACT NOTE in
// roadmap-convert.ts:87-94: writing even an empty `phases: []` placeholder
// makes the vendored build-orchestrator's isFirstRun()
// (ai/orchestration/build-orchestrator.ts:677-681) treat the task as
// already-planned and skip the planner). And startTaskExecution /
// startSpecCreation in agent-manager.ts create a worktree and spawn the
// worker with no main-side plan write anywhere before that (verified by
// reading both functions end-to-end). So for a TUI-started task the main
// plan genuinely does not exist until THIS sync creates it — the prior
// port's call to syncPlanPhasesToMainSync alone was therefore a no-op for
// exactly the reported case.
//
// Fix: when the main plan file is absent, WRITE THE WORKTREE PLAN WHOLESALE
// to the main path (not just phases) — the worktree plan is already the
// complete, validated, schema-correct record (it passed the build
// orchestrator's own JSON-schema validation to get this far; see
// build-orchestrator.ts:359-364's `validateAndNormalizeJsonFile`) and
// carries the real `status`/`reviewReason` the XState layer already set on
// it. Copying it wholesale is strictly more correct than the "phases-only"
// update `syncPlanPhasesToMainSync` performs for the already-exists case,
// because there IS no existing main-side status/reviewReason/xstateState to
// preserve — nothing is clobbered. When the main file DOES exist (e.g. a
// created-but-not-yet-observed-here plan, or a rerun), the create branch is
// never taken — `writeFileAtomicSync` is called ONLY inside the
// `!existsSync(mainPlanPath)` branch below — and the vendored
// `syncPlanPhasesToMainSync` (phases-only, preserves the rest) runs instead,
// exactly as before.
//
// SAFETY AGAINST RESURRECTING THE PLACEHOLDER BUG: this function runs ONLY
// from `attachPlanSync`'s `exit` listener — i.e. strictly AFTER a process
// has already exited with a plan on disk. It is never reachable from
// `startTask`'s pre-flight/spawn path (no call site anywhere before
// `am.startTaskExecution`/`am.startSpecCreation`), so it cannot run before
// or during planning and cannot be the thing `isFirstRun()` sees when a
// fresh task starts. It also only ever writes the WORKTREE's own
// already-populated plan (guarded by the same `phases.length === 0` check
// below) — it can never manufacture or write an empty-phases plan, so even
// if some future caller did invoke it early, its own guard would refuse to
// write anything until the worktree plan is real.
//
// This is a SEPARATE, LATER concern from the start-outcome promise in
// startTask() below — that promise MUST keep resolving on the FIRST outcome
// event (D5 fix; 'task-started' etc. never exist in this runtime) and must
// NEVER wait for exit. This listener is attached once, alongside the event
// log, and does its own thing on every future exit — it does not touch or
// delay the promise settlement path at all.
function syncPlanOnExit(taskId: string, _code: unknown, _processType: unknown, projectId?: unknown): void {
  try {
    const pid = typeof projectId === 'string' ? projectId : undefined;
    const { task: exitTask, project: exitProject } = findTaskAndProject(taskId, pid);
    if (!exitTask || !exitProject) return; // task/project no longer resolvable — nothing to sync onto

    const worktreePath = findTaskWorktree(exitProject.path, exitTask.specId);
    if (!worktreePath) return; // no worktree ever existed (e.g. local-branch task) — main IS the source

    const specsBaseDir = getSpecsDir(exitProject.autoBuildPath);
    const worktreePlanPath = path.join(worktreePath, specsBaseDir, exitTask.specId, AUTO_BUILD_PATHS.IMPLEMENTATION_PLAN);

    let rawContent: string;
    try {
      rawContent = readFileSync(worktreePlanPath, 'utf8');
    } catch {
      // worktree plan not readable (removed, race with discard, etc.) — nothing to sync
      return;
    }
    const finalPlan = safeParseJson<ImplementationPlan>(rawContent);

    // No plan, or a plan with no phases: syncing would either crash on
    // undefined or overwrite/create a main plan with an empty phases array,
    // manufacturing a FALSE completed-or-empty state. Do nothing — the main
    // plan (if any) keeps whatever status it already has, which is the
    // honest thing when the worktree side has nothing new to report.
    if (!finalPlan?.phases || finalPlan.phases.length === 0) return;

    const mainPlanPath = getPlanPath(exitProject, exitTask);
    let ok: boolean;
    if (!existsSync(mainPlanPath)) {
      // The exact case this fix exists for: no main plan to update. Write
      // the worktree's own (already-validated, already-complete) plan
      // wholesale — same content that made it this far, just at the main
      // path — and let getTasks() pick it up on next scan.
      try {
        writeFileAtomicSync(mainPlanPath, rawContent);
        if (exitProject.id) projectStore.invalidateTasksCache(exitProject.id);
        ok = true;
      } catch (err) {
        appendEvent('plan-sync-failed', [taskId, {
          reason: 'create',
          mainPlanPath,
          error: err instanceof Error ? err.message : String(err),
        }]);
        ok = false;
      }
    } else {
      ok = syncPlanPhasesToMainSync(mainPlanPath, finalPlan.phases, exitProject.id);
    }

    // F-17 fix for the original bug: a silent `false` return is exactly how
    // this went unnoticed the first time. Surface a failed sync into the
    // same durable JSONL flight recorder every other agent event goes
    // through, so it is discoverable (tail agent-events.jsonl) instead of
    // vanishing.
    if (!ok) {
      appendEvent('plan-sync-failed', [taskId, { reason: 'update', mainPlanPath }]);
    }
  } catch (err) {
    // Sync is best-effort — a failure here must never crash the exit path
    // or the event log — but it must still be discoverable, not silently
    // swallowed (that silence is how F-17 shipped unnoticed the first time).
    appendEvent('plan-sync-failed', [taskId, {
      reason: 'unexpected',
      error: err instanceof Error ? err.message : String(err),
    }]);
  }
}

let planSyncAttached = false;

/** Attach the exit → plan-sync listener once per AgentManager instance. */
function attachPlanSync(am: AgentManagerLike): void {
  if (planSyncAttached) return;
  planSyncAttached = true;
  am.on('exit', ((...args: unknown[]) => {
    const [taskId, code, processType, projectId] = args;
    syncPlanOnExit(String(taskId), code, processType, projectId);
  }) as never);
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
    metadata?: { model?: string; provider?: string; phaseModels?: Record<string, string>; requireReviewBeforeCoding?: boolean; useAgenticOrchestration?: boolean },
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

/**
 * F-12: maps `ProviderAccount.provider` (a `BuiltinProvider`, e.g.
 * `'moonshot'`) to `SupportedProvider` for indexing `PROVIDER_ENV_VARS` /
 * `PROVIDER_BASE_URL_ENV`. The vendored resolver has the identical map
 * (`BUILTIN_TO_SUPPORTED`, resolver.ts:323-337) but it is a private,
 * unexported `const` — not reusable across the module boundary without
 * adding an export to vendored code for a one-line lookup table, which is
 * disproportionate to a genuinely-shared piece of logic (the account
 * SELECTION algorithm, `buildDefaultQueueConfig()`, which IS already
 * exported and IS reused above). Kept in sync manually; the two maps are
 * identical today.
 */
const BUILTIN_TO_SUPPORTED_PROVIDER: Record<string, SupportedProvider> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
  'amazon-bedrock': 'bedrock',
  azure: 'azure',
  mistral: 'mistral',
  groq: 'groq',
  xai: 'xai',
  openrouter: 'openrouter',
  zai: 'zai',
  ollama: 'ollama',
  moonshot: 'moonshot',
};

/** Start a task through the real vendored pipeline; resolve with the real first outcome event. */
/**
 * D19 helper: mirror the highest-priority provider account (and the operator's
 * ANTHROPIC_AUTH_TOKEN alias) into the standard SDK env names, so the agent
 * Worker thread — which re-resolves auth from process.env — can authenticate.
 *
 * Never overwrites a value the operator set explicitly, and never logs a key.
 *
 * D-C: exported and shared by every AI entry point (task start, roadmap,
 * insights, ideation) — previously only `startTask` called this, so an
 * operator supplying credentials solely as ANTHROPIC_AUTH_TOKEN got
 * roadmap/insights/ideation runs with no key resolvable from env until
 * after the first task start on the board — an order-dependent auth
 * failure.
 *
 * F-12: this used to pick the account via `accounts.find((a) => a.provider
 * === 'anthropic' && a.apiKey)` — array-INSERTION-order, not priority
 * order, and hardcoded to anthropic. That conflates "first inserted" with
 * "active": `docs/plan/ROADMAP.md:15`'s Phase 6 gate requires "profile
 * switch changes the active credential and the next agent run uses it",
 * and P6.2's `activateAccount()` (account-service.ts:232-282) defines
 * "active" as the HEAD of `globalPriorityOrder`, not array position.
 * With 2+ accounts this exported whichever sat earlier in
 * `providerAccounts[]` regardless of which one the user just activated;
 * with a non-anthropic active account it exported nothing and left stale
 * ANTHROPIC_* vars from a previous session in place.
 *
 * Fixed by reusing `buildDefaultQueueConfig()` — the SAME function
 * `createSimpleClient()`/`createAgentClient()` call internally
 * (client/factory.ts:252) and the same contract `account-service.ts`'s
 * `activateAccount()` doc comment cites — instead of re-deriving the sort
 * here. One source of truth for "who is active"; `providerAccounts[]`
 * itself is never reordered, only read.
 */
export function applyAccountEnv(): void {
  if (!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_AUTH_TOKEN) {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_AUTH_TOKEN;
  }
  try {
    // F-12: `requestedModel` is not used for account selection here — it is
    // only echoed back unread on the returned object (resolver.ts:478) and
    // only consulted later by `resolveAuthFromQueue()`, which this function
    // never calls. An empty string is the correct "don't care" value.
    // `buildDefaultQueueConfig()` itself tolerates `globalPriorityOrder`
    // being either a JSON string or a real array (resolver.ts:461-467); no
    // extra shape-handling is needed on this side of the call.
    const queueConfig = buildDefaultQueueConfig('');
    const effectiveAccount = queueConfig?.queue[0];

    if (!effectiveAccount) {
      // No providerAccounts[] configured at all — fall back to the one
      // legacy top-level credential field AppSettings actually defines
      // (PROVIDER_SETTINGS_KEY.anthropic → globalAnthropicApiKey), the same
      // field `resolveFromProfileApiKey()` (resolver.ts:199-220) reads as
      // Stage 2 of the real multi-stage `resolveAuth()` chain.
      const legacyKey = readSettingsFile()?.globalAnthropicApiKey;
      if (!process.env.ANTHROPIC_API_KEY && typeof legacyKey === 'string' && legacyKey) {
        process.env.ANTHROPIC_API_KEY = legacyKey;
      }
      return;
    }

    // F-12: provider-aware — export the env names appropriate to the
    // SELECTED account's provider, not a hardcoded anthropic check.
    // `PROVIDER_ENV_VARS`/`PROVIDER_BASE_URL_ENV` (auth/types.ts) are the
    // vendored source of truth the real resolver's own environment stage
    // reads (`resolveFromEnvironment()`, resolver.ts:232-251); read from
    // there rather than guessing names.
    const supportedProvider = BUILTIN_TO_SUPPORTED_PROVIDER[effectiveAccount.provider];
    if (supportedProvider) {
      const envVar = PROVIDER_ENV_VARS[supportedProvider];
      if (envVar && !process.env[envVar] && effectiveAccount.apiKey) {
        process.env[envVar] = effectiveAccount.apiKey;
      }
      const baseUrlEnv = PROVIDER_BASE_URL_ENV[supportedProvider];
      if (baseUrlEnv && !process.env[baseUrlEnv] && effectiveAccount.baseUrl) {
        process.env[baseUrlEnv] = effectiveAccount.baseUrl;
      }
    }
    // Moonshot has no PROVIDER_BASE_URL_ENV entry (the real resolver never
    // reads a base-URL env var for it — moonshot's baseURL always comes
    // from the account's own `.baseUrl` field, resolver.ts:539-559), but
    // MOONSHOT_BASE_URL is a real INPUT `provisionMoonshotAccount()` reads
    // (account-service.ts:75) — mirror it defensively for that entry
    // point's benefit. Additive only; never overwrites an operator value.
    if (
      effectiveAccount.provider === 'moonshot' &&
      !process.env.MOONSHOT_BASE_URL &&
      effectiveAccount.baseUrl
    ) {
      process.env.MOONSHOT_BASE_URL = effectiveAccount.baseUrl;
    }
  } catch {
    // Malformed settings are already surfaced by the settings view; auth
    // failure will be reported verbatim by the real pipeline.
  }
}

export async function startTask(project: Project, task: Task): Promise<StartOutcome> {
  const at = new Date().toISOString();
  // D19: the agent worker is a separate Worker thread; it inherits process.env
  // and re-resolves auth itself through the AI SDK, which reads the STANDARD
  // names (ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL). The TUI's provisioned
  // account lives in settings.json and the operator supplies the token as
  // ANTHROPIC_AUTH_TOKEN, so the worker saw no key at all and every planner
  // session died with "anthropic api key is missing" — surfacing downstream as
  // the misleading "Implementation plan validation failed … File not found:
  // implementation_plan.json" (the planner never ran, so it never wrote one).
  // Export the account's own credentials under the names the SDK expects.
  applyAccountEnv();
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
    attachPlanSync(am); // F-17: worktree plan → main plan sync on every exit
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
      ? am.startSpecCreation(
          task.id, project.path, taskDescription, specDir,
          {
            requireReviewBeforeCoding: false,
            // Agentic-orchestration opt-in (2026-09-17, spec P3.5.11): the
            // board's `s` key never threaded task.metadata through to this
            // call at all (it still doesn't — Task carries no persisted
            // metadata field the board reads here). This env-gated switch
            // is the narrowest possible reachability path for the P3.5.11
            // live-drive proof: unset (the default for every normal run)
            // it is `undefined`, matching today's exact behavior 1:1.
            useAgenticOrchestration: process.env.APERANT_AGENTIC_SPEC_ORCHESTRATION === '1',
          },
          undefined, project.id,
        )
      : am.startTaskExecution(
          task.id,
          project.path,
          task.specId,
          // D23: keep task branches LOCAL. createOrGetWorktree publishes to
          // origin by default (worktree-manager.ts:89 `pushNewBranches = true`,
          // push at :210-222), and agent-manager.ts:485 only opts out when the
          // project setting is exactly `false` — an absent projects.json
          // therefore means "push". Starting an agent from the TUI would
          // publish `auto-claude/<spec>` to whatever repo the user happened to
          // open. A local TUI run must not write to someone's remote; the
          // worktree and the diff are the work product, and publishing is a
          // separate, explicit act (Phase 5 `tree` view).
          { parallel: false, workers: 1, pushNewBranches: false },
          project.id,
        );
    starter.catch((err: unknown) => {
      finish(false, `start rejected: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    });
  });
}
