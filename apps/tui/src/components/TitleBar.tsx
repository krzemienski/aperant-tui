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

function TitleBarImpl({ theme: c, projectName, projectPath, branch, counts, profile }: Props) {
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

// P7.1 chrome-render investigation (evidence/phase-7/perf/P7.1-RECHECK2-VERDICT.md):
// direct temporary render-probe instrumentation (since removed) showed TitleBar
// never re-rendered during a sustained BoardView scroll burst in the first place —
// App's Zustand selectors are already narrow, and `sel` lives entirely inside
// BoardView's own state. React.memo
// is added anyway as a real, correct hygiene improvement (skip diffing this subtree
// if App re-renders for an unrelated reason, e.g. the counts/profile
// polling refresh), but it measurably does NOT change the scroll-throughput
// number — the actual bottleneck is in node_modules/ink's own input-parsing and
// render-throttle internals, not this component.
export const TitleBar = React.memo(TitleBarImpl);
