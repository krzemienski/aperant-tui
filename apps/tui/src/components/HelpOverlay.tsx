import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import { THEME_NAMES } from '../theme/themes';

// D-defect fix: every row here must map to a REAL useKeymap handler in the
// corresponding view (or App.tsx's global keymap) — verified against source
// as of this fix. `n` (new task), `m` (merge worktree), and `z` (zoom pane)
// had no handler anywhere and were removed; task logs is lowercase `l`
// (uppercase `L` is the board's move-column-right binding, already on the
// `H / L` row above). Keep this list in sync when bindings change.
const ROWS: Array<[string, string]> = [
  ['1-6', 'switch view'],
  ['j / k', 'move selection'],
  ['⏎', 'focus / open'],
  ['H / L', 'move task column (board)'],
  ['s / x', 'start / stop task'],
  ['l', 'task logs'],
  [':', 'command palette'],
  ['?', 'toggle help'],
  ['ctrl+c ×2', 'quit'],
  ['esc', 'close / back'],
];

export function HelpOverlay({ theme: c }: { theme: Theme }) {
  // NOTE: rendered as a full-area REPLACEMENT (App swaps it in for the view),
  // not an absolute overlay — Ink has no compositing/background fill, so an
  // absolute box lets the underlying view bleed through and is unreadable.
  return (
    <Box width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box flexDirection="column" borderStyle="single" borderColor={c.accent} paddingX={3} paddingY={1}>
        <Text color={c.accent} bold>KEYBINDINGS</Text>
        <Text> </Text>
        {ROWS.map(([k, d]) => (
          <Box key={k} gap={2}>
            <Box width={12}><Text color={c.accent2}>{k}</Text></Box>
            <Text color={c.dim}>{d}</Text>
          </Box>
        ))}
        <Text> </Text>
        <Text color={c.faint}>:theme {THEME_NAMES.join('│')}</Text>
      </Box>
    </Box>
  );
}
