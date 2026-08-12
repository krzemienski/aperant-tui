/**
 * InsightsView — Phase 1: real project-index stats from .auto-claude/project_index.json.
 * Streaming Q&A arrives in Phase 4 via ai/runners/insights.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';

interface ProjectIndex { files?: unknown[]; [k: string]: unknown; }

export function loadProjectIndex(project: Project): { index: ProjectIndex | null; path: string; error: string | null } {
  const p = path.join(project.path, '.auto-claude', 'project_index.json');
  if (!fs.existsSync(p)) return { index: null, path: p, error: null };
  try {
    return { index: JSON.parse(fs.readFileSync(p, 'utf8')) as ProjectIndex, path: p, error: null };
  } catch (err) {
    return { index: null, path: p, error: `malformed project_index.json: ${(err as Error).message}` };
  }
}

export function InsightsView({ theme: c, project }: { theme: Theme; project: Project }) {
  const { index, path: p, error } = useMemo(() => loadProjectIndex(project), [project.path]);
  return (
    <Panel title="INSIGHTS · codebase Q&A" focused theme={c} flexGrow={1}>
      <Box flexDirection="column" paddingY={1}>
        {error ? (
          <Text color={c.err}>{error} ({p})</Text>
        ) : !index ? (
          <>
            <Text color={c.faint}>no project index at {p}</Text>
            <Text color={c.faint}>index builds during onboarding; Q&A streaming arrives in Phase 4</Text>
          </>
        ) : (
          <>
            <Text color={c.dim}>index <Text color={c.info}>{p}</Text></Text>
            <Text color={c.dim}>entries <Text color={c.text}>{Array.isArray(index.files) ? index.files.length : Object.keys(index).length}</Text></Text>
            <Text color={c.faint}>Q&A streaming arrives in Phase 4</Text>
          </>
        )}
      </Box>
    </Panel>
  );
}
