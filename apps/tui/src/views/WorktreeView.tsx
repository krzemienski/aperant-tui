/**
 * WorktreeView — Phase 5: real `git worktree list`, a real unified diff
 * pane, real merge into the project's current branch, real `gh pr create`,
 * and AI conflict resolution over real conflict markers.
 *
 * Focus model: `tab` toggles focus between the WORKTREES list and the DIFF
 * pane. j/k always move the selection in whichever pane is focused — the
 * list selects a worktree, the diff pane scrolls. The footer names exactly
 * this (no dead hints — see the D-defect history in StatusLine.tsx).
 *
 * Merge/PR/resolve are gated on `isActive` (this view being on screen) —
 * they only ever fire from an explicit keypress, never on mount or on
 * selection change.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { execFileSync } from 'node:child_process';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { listWorktrees, type WorktreeInfo } from '../services/project-service';
import { useKeymap } from '../hooks/useKeymap';
import { useAppStore } from '../stores/app-store';
import {
  getWorktreeDiff,
  getConflictedFiles,
  mergeWorktreeBranch,
  createWorktreePR,
  resolveConflictsWithAI,
} from '../services/worktree-actions';

function diffstat(treePath: string): string {
  try {
    const out = execFileSync('git', ['-C', treePath, 'diff', '--shortstat', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return out || 'clean';
  } catch {
    return 'unreadable';
  }
}

const MAX_DIFF_LINES = 400;
const DIFF_PAGE = 10;

type Focus = 'list' | 'diff';
type Busy = null | 'merge' | 'pr' | 'resolve';

const FLASH_MAX = 90;

/** Flash truncates long git/gh error output to keep the toast readable; used at 3 call sites (merge, PR, resolve). */
function flashTruncated(flash: (msg: string) => void, message: string): void {
  flash(message.length > FLASH_MAX ? `${message.slice(0, FLASH_MAX - 3)}...` : message);
}

export function WorktreeView({ theme: c, project, isActive }: { theme: Theme; project: Project; isActive: boolean }) {
  const [reloadKey, setReloadKey] = useState(0);
  const trees = useMemo(() => listWorktrees(project.path), [project.path, reloadKey]);
  const [sel, setSel] = useState(0);
  const clamped = Math.min(sel, Math.max(0, trees.length - 1));
  const [focus, setFocus] = useState<Focus>('list');
  const [diffScroll, setDiffScroll] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);
  const flash = useAppStore((s) => s.flash);

  const cur: WorktreeInfo | undefined = trees[clamped];

  const diff = useMemo(() => (cur ? getWorktreeDiff(cur.path) : null), [cur?.path, reloadKey]);
  const diffLines = useMemo(() => (diff && !diff.error ? diff.text.split('\n').slice(0, MAX_DIFF_LINES) : []), [diff]);
  const conflicted = useMemo(() => getConflictedFiles(project.path), [project.path, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const doMerge = useCallback(() => {
    if (!cur || busy) return;
    setBusy('merge');
    const outcome = mergeWorktreeBranch(project.path, cur.branch);
    setBusy(null);
    flashTruncated(flash, outcome.message);
    refresh();
  }, [cur, busy, project.path, flash, refresh]);

  const doPR = useCallback(() => {
    if (!cur || busy) return;
    setBusy('pr');
    createWorktreePR(project.path, cur.path, cur.branch).then((outcome) => {
      setBusy(null);
      flashTruncated(flash, outcome.message);
    }).catch((err: unknown) => {
      setBusy(null);
      flash(`PR creation failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [cur, busy, project.path, flash]);

  const doResolve = useCallback(() => {
    if (busy) return;
    setBusy('resolve');
    resolveConflictsWithAI(project.path).then((outcome) => {
      setBusy(null);
      flashTruncated(flash, outcome.message);
      refresh();
    }).catch((err: unknown) => {
      setBusy(null);
      flash(`AI conflict resolution failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [busy, project.path, flash, refresh]);

  useKeymap({
    tab: () => setFocus((f) => (f === 'list' ? 'diff' : 'list')),
    j: () => {
      if (focus === 'diff') setDiffScroll((s) => Math.min(s + 1, Math.max(0, diffLines.length - 1)));
      else { setSel((s) => Math.min(s + 1, trees.length - 1)); setDiffScroll(0); }
    },
    k: () => {
      if (focus === 'diff') setDiffScroll((s) => Math.max(s - 1, 0));
      else { setSel((s) => Math.max(s - 1, 0)); setDiffScroll(0); }
    },
    pagedown: () => { if (focus === 'diff') setDiffScroll((s) => Math.min(s + DIFF_PAGE, Math.max(0, diffLines.length - 1))); },
    pageup: () => { if (focus === 'diff') setDiffScroll((s) => Math.max(s - DIFF_PAGE, 0)); },
    m: doMerge,
    p: doPR,
    R: doResolve,
  }, { isActive });

  const visibleDiff = diffLines.slice(diffScroll, diffScroll + 20);

  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="WORKTREES" focused={focus === 'list'} theme={c} flexGrow={1}>
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
      <Panel
        title={cur ? `DIFF · ${cur.branch || cur.head.slice(0, 7)}${busy ? ` · ${busy}...` : ''}` : 'DIFF'}
        focused={focus === 'diff'}
        theme={c}
        flexGrow={2}
      >
        {cur ? (
          <Box flexDirection="column">
            <Text color={c.dim}>head <Text color={c.text}>{cur.head.slice(0, 10)}</Text>  diff <Text color={c.text}>{diffstat(cur.path)}</Text></Text>
            {conflicted.length > 0 ? (
              <Text color={c.err}>conflict: {conflicted.join(', ')} — press R to ask AI to resolve</Text>
            ) : null}
            {diff?.error ? (
              <Text color={c.err}>git diff failed: {diff.error}</Text>
            ) : (
              <Box flexDirection="column" marginTop={1}>
                {visibleDiff.map((line, i) => {
                  let color = c.text;
                  if (line.startsWith('+') && !line.startsWith('+++')) color = c.ok;
                  else if (line.startsWith('-') && !line.startsWith('---')) color = c.err;
                  else if (line.startsWith('@@')) color = c.accent;
                  else if (line.startsWith('diff ') || line.startsWith('index ')) color = c.faint;
                  return (
                    <Text key={diffScroll + i} color={color} wrap="truncate-end">{line || ' '}</Text>
                  );
                })}
                {diffLines.length > visibleDiff.length + diffScroll ? (
                  <Text color={c.faint}>… {diffLines.length - diffScroll - visibleDiff.length} more line(s), j/k to scroll</Text>
                ) : null}
              </Box>
            )}
          </Box>
        ) : (
          <Text color={c.faint}>nothing selected</Text>
        )}
      </Panel>
    </Box>
  );
}
