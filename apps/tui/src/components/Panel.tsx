import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';

interface PanelProps {
  title?: string;
  focused?: boolean;
  theme: Theme;
  flexGrow?: number;
  flexBasis?: number | string;
  width?: number | string;
  height?: number | string;
  children?: React.ReactNode;
}

/** Bordered box with title row and focus ring — the TUI's core container. */
export function Panel({ title, focused = false, theme: c, flexGrow, flexBasis, width, height, children }: PanelProps) {
  // NOTE: the title renders in-flow as the first row. An earlier design used
  // position="absolute" + marginTop={-1} to inset the title into the border,
  // but overflow="hidden" on the border box clips it — titles never rendered.
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? c.borderFocus : c.border}
      flexGrow={flexGrow}
      flexBasis={flexBasis}
      width={width}
      height={height}
      overflow="hidden"
    >
      {title ? (
        <Box paddingX={1}>
          <Text color={focused ? c.borderFocus : c.dim} bold={focused}>
            {title}
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}
