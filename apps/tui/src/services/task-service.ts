/**
 * Task service — thin wrapper over the same projectStore functions the
 * desktop's task-handlers wrap. Tasks are discovered from the project's real
 * .auto-claude/specs/ tree by the vendored code, not by the TUI.
 */
import { projectStore } from '@main/project-store';
import type { Project, Task, TaskStatus } from '@shared/types';

export interface TaskCounts {
  running: number;
  review: number;
  done: number;
  total: number;
}

export function getTasks(project: Project): Task[] {
  return projectStore.getTasks(project.id);
}

export function getCounts(project: Project): TaskCounts {
  const tasks = getTasks(project);
  return {
    running: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'human_review' || t.status === 'ai_review').length,
    done: tasks.filter((t) => t.status === 'done').length,
    total: tasks.length,
  };
}

export const STATUS_ORDER: TaskStatus[] = ['backlog', 'queue', 'in_progress', 'ai_review', 'human_review', 'done'];

export function groupByStatus(tasks: Task[]): Array<[TaskStatus, Task[]]> {
  const groups: Array<[TaskStatus, Task[]]> = [];
  for (const s of STATUS_ORDER) {
    const items = tasks.filter((t) => t.status === s);
    if (items.length) groups.push([s, items]);
  }
  // Surface statuses outside the known order (error, pr_created, ...) rather than hiding them.
  const known = new Set<string>(STATUS_ORDER);
  const other = tasks.filter((t) => !known.has(t.status));
  if (other.length) groups.push(['error' as TaskStatus, other]);
  return groups;
}

export function refreshTasks(project: Project): Task[] {
  projectStore.invalidateTasksCache(project.id);
  return projectStore.getTasks(project.id);
}
