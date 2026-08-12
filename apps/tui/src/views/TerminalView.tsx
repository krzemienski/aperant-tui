/**
 * TerminalView — Phase 1: one real PTY pane (shell) via PtyPane.
 * Phase 3 adds 1/2/4-pane splits, focus cycling, and 'z' zoom passthrough.
 */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { PtyPane } from '../components/PtyPane';
import { useKeymap } from '../hooks/useKeymap';

interface Props {
  theme: Theme;
  project: Project;
  isActive: boolean;
}

export function TerminalView({ theme: c, project, isActive }: Props) {
  const [exited, setExited] = useState(false);
  const [epoch, setEpoch] = useState(0);
  useKeymap({ r: () => { setExited(false); setEpoch((e) => e + 1); } }, { isActive: isActive && exited });
  return (
    <Box flexDirection="column" gap={1} flexGrow={1}>
      <Panel title={exited ? '○ shell · exited' : '◉ shell · live PTY'} focused={isActive} theme={c} flexGrow={1}>
        {exited ? (
          <Box flexDirection="column">
            <Text color={c.faint}>shell exited.</Text>
            <Text color={c.dim}>press <Text color={c.accent}>r</Text> to respawn a real shell</Text>
          </Box>
        ) : (
          <PtyPane
            key={epoch}
            cwd={project.path}
            theme={c}
            focused={isActive}
            title="shell"
            onExit={() => setExited(true)}
          />
        )}
      </Panel>
    </Box>
  );
}
