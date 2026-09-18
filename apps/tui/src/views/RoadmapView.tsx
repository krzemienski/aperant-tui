/**
 * RoadmapView — renders the project's REAL .auto-claude/roadmap/roadmap.json
 * and drives real generation through the vendored roadmap runner (Phase 4).
 *
 * Keys: `g` generate (or regenerate with refresh) · `x` stop ·
 * `j`/`k` select phase → DETAIL lists its features (status, priority,
 * linked spec) · `c` converts the selected feature to a task spec on disk
 * (roadmap-convert — same contract as the desktop handler); the board
 * picks the new spec up on its 2s refresh.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { ProgressBar } from '../components/ProgressBar';
import { useKeymap } from '../hooks/useKeymap';
import { useAppStore } from '../stores/app-store';
import * as roadmapSvc from '../services/roadmap-service';
import { convertFeatureToSpec } from '../services/roadmap-convert';

interface RoadmapFeature {
  id?: string; title?: string; name?: string; description?: string;
  status?: string; priority?: string; complexity?: string;
  phase_id?: string | number; linked_spec_id?: string;
}
interface RoadmapPhase { id?: string | number; name?: string; title?: string; status?: string; features?: RoadmapFeature[]; }
interface Roadmap { phases?: RoadmapPhase[]; features?: RoadmapFeature[]; }

export function loadRoadmap(project: Project): { roadmap: Roadmap | null; path: string; error: string | null } {
  const p = path.join(project.path, '.auto-claude', 'roadmap', 'roadmap.json');
  if (!fs.existsSync(p)) return { roadmap: null, path: p, error: null };
  try {
    return { roadmap: JSON.parse(fs.readFileSync(p, 'utf8')) as Roadmap, path: p, error: null };
  } catch (err) {
    return { roadmap: null, path: p, error: `malformed roadmap.json: ${(err as Error).message}` };
  }
}

interface Props {
  theme: Theme;
  project: Project;
  isActive: boolean;
}

const MAX_LOG_LINES = 8;

// F-07: agent-queue.ts emits `roadmap-log` once per raw AI-SDK text-delta
// chunk (agent-queue.ts:440-443 — one emit per part of result.fullStream),
// not once per logical line. The same channel also carries whole synthesized
// messages for phase-start/phase-complete/error (agent-queue.ts:423-424,
// 436-437, 445) as single complete strings. Treating every payload as its
// own display line rendered generation as one word per line. Chunks are now
// accumulated into a trailing "partial" line and split on '\n'; the three
// synthesized whole-message shapes are recognized and always flushed onto
// their own line first so a phase/error report can never be absorbed
// mid-word into a streaming partial.
const DISCRETE_LOG_RE = /^(Running .+ phase\.\.\.|Phase .+ (?:completed|failed)|Error: .*)$/;

interface LogBuf { lines: string[]; partial: string; }
const EMPTY_LOG_BUF: LogBuf = { lines: [], partial: '' };

function pushLogChunk(buf: LogBuf, raw: string): LogBuf {
  if (DISCRETE_LOG_RE.test(raw)) {
    const lines = buf.partial ? [...buf.lines, buf.partial, raw] : [...buf.lines, raw];
    return { lines: lines.slice(-(MAX_LOG_LINES - 1)), partial: '' };
  }
  let lines = buf.lines;
  let partial = buf.partial;
  // Normalize CRLF to LF; a bare CR overwrites the in-progress line instead
  // of starting a new one (terminal carriage-return semantics).
  for (const ch of raw.replace(/\r\n/g, '\n')) {
    if (ch === '\n') { lines = [...lines, partial]; partial = ''; }
    else if (ch === '\r') { partial = ''; }
    else { partial += ch; }
  }
  if (lines.length > MAX_LOG_LINES - 1) lines = lines.slice(-(MAX_LOG_LINES - 1));
  return { lines, partial };
}

export function RoadmapView({ theme: c, project, isActive }: Props) {
  const flash = useAppStore((s) => s.flash);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<roadmapSvc.RoadmapProgress | null>(null);
  const [logBuf, setLogBuf] = useState<LogBuf>(EMPTY_LOG_BUF);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { roadmap, path: rp, error } = useMemo(
    () => loadRoadmap(project), [project.path, reloadKey]);

  // All features keyed by phase for the detail pane; roadmap.features is the
  // authoritative list (phase_id links), fallback: phase.features.
  const phases = useMemo(() => {
    if (!roadmap?.phases?.length) return [];
    for (const ph of roadmap.phases) {
      const id = ph.id ?? ph.name ?? '';
      ph.features = roadmap.features?.filter((f) => String(f.phase_id ?? '') === String(id))
        ?? ph.features ?? [];
    }
    return roadmap.phases;
  }, [roadmap]);
  const selPhase = phases[Math.min(selected, Math.max(phases.length - 1, 0))];

  // Poll roadmap.json while a run is active so the phase list lands live.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setReloadKey((k) => k + 1), 2000);
    return () => clearInterval(id);
  }, [running]);

  // Subscribe to the real manager events for this project.
  useEffect(() => {
    let off: (() => void) | null = null;
    let alive = true;
    roadmapSvc.subscribeRoadmap(project.id, (kind, payload) => {
      if (kind === 'progress') {
        const p = payload as roadmapSvc.RoadmapProgress;
        setProgress(p);
        setRunning(p.phase !== 'complete' && p.phase !== 'error');
        if (p.phase === 'complete') { setReloadKey((k) => k + 1); flash('roadmap generated'); }
      } else if (kind === 'log') {
        setLogBuf((buf) => pushLogChunk(buf, String(payload)));
      } else if (kind === 'error') {
        setErrorMsg(String(payload));
        setRunning(false);
      } else if (kind === 'complete') {
        setRunning(false);
        setReloadKey((k) => k + 1);
      }
    }).then((unsub) => { if (alive) off = unsub; else unsub(); });
    return () => { alive = false; off?.(); };
  }, [project.id]);

  const generate = useCallback((refresh: boolean) => {
    setLogBuf(EMPTY_LOG_BUF); setErrorMsg(null); setRunning(true);
    setProgress({ phase: 'starting', progress: 5, message: 'Starting roadmap generation…' });
    // D15: default to a SHORTHAND, not a full router id. Full ids reach the
    // queue verbatim, so a dead upstream route leaves no way to redirect;
    // 'sonnet' resolves via resolveModelId, which honours
    // ANTHROPIC_DEFAULT_SONNET_MODEL (ai/config/phase-config.ts:80).
    roadmapSvc.startGeneration(project, { refresh, model: process.env.APERANT_MODEL ?? 'sonnet' }).catch((e) => {
      setRunning(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    });
  }, [project]);

  useKeymap({
    g: () => generate(false),
    G: () => generate(true),
    x: () => { roadmapSvc.stopGeneration(project); setRunning(false); },
    j: () => setSelected((s) => Math.min(s + 1, phases.length - 1)),
    k: () => setSelected((s) => Math.max(s - 1, 0)),
    c: () => {
      const feats = selPhase?.features ?? [];
      const first = feats.find((f) => !f.linked_spec_id) ?? feats[0];
      if (!first?.id) { flash('no feature to convert'); return; }
      const r = convertFeatureToSpec(project, first.id);
      if (r.ok) { flash(`spec ${r.specId} created`); setReloadKey((k) => k + 1); }
      else flash(r.reason);
    },
  }, { isActive });

  const status = running
    ? `RUNNING · ${progress?.phase ?? ''} ${progress?.progress ?? 0}% — ${progress?.message ?? ''}`
    : errorMsg ? `ERROR: ${errorMsg}` : 'idle';

  const logDisplay = logBuf.partial ? [...logBuf.lines, logBuf.partial] : logBuf.lines;

  return (
    <Box flexDirection="column" flexGrow={1} gap={0}>
      {(running || errorMsg || logDisplay.length > 0) && (
        <Panel title="GENERATION" theme={c} focused={isActive && running}>
          <Text color={running ? c.accent : errorMsg ? c.err : c.ok}>{status}</Text>
          {running && progress ? (
            <Box marginLeft={1} gap={1}>
              <ProgressBar pct={progress.progress} width={24} theme={c} />
              <Text color={c.dim}>{progress.phase}</Text>
            </Box>
          ) : null}
          {logDisplay.length > 0 && (
            <Box flexDirection="column" marginTop={0}>
              {logDisplay.map((l, i) => (
                <Text key={i} color={i === logDisplay.length - 1 ? c.dim : c.faint} wrap="truncate-end">
                  {l.length > 100 ? l.slice(0, 100) : l}
                </Text>
              ))}
            </Box>
          )}
        </Panel>
      )}
      <Box gap={0} flexGrow={1}>
        <Panel title="PHASES" focused={isActive && !running} theme={c} flexGrow={1}>
          {error ? (
            <Text color={c.err}>{error} ({rp})</Text>
          ) : !phases.length ? (
            <Box flexDirection="column" paddingY={1}>
              <Text color={c.faint}>no roadmap at {rp}</Text>
              <Text color={c.dim}>press <Text color={c.accent}>g</Text> to generate from real codebase analysis</Text>
            </Box>
          ) : (
            phases.map((ph, i) => {
              const feats = ph.features ?? [];
              const done = feats.filter((f) => f.status === 'done' || f.status === 'completed').length;
              const pct = feats.length ? (done / feats.length) * 100 : ph.status === 'done' ? 100 : 0;
              const st = ph.status ?? (pct === 100 ? 'done' : pct > 0 ? 'active' : 'plan');
              const col = st === 'done' ? c.ok : st === 'active' ? c.accent : c.faint;
              const cursor = i === selected ? '❯ ' : '  ';
              return (
                <Box key={i} flexDirection="column" marginBottom={1}>
                  <Text color={i === selected ? c.text : col}>{cursor}{st === 'done' ? '●' : st === 'active' ? '◉' : '○'} <Text color={c.dim}>PHASE {ph.id ?? i + 1}</Text> <Text color={i === selected ? c.accent : c.text}>{ph.name ?? ph.title ?? 'unnamed'}</Text></Text>
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
          {selPhase?.features?.length ? (
            <Box flexDirection="column">
              <Text color={c.text} bold>{selPhase.name ?? selPhase.title}</Text>
              {selPhase.features.map((f, i) => (
                <Box key={f.id ?? i} flexDirection="column">
                  <Text color={c.dim} wrap="truncate-end">
                    {' '}{f.linked_spec_id ? '⇒' : '·'} {f.title ?? f.id} <Text color={c.faint}>[{f.status ?? 'planned'}{f.priority ? ` · ${f.priority}` : ''}]</Text>
                  </Text>
                  {f.linked_spec_id ? (
                    <Text color={c.ok}>   spec {f.linked_spec_id}</Text>
                  ) : (
                    <Text color={c.faint}>   c → convert to task spec</Text>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Text color={c.faint}>{phases.length ? 'phase has no features yet' : 'generate a roadmap first (g)'}</Text>
          )}
        </Panel>
      </Box>
      <Box paddingLeft={1}>
        <Text color={c.faint}>
          {running ? 'generating… x stop' : 'g generate · G refresh · j/k phase · c convert→spec'}
        </Text>
      </Box>
    </Box>
  );
}
