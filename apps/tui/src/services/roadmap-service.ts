/**
 * Roadmap service — drives the REAL vendored roadmap runner in-process.
 *
 * `generate()` goes through the SHARED AgentManager singleton (exported by
 * agent-start-service — one manager, one event stream, one flight
 * recorder): AgentManager.startRoadmapGeneration →
 * agent-queue.runRoadmapRunner → runRoadmapGeneration
 * (ai/runners/roadmap): discovery → features phases with tool-calling
 * (Read/Write/Glob/Grep…), each phase validated on disk and retried up to
 * 3×. Progress streams back over the manager emitter
 * (`roadmap-progress` / `roadmap-log` / `roadmap-complete` /
 * `roadmap-error`) exactly as the desktop IPC layer consumed it.
 */
import type { Project } from '@shared/types';
import { getManager, applyAccountEnv, type AgentManagerLike } from './agent-start-service';

export interface RoadmapProgress {
  phase: string;
  progress: number;
  message: string;
}

/** Subscribe to roadmap events for a project; returns unsubscribe. */
export async function subscribeRoadmap(
  projectId: string,
  on: (kind: 'progress' | 'log' | 'complete' | 'error', payload: unknown) => void,
): Promise<() => void> {
  const am: AgentManagerLike = await getManager();
  const mine = (fn: (a: unknown) => void) => (id: unknown, ...rest: unknown[]) => {
    if (id === projectId) fn(rest[0]);
  };
  const handlers: Array<[string, (id: unknown, ...rest: unknown[]) => void]> = [
    ['roadmap-progress', mine((p) => on('progress', p))],
    ['roadmap-log', mine((l) => on('log', l))],
    ['roadmap-complete', mine((r) => on('complete', r))],
    ['roadmap-error', mine((e) => on('error', e))],
  ];
  for (const [event, handler] of handlers) am.on(event, handler as never);
  return () => {
    for (const [event, handler] of handlers) am.removeListener?.(event, handler as never);
  };
}

/** Start a real roadmap generation for the project. */
export async function startGeneration(project: Project, opts: { refresh?: boolean; model?: string } = {}): Promise<void> {
  // D-C: mirror the provisioned account into the standard SDK env names
  // before the manager resolves auth — see agent-start-service.applyAccountEnv.
  applyAccountEnv();
  const am = await getManager();
  am.startRoadmapGeneration(project.id, project.path, opts.refresh ?? false, false, false,
    opts.model ? { model: opts.model, thinkingLevel: 'medium' } : undefined);
}

/** Abort a running generation. */
export async function stopGeneration(project: Project): Promise<boolean> {
  const am = await getManager();
  return am.stopRoadmap(project.id);
}

export async function isRunning(project: Project): Promise<boolean> {
  const am = await getManager();
  return am.isRoadmapRunning(project.id);
}
