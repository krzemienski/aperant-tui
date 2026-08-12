import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import { THEME_NAMES } from '../theme/themes';

const ROWS: Array<[string, string]> = [
  ['1-6', 'switch view'],
  ['j / k', 'move selection'],
  ['⏎', 'focus / open'],
  ['H / L', 'move task column (board)'],
  ['s / x', 'start / stop task'],
  ['n', 'new task'],
  ['m', 'merge worktree'],
  ['L', 'task logs'],
  ['z', 'zoom terminal pane (raw passthrough)'],
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
