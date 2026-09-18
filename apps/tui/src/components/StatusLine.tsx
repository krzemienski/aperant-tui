import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { ViewName } from '../stores/app-store';

// D-defect fix: every hint below must name a REAL useKeymap handler in the
// corresponding view — verified against source as of this fix. Rows for
// unbound keys (board `/`, term pane-cycling/zoom/kill, road `a`, chat
// send/history-search) were removed; `set` named the wrong provider for
// `a` (corrected to Anthropic, with `m` added for Moonshot); `logs`
// advertised arrow keys that LogsView never binds (corrected to j/k).
// Phase 5: `tree` now binds tab (focus list/diff), j/k (select/scroll),
// m (merge), p (create PR), R (AI-resolve conflicts) — `discard` is still
// unbound and intentionally absent.
// P6.2: `set` now binds tab (focus theme/accounts panel), j/k (theme
// cycle OR account cursor, depending on focus), ⏎ (persist theme OR
// activate the selected account — "activate" = move that account's id to
// the head of globalPriorityOrder in settings.json). Keep this list in
// sync when bindings change.
// F-13: `road` was missing two REAL bindings — RoadmapView.tsx binds `x`
// (stop a running generation) unconditionally and `j`/`k` (select phase)
// once a roadmap exists; only `g`/`G`/`c` were advertised. Added.
const HINTS: Record<ViewName, string> = {
  board: 'j/k move · ⏎ focus · s start · x stop · H/L column · l logs',
  term: 'r respawn shell',
  road: 'g generate (G force regen) · x stop · j/k phase · c convert→spec',
  chat: 'a ask · q qa mode · i ideate · x stop · 1-6 ideation type',
  tree: 'tab focus · j/k select/scroll · m merge · p PR · R AI-resolve',
  set: 'tab focus · j/k select · ⏎ persist theme / activate account · a add Anthropic · m add Moonshot',
  agents: '1-6 sub-view · j/k select · ⏎ inspect · f filter · r resume',
  logs: 'j/k scroll · esc back',
};

function StatusLineImpl({ view, theme: c, mode }: { view: ViewName; theme: Theme; mode?: string }) {
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

// See TitleBar.tsx for the P7.1 chrome-render investigation note this
// React.memo is part of — same conclusion: correct hygiene, not a fps fix.
export const StatusLine = React.memo(StatusLineImpl);
