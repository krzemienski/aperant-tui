/**
 * Task lifecycle service — status moves go through the SAME vendored
 * plan-file-utils the desktop's IPC handlers use: persistPlanStatusSync
 * writes the real implementation_plan.json on disk (atomic write) and
 * invalidates the projectStore cache. No TUI-side state shadowing.
 */
import { getPlanPath, persistPlanStatusSync } from '@main/ipc-handlers/task/plan-file-utils';
import type { Project, Task, TaskStatus } from '@shared/types';
import { STATUS_ORDER } from './task-service';

export type MoveResult =
  | { ok: true; from: TaskStatus; to: TaskStatus }
  | { ok: false; reason: string };

/** Move a task one column left (-1) or right (+1), persisting to disk. */
export function moveTask(project: Project, task: Task, dir: 1 | -1): MoveResult {
  const i = STATUS_ORDER.indexOf(task.status);
  if (i === -1) {
    return { ok: false, reason: `status "${task.status}" is outside the movable columns` };
  }
  const j = i + dir;
  if (j < 0 || j >= STATUS_ORDER.length) {
    return { ok: false, reason: `already at ${dir === 1 ? 'last' : 'first'} column` };
  }
  const to = STATUS_ORDER[j];
  const planPath = getPlanPath(project, task);
  // persistPlanStatusSync is the vendored sync writer: documented safe here
  // because the TUI initiates no concurrent async plan operations.
  const persisted = persistPlanStatusSync(planPath, to, project.id);
  if (!persisted) {
    return { ok: false, reason: `plan file not written: ${planPath}` };
  }
  return { ok: true, from: task.status, to };
}
