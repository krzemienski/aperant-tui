/**
 * RoadmapView — renders the project's REAL .auto-claude/roadmap/roadmap.json.
 * Generation ('g') arrives in Phase 4 via ai/runners/roadmap; until then the
 * view honestly reports absence instead of fabricating phases.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { ProgressBar } from '../components/ProgressBar';

interface RoadmapFeature { title?: string; name?: string; status?: string; }
interface RoadmapPhase { id?: string | number; name?: string; title?: string; status?: string; features?: RoadmapFeature[]; }
interface Roadmap { phases?: RoadmapPhase[]; }

export function loadRoadmap(project: Project): { roadmap: Roadmap | null; path: string; error: string | null } {
  const p = path.join(project.path, '.auto-claude', 'roadmap', 'roadmap.json');
  if (!fs.existsSync(p)) return { roadmap: null, path: p, error: null };
  try {
    return { roadmap: JSON.parse(fs.readFileSync(p, 'utf8')) as Roadmap, path: p, error: null };
  } catch (err) {
    return { roadmap: null, path: p, error: `malformed roadmap.json: ${(err as Error).message}` };
  }
}

export function RoadmapView({ theme: c, project }: { theme: Theme; project: Project }) {
  const { roadmap, path: p, error } = useMemo(() => loadRoadmap(project), [project.path]);
  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="PHASES" focused theme={c} flexGrow={1}>
        {error ? (
          <Text color={c.err}>{error} ({p})</Text>
        ) : !roadmap?.phases?.length ? (
          <Box flexDirection="column" paddingY={1}>
            <Text color={c.faint}>no roadmap at {p}</Text>
            <Text color={c.faint}>roadmap generation streams from ai/runners/roadmap — Phase 4 gate</Text>
          </Box>
        ) : (
          roadmap.phases.map((ph, i) => {
            const feats = ph.features ?? [];
            const done = feats.filter((f) => f.status === 'done' || f.status === 'completed').length;
            const pct = feats.length ? (done / feats.length) * 100 : ph.status === 'done' ? 100 : 0;
            const st = ph.status ?? (pct === 100 ? 'done' : pct > 0 ? 'active' : 'plan');
            const col = st === 'done' ? c.ok : st === 'active' ? c.accent : c.faint;
            return (
              <Box key={i} flexDirection="column" marginBottom={1}>
                <Text color={col}>{st === 'done' ? '●' : st === 'active' ? '◉' : '○'} <Text color={c.dim}>PHASE {ph.id ?? i + 1}</Text> <Text color={st === 'plan' ? c.dim : c.text}>{ph.name ?? ph.title ?? 'unnamed'}</Text></Text>
                <Box marginLeft={2} gap={1}>
                  <ProgressBar pct={pct} width={18} theme={c} />
                  <Text color={c.dim}>{done}/{feats.length} features</Text>
                </Box>
              </Box>
            );
          })
        )}
      </Panel>
      <Panel title="DETAIL" theme={c} flexGrow={1}>
        <Text color={c.faint}>select a phase (Phase 4 wires feature detail + convert→spec)</Text>
      </Panel>
    </Box>
  );
}
