/** LogsView — the selected task's REAL recorded log lines (full list, scrollable). */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { Task } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { useKeymap } from '../hooks/useKeymap';

export function LogsView({ theme: c, task, isActive, onBack }: { theme: Theme; task: Task | null; isActive: boolean; onBack: () => void }) {
  const [offset, setOffset] = useState(0);
  const lines = task?.logs ?? [];
  useKeymap({
    j: () => setOffset((o) => Math.min(o + 1, Math.max(0, lines.length - 10))),
    k: () => setOffset((o) => Math.max(o - 1, 0)),
    escape: onBack,
  }, { isActive });
  return (
    <Panel title={`TASK LOGS · ${task ? task.id.slice(0, 8) : 'none'} · ${lines.length} lines`} focused theme={c} flexGrow={1}>
      {lines.length === 0 ? (
        <Text color={c.faint}>no recorded log lines for this task</Text>
      ) : (
        lines.slice(offset, offset + 200).map((l, i) => (
          <Text key={offset + i} color={c.dim} wrap="truncate-end">{l}</Text>
        ))
      )}
    </Panel>
  );
}
