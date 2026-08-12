import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { TaskCounts } from '../services/task-service';

interface Props {
  theme: Theme;
  projectName: string;
  projectPath: string;
  branch: string;
  counts: TaskCounts;
  profile: string;
}

export function TitleBar({ theme: c, projectName, projectPath, branch, counts, profile }: Props) {
  return (
    <Box justifyContent="space-between">
      <Box gap={1}>
        <Text color={c.accent} bold>APERANT</Text>
        <Text color={c.faint}>│</Text>
        <Text color={c.dim}>{projectName}</Text>
        <Text color={c.faint}>{projectPath}</Text>
        <Text color={c.faint}>│</Text>
        <Text color={c.info}>⑂ {branch}</Text>
      </Box>
      <Box gap={2}>
        <Text color={c.dim}><Text color={c.accent}>◉</Text> {counts.running} running</Text>
        <Text color={c.dim}><Text color={c.warn}>◆</Text> {counts.review} review</Text>
        <Text color={c.dim}><Text color={c.ok}>●</Text> {profile}</Text>
      </Box>
    </Box>
  );
}
