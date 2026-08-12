import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import { VIEWS, type ViewName } from '../stores/app-store';

const TAB_LABELS: Record<ViewName, string> = {
  board: '1 board', term: '2 term', road: '3 road', chat: '4 chat', tree: '5 tree', set: '6 set', logs: 'L logs',
};

export function TabBar({ view, theme: c }: { view: ViewName; theme: Theme }) {
  return (
    <Box>
      {VIEWS.map((k) => {
        const on = view === k || (view === 'logs' && k === 'board');
        return (
          <Box key={k} paddingX={1}>
            <Text backgroundColor={on ? c.accent : undefined} color={on ? c.bg : c.dim} bold={on}>
              {` ${TAB_LABELS[k]} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
