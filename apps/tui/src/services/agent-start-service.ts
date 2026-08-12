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

export interface StartOutcome {
  ok: boolean;
  /** Real message from the vendored pipeline (or the real import failure). */
  detail: string;
  taskId: string;
  at: string; // ISO timestamp
}

type AgentManagerLike = {
  startTaskExecution: (
    taskId: string,
    projectPath: string,
    specId: string,
    options?: Record<string, unknown>,
    projectId?: string,
  ) => Promise<void>;
  once: (event: string, cb: (...args: never[]) => void) => unknown;
  on: (event: string, cb: (...args: never[]) => void) => unknown;
};

let managerPromise: Promise<AgentManagerLike> | null = null;

function getManager(): Promise<AgentManagerLike> {
  if (!managerPromise) {
    managerPromise = import('@main/agent/agent-manager').then(
      (m) => new m.AgentManager() as unknown as AgentManagerLike,
    );
  }
  return managerPromise;
}

const START_EVENTS: Array<{ event: string; ok: boolean; label: (a: unknown[]) => string }> = [
  { event: 'error', ok: false, label: (a) => String(a[1] ?? 'agent pipeline error') },
  { event: 'task-started', ok: true, label: () => 'agent process started' },
  { event: 'task-failed', ok: false, label: (a) => String(a[1] ?? 'task failed') },
  { event: 'task-complete', ok: true, label: () => 'task completed' },
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
  return await new Promise<StartOutcome>((resolve) => {
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
    am.startTaskExecution(task.id, project.path, task.specId, {}, project.id).catch((err: unknown) => {
      finish(false, `startTaskExecution rejected: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    });
  });
}
