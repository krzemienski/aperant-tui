import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';

export function Toast({ msg, theme: c }: { msg: string; theme: Theme }) {
  return (
    <Box position="absolute" marginTop={-2} alignSelf="flex-end" borderStyle="single" borderColor={c.accent} paddingX={1}>
      <Text color={c.accent}>{msg}</Text>
    </Box>
  );
}
