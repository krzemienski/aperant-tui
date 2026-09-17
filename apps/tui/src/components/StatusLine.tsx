import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { ViewName } from '../stores/app-store';

// D-defect fix: every hint below must name a REAL useKeymap handler in the
// corresponding view — verified against source as of this fix. Rows for
// unbound keys (board `/`, term pane-cycling/zoom/kill, road `a`, chat
// send/history-search, tree diff/merge/PR/discard) were removed; `set`
// named the wrong provider for `a` (corrected to Anthropic, with `m` added
// for Moonshot); `logs` advertised arrow keys that LogsView never binds
// (corrected to j/k). Keep this list in sync when bindings change.
const HINTS: Record<ViewName, string> = {
  board: 'j/k move · ⏎ focus · s start · x stop · H/L column · l logs',
  term: 'r respawn shell',
  road: 'g generate · c convert→spec',
  chat: 'a ask · q qa mode · i ideate · x stop · 1-6 ideation type',
  tree: 'j/k select',
  set: 'j/k select theme · ⏎ apply · a Anthropic acct · m Moonshot acct',
  agents: '1-6 sub-view · j/k select · ⏎ inspect · f filter · r resume',
  logs: 'j/k scroll · esc back',
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
