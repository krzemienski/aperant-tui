/**
 * WorktreeView — real `git worktree list` + real per-tree diffstat.
 * Merge/PR/discard actions arrive in Phase 5; listed keys that are not yet
 * bound are not shown (no dead hints).
 */
import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { execFileSync } from 'node:child_process';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { listWorktrees } from '../services/project-service';
import { useKeymap } from '../hooks/useKeymap';

function diffstat(repoPath: string, treePath: string): string {
  try {
    const out = execFileSync('git', ['-C', treePath, 'diff', '--shortstat', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return out || 'clean';
  } catch {
    return 'unreadable';
  }
}

export function WorktreeView({ theme: c, project, isActive }: { theme: Theme; project: Project; isActive: boolean }) {
  const trees = useMemo(() => listWorktrees(project.path), [project.path]);
  const [sel, setSel] = useState(0);
  const clamped = Math.min(sel, Math.max(0, trees.length - 1));
  useKeymap({
    j: () => setSel((s) => Math.min(s + 1, trees.length - 1)),
    k: () => setSel((s) => Math.max(s - 1, 0)),
  }, { isActive });
  const cur = trees[clamped];

  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="WORKTREES" focused theme={c} flexGrow={1}>
        {trees.length === 0 ? (
          <Text color={c.faint}>no worktrees (git worktree list is empty)</Text>
        ) : (
          trees.map((t, i) => {
            const on = i === clamped;
            return (
              <Box key={t.path} flexDirection="column">
                <Text backgroundColor={on ? c.panelAlt : undefined} wrap="truncate-end">
                  <Text color={on ? c.accent : c.faint}>{on ? '❯ ' : '  '}</Text>
                  <Text color={c.accent}>⑂ </Text>
                  <Text color={on ? c.text : c.dim}>{t.branch || `detached ${t.head.slice(0, 7)}`}</Text>
                </Text>
                <Text color={c.faint} wrap="truncate-end">    {t.path}</Text>
              </Box>
            );
          })
        )}
      </Panel>
      <Panel title={cur ? `STATUS · ${cur.branch || cur.head.slice(0, 7)}` : 'STATUS'} theme={c} flexGrow={1}>
        {cur ? (
          <Box flexDirection="column">
            <Text color={c.dim}>head <Text color={c.text}>{cur.head.slice(0, 10)}</Text></Text>
            <Text color={c.dim}>diff <Text color={c.text}>{diffstat(project.path, cur.path)}</Text></Text>
            <Text color={c.faint}>unified diff + merge arrive in Phase 5</Text>
          </Box>
        ) : (
          <Text color={c.faint}>nothing selected</Text>
        )}
      </Panel>
    </Box>
  );
}
