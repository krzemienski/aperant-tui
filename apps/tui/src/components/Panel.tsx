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

/** Bordered box with inset title and focus ring — the TUI's core container. */
export function Panel({ title, focused = false, theme: c, flexGrow, flexBasis, width, height, children }: PanelProps) {
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
        <Box marginTop={-1} marginLeft={1} position="absolute">
          <Text backgroundColor={c.bg} color={focused ? c.borderFocus : c.dim} bold={focused}>
            {` ${title} `}
          </Text>
        </Box>
      ) : null}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}
