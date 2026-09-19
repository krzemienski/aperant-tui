/** LogsView — the selected task's REAL recorded log lines (full list, scrollable). */
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import type { Task } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { useKeymap } from '../hooks/useKeymap';
import { getAgentEventLogPath } from '../services/agent-start-service';

type EventLogState = {
  lines: string[];
  malformedLines: number;
  path: string;
  status: 'missing' | 'empty' | 'ok' | 'unreadable';
  /** True when the file exceeded TAIL_BYTES and only its tail was scanned. */
  truncated: boolean;
};

/**
 * The flight recorder is append-only and unbounded — it was measured at 146 MB
 * (617k lines) on a working machine. Reading it whole on every 1s tick cost
 * 526 ms of blocking work per tick (140 ms read + 386 ms parse) and 335 MB of
 * heap: a >50% duty cycle on the single-threaded Ink render loop, degrading as
 * the log grows. Only the newest events are displayable anyway (the view keeps
 * a 200-line window), so read a bounded tail instead of the whole file.
 */
const TAIL_BYTES = 2 * 1024 * 1024;

/** Reads at most the final `TAIL_BYTES` of a file, without loading the rest. */
function readTail(logPath: string): { text: string; truncated: boolean } {
  const size = statSync(logPath).size;
  const start = size > TAIL_BYTES ? size - TAIL_BYTES : 0;
  const length = size - start;
  const buf = Buffer.allocUnsafe(length);
  const fd = openSync(logPath, 'r');
  try {
    readSync(fd, buf, 0, length, start);
  } finally {
    closeSync(fd);
  }
  let text = buf.toString('utf8');
  if (start > 0) {
    // The tail almost certainly begins mid-record; drop the partial first line
    // so it is not miscounted as malformed.
    const nl = text.indexOf('\n');
    text = nl === -1 ? '' : text.slice(nl + 1);
  }
  return { text, truncated: start > 0 };
}

function readTaskEventLog(taskId: string | null): EventLogState {
  const logPath = getAgentEventLogPath();
  if (!taskId) return { lines: [], malformedLines: 0, path: logPath, status: 'empty', truncated: false };

  let raw: string;
  let truncated: boolean;
  try {
    ({ text: raw, truncated } = readTail(logPath));
  } catch (err) {
    const status = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable';
    return { lines: [], malformedLines: 0, path: logPath, status, truncated: false };
  }

  let malformedLines = 0;
  const lines: string[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
        || typeof parsed.ts !== 'string' || typeof parsed.event !== 'string'
        || !Array.isArray(parsed.payload) || !('taskId' in parsed)) {
        malformedLines += 1;
        continue;
      }
      if (parsed.taskId !== taskId) continue;
      const summary = parsed.payload
        .map((value: unknown) => typeof value === 'string' ? value : JSON.stringify(value))
        .join(' ').replace(/\s+/g, ' ').trim();
      lines.push(`${parsed.ts} ${parsed.event}${summary ? ` ${summary.length > 240 ? `${summary.slice(0, 237)}...` : summary}` : ''}`);
    } catch {
      malformedLines += 1;
    }
  }

  return {
    lines,
    malformedLines,
    path: logPath,
    status: lines.length > 0 ? 'ok' : 'empty',
    truncated,
  };
}

export function LogsView({ theme: c, task, isActive, onBack }: { theme: Theme; task: Task | null; isActive: boolean; onBack: () => void }) {
  const [offset, setOffset] = useState(0);
  const taskId = task?.id ?? null;
  const [eventLog, setEventLog] = useState(() => readTaskEventLog(taskId));

  useEffect(() => {
    const refresh = () => setEventLog(readTaskEventLog(taskId));
    setOffset(0);
    refresh();
    const tick = setInterval(refresh, 1000);
    return () => clearInterval(tick);
  }, [taskId]);

  // Keep the historical task.logs source in the display if a producer ever populates it.
  const lines = task?.logs.length ? [...eventLog.lines, ...task.logs] : eventLog.lines;
  useKeymap({
    j: () => setOffset((o) => Math.min(o + 1, Math.max(0, lines.length - 10))),
    k: () => setOffset((o) => Math.max(o - 1, 0)),
    escape: onBack,
  }, { isActive });
  return (
    <Panel
      title={`TASK LOGS · ${task ? task.id.slice(0, 8) : 'none'} · ${lines.length} lines${eventLog.truncated ? ' · recent tail' : ''}`}
      focused
      theme={c}
      flexGrow={1}
    >
      {lines.length === 0 ? (
        <Box flexDirection="column">
          {!task ? (
            <Text color={c.faint}>no task selected</Text>
          ) : eventLog.status === 'missing' ? (
            <Text color={c.faint}>agent event log does not exist yet: {eventLog.path}</Text>
          ) : eventLog.status === 'unreadable' ? (
            <Text color={c.faint}>agent event log could not be read: {eventLog.path}</Text>
          ) : (
            <Text color={c.faint}>
              no recorded events for this task in the agent event log
              {eventLog.malformedLines > 0 ? ` (${eventLog.malformedLines} malformed line${eventLog.malformedLines === 1 ? '' : 's'} skipped)` : ''}
            </Text>
          )}
        </Box>
      ) : (
        <Box flexDirection="column">
          {eventLog.malformedLines > 0 && (
            <Text color={c.faint}>{eventLog.malformedLines} malformed event log line{eventLog.malformedLines === 1 ? '' : 's'} skipped</Text>
          )}
          {lines.slice(offset, offset + 200).map((l, i) => (
            <Text key={offset + i} color={c.dim} wrap="truncate-end">{l}</Text>
          ))}
        </Box>
      )}
    </Panel>
  );
}
