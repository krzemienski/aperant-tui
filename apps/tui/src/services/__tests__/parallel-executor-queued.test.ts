/**
 * REAL behavioral proof for the [APERANT-PATCH observability-tap]
 * onSubtaskQueued callback in the vendored parallel-executor (spec §7.2).
 *
 * No mocks of the executor itself: the test drives the real executeParallel()
 * with 6 real subtasks at maxConcurrency 3 and a real async runner (real
 * timers, real Promise.allSettled batching). It asserts the exact queue
 * announcements: batch 0 starts immediately (never "queued"), batches 1+
 * announce each subtask with its real batch index and position.
 */
import { describe, it, expect } from 'vitest';
import { executeParallel } from '@main/ai/orchestration/parallel-executor';
import type { SubtaskInfo } from '@main/ai/orchestration/build-orchestrator';
import type { SessionResult } from '@main/ai/session/types';

function fakeSubtask(id: string): SubtaskInfo {
  return { id, description: `subtask ${id}`, status: 'pending' };
}

function fakeResult(subtaskId: string, durationMs: number): SessionResult {
  return {
    outcome: 'completed',
    stepsExecuted: 1,
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    messages: [],
    durationMs,
    toolCallCount: 0,
  } as SessionResult;
}

describe('parallel-executor onSubtaskQueued (observability tap)', () => {
  it('announces exactly the subtasks that sit in later batches', async () => {
    const queued: Array<{ id: string; batchIndex: number; position: number }> = [];
    const started: string[] = [];
    const completed: string[] = [];

    const subtasks = ['s1', 's2', 's3', 's4', 's5', 's6'].map(fakeSubtask);

    const result = await executeParallel(subtasks, async (st) => {
      started.push(st.id);
      await new Promise((r) => setTimeout(r, 25)); // real async work
      completed.push(st.id);
      return fakeResult(st.id, 25);
    }, {
      maxConcurrency: 3,
      onSubtaskQueued: (st, batchIndex, position) => {
        queued.push({ id: st.id, batchIndex, position });
      },
    });

    // all six really ran
    expect(result.successCount).toBe(6);
    expect(started.sort()).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
    // exactly the second batch (s4..s6) was announced as queued, in position order
    expect(queued).toEqual([
      { id: 's4', batchIndex: 1, position: 0 },
      { id: 's5', batchIndex: 1, position: 1 },
      { id: 's6', batchIndex: 1, position: 2 },
    ]);
  });

  it('announces nothing when every subtask fits the first batch', async () => {
    const queued: string[] = [];
    const subtasks = ['a', 'b'].map(fakeSubtask);
    const result = await executeParallel(subtasks, async (st) => fakeResult(st.id, 1), {
      maxConcurrency: 3,
      onSubtaskQueued: (st) => queued.push(st.id),
    });
    expect(result.successCount).toBe(2);
    expect(queued).toEqual([]);
  });

  it('still announces queued subtasks when an early batch fails (allSettled semantics)', async () => {
    const queued: string[] = [];
    const subtasks = ['x1', 'x2', 'x3', 'x4'].map(fakeSubtask);
    const result = await executeParallel(subtasks, async (st) => {
      if (st.id === 'x1') throw new Error('real failure');
      return fakeResult(st.id, 5);
    }, {
      maxConcurrency: 3,
      onSubtaskQueued: (st) => queued.push(st.id),
    });
    expect(result.failureCount).toBe(1);
    expect(result.successCount).toBe(3);
    expect(queued).toEqual(['x4']);
  });
});
