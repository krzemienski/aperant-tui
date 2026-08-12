import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { ViewName } from '../stores/app-store';

const HINTS: Record<ViewName, string> = {
  board: 'j/k move · ⏎ focus · s start · x stop · H/L column · l logs · / filter',
  term: '⇥ cycle panes · z zoom · x kill pane',
  road: 'g generate · c convert→spec · a add feature',
  chat: '⏎ send · / history search',
  tree: 'd diff · m merge · p PR · D discard',
  set: 'j/k select theme · ⏎ apply · a add Moonshot acct',
  logs: '↑↓ scroll · esc back',
};

export function StatusLine({ view, theme: c, mode }: { view: ViewName; theme: Theme; mode?: string }) {
  return (
    <Box justifyContent="space-between">
      <Box gap={1}>
        <Text backgroundColor={c.accent} color={c.bg} bold>{` ${(mode ?? view).toUpperCase()} `}</Text>
        <Text color={c.dim}>{HINTS[view]}</Text>
      </Box>
      <Text color={c.faint}>
        <Text color={c.accent}>:</Text> cmd  <Text color={c.accent}>?</Text> help
      </Text>
    </Box>
  );
}
