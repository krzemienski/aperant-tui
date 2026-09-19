/**
 * Shared append path for `~/.aperant/logs/agent-events.jsonl`.
 *
 * Two independent writers target this file — the AgentManager event tap in
 * `agent-start-service.ts` and the console interceptor in `cli.tsx` — so the
 * rotation policy lives here rather than being duplicated (and drifting) in
 * both.
 *
 * Why rotation exists: the log is append-only and nothing ever pruned it. It
 * was measured at 146 MB / 617k lines on a working machine, which is what made
 * LogsView's former full-file read cost 526 ms and 335 MB per tick.
 *
 * Why AT APPEND and not at startup: a single long agent run is what produces
 * the growth, and such a run may never restart the process. Truncating at
 * startup would leave the unbounded case unfixed.
 */
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

/** Rotate past this size. One previous generation is kept as `<path>.1`. */
export const LOG_ROTATE_BYTES = 64 * 1024 * 1024;

/**
 * Re-`stat` only every N appends. Statting on every event would replace an
 * unbounded-disk bug with a per-event syscall on a hot path.
 */
export const ROTATE_CHECK_INTERVAL = 500;

let appendsSinceSizeCheck = ROTATE_CHECK_INTERVAL;

function rotateIfOversized(logPath: string): void {
  if (++appendsSinceSizeCheck < ROTATE_CHECK_INTERVAL) return;
  appendsSinceSizeCheck = 0;
  try {
    if (statSync(logPath).size < LOG_ROTATE_BYTES) return;
    // Replaces any previous generation; bounded at two files by construction.
    renameSync(logPath, `${logPath}.1`);
  } catch {
    /* absent file, or a racing writer rotated first — the append recreates it */
  }
}

/**
 * Append one already-serialized line, rotating first if the file has grown past
 * the threshold. Never throws: logging must not be able to crash the app.
 */
export function appendEventLine(logPath: string, line: string): void {
  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    rotateIfOversized(logPath);
    appendFileSync(logPath, line);
  } catch {
    /* logging must never crash the app */
  }
}
