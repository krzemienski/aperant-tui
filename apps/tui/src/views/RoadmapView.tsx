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

/**
 * Hard height for the GENERATION panel: 2 border rows + title + status +
 * progress bar + MAX_LOG_LINES. Without a fixed height the panel grows with
 * the streamed log and the whole view can exceed the terminal's row count —
 * at which point Ink stops doing incremental repaints and issues a full
 * clearTerminal on EVERY frame (node_modules/ink/build/ink.js: `if
 * (outputHeight >= stdout.rows)`). Measured 2026-09-28 in a real 200x50 tmux
 * PTY during a live roadmap run: the pane filled with 34 stacked, never-cleared
 * frame repaints and the TUI became unreadable and unwaitable
 * (logs/frame-overflow-scrollback-ap6.txt). Bounding the one panel that grows
 * keeps the view inside the frame; Panel already clips with overflow="hidden".
 */
const GENERATION_PANEL_HEIGHT = MAX_LOG_LINES + 5;

/**
 * How many features the DETAIL pane draws at once. The pane used to render
 * EVERY feature in the selected phase (2 rows each), so a phase with ~14+
 * features pushed the frame past a 50-row terminal. Clipping alone is not
 * enough: each feature is a 2-row Box, and a clip that lands mid-Box
 * interleaves the title row of one feature with the hint row of another
 * ("n/p to selecte feature 2 …" — measured 2026-09-28 against a 30-feature
 * phase). Drawing a bounded window whose rows always fit keeps every Box
 * whole and makes long phases navigable with n/p instead of invisible.
 */
const MAX_DETAIL_FEATURES = 12;

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

/**
 * The generation panel's state used to live ONLY in this component's
 * useState. App.tsx mounts views conditionally (`view === 'road' &&
 * <RoadmapView …>`), so switching to any other tab UNMOUNTS this view and
 * throws that state away: coming back mid-run showed an idle roadmap with no
 * GENERATION panel while the runner was still streaming — and, because the
 * panel only renders when running/errorMsg/logs are set, a matched wait on
 * `RUNNING · ` could never re-arm after a tab switch.
 *
 * The runner already persists the authoritative run state to
 * `<project>/.auto-claude/roadmap/generation_progress.json` (agent-queue.ts
 * persistRoadmapProgress) and DELETES that file when the run ends
 * (clearRoadmapProgress). Reading it at mount rehydrates the real state —
 * no synthesis: when the file is absent, the view is correctly idle.
 *
 * CAUTION (measured 2026-09-28): the file is NOT a liveness oracle. If the
 * process hosting the run dies, clearRoadmapProgress never runs and the file
 * is left behind — a later launch would then show a permanent phantom
 * `RUNNING ·` panel for a run that no longer exists. So disk supplies
 * phase/progress/message ONLY; liveness is confirmed against the manager
 * itself via roadmapSvc.isRunning() (agent-queue's own
 * isRoadmapRunning), and a stale file resolves to idle.
 */
export function readGenerationProgress(project: Project): roadmapSvc.RoadmapProgress | null {
  const p = path.join(project.path, '.auto-claude', 'roadmap', 'generation_progress.json');
  try {
    const d = JSON.parse(fs.readFileSync(p, 'utf8')) as {
      phase?: string; progress?: number; message?: string; is_running?: boolean;
    };
    if (!d || d.is_running !== true) return null;
    return {
      phase: String(d.phase ?? 'roadmap'),
      progress: typeof d.progress === 'number' ? d.progress : 0,
      message: String(d.message ?? ''),
    };
  } catch {
    // absent (run finished/never started) or unreadable → idle
    return null;
  }
}

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
  // Feature cursor within the selected phase. `selected` walks phases; this
  // walks the features inside one, so `c` converts the item the user is
  // looking at. Without it the user could only ever convert a phase's first
  // unlinked feature, making every later item unreachable.
  const [selFeat, setSelFeat] = useState(0);
  // Rehydrate from the runner's on-disk progress file so a tab switch (which
  // unmounts this view) cannot lose a live run. `running` starts false and is
  // promoted only once the manager confirms the run is actually alive.
  const [progress, setProgress] = useState<roadmapSvc.RoadmapProgress | null>(
    () => readGenerationProgress(project));
  const [running, setRunning] = useState(false);
  const [logBuf, setLogBuf] = useState<LogBuf>(EMPTY_LOG_BUF);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirm liveness with the manager on mount: a progress file alone can be
  // an orphan left by a killed process.
  useEffect(() => {
    let alive = true;
    if (!readGenerationProgress(project)) return;
    roadmapSvc.isRunning(project).then(
      (live) => {
        if (!alive) return;
        setRunning(live);
        if (!live) setProgress(null); // stale file → idle, not a phantom run
      },
      () => { /* manager unavailable → stay idle rather than claim a live run */ },
    );
    return () => { alive = false; };
  }, [project]);

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
  const phaseFeats = selPhase?.features ?? [];
  // Clamp rather than reset: a roadmap reload (poll during generation) must not
  // silently move the cursor out from under the user.
  const featIndex = Math.min(selFeat, Math.max(phaseFeats.length - 1, 0));
  const selFeature = phaseFeats[featIndex];

  // Window the DETAIL list around the cursor so it never exceeds the frame.
  const detailStart = Math.max(0, Math.min(
    featIndex - Math.floor(MAX_DETAIL_FEATURES / 2),
    phaseFeats.length - MAX_DETAIL_FEATURES,
  ));
  const detailFeats = phaseFeats.slice(detailStart, detailStart + MAX_DETAIL_FEATURES);

  // Poll roadmap.json while a run is active so the phase list lands live.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setReloadKey((k) => k + 1);
      // Re-read the runner's progress file too: after a remount the in-flight
      // `roadmap-progress` emissions that would otherwise drive this panel may
      // already have fired, and the terminal 'complete' event clears the file
      // rather than emitting to a view that did not exist at the time.
      const disk = readGenerationProgress(project);
      if (disk) setProgress(disk);
      else setRunning(false);
    }, 2000);
    return () => clearInterval(id);
  }, [running, project]);

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
    }).then(
      (unsub) => { if (alive) off = unsub; else unsub(); },
      // Without this the manager import/attach rejecting left the view with no
      // subscription AND no error: roadmap events silently never arrived and
      // the panel sat at its last state forever.
      (err: unknown) => {
        if (!alive) return;
        setErrorMsg(`roadmap events unavailable: ${err instanceof Error ? err.message : String(err)}`);
        setRunning(false);
      },
    );
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
    j: () => { setSelected((s) => Math.min(s + 1, phases.length - 1)); setSelFeat(0); },
    k: () => { setSelected((s) => Math.max(s - 1, 0)); setSelFeat(0); },
    n: () => setSelFeat((f) => Math.min(f + 1, Math.max(phaseFeats.length - 1, 0))),
    p: () => setSelFeat((f) => Math.max(f - 1, 0)),
    c: () => {
      if (!selFeature?.id) { flash('no feature to convert'); return; }
      if (selFeature.linked_spec_id) {
        flash(`already linked to spec ${selFeature.linked_spec_id}`);
        return;
      }
      const r = convertFeatureToSpec(project, selFeature.id);
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
        <Panel title="GENERATION" theme={c} focused={isActive && running} height={GENERATION_PANEL_HEIGHT}>
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
              {detailFeats.map((f, wi) => {
                const i = detailStart + wi;
                return (
                <Box key={f.id ?? i} flexDirection="column">
                  <Text color={i === featIndex ? c.text : c.dim} wrap="truncate-end">
                    {i === featIndex ? '❯' : ' '}{f.linked_spec_id ? '⇒' : '·'} <Text color={i === featIndex ? c.accent : c.dim}>{f.title ?? f.id}</Text> <Text color={c.faint}>[{f.status ?? 'planned'}{f.priority ? ` · ${f.priority}` : ''}]</Text>
                  </Text>
                  {f.linked_spec_id ? (
                    <Text color={c.ok}>   spec {f.linked_spec_id}</Text>
                  ) : (
                    <Text color={i === featIndex ? c.accent : c.faint}>   {i === featIndex ? 'c → convert this feature to a task spec' : 'n/p to select'}</Text>
                  )}
                </Box>
                );
              })}
              {phaseFeats.length > MAX_DETAIL_FEATURES ? (
                <Text color={c.faint}>
                  {`   showing ${detailStart + 1}-${detailStart + detailFeats.length} of ${phaseFeats.length} · n/p scrolls`}
                </Text>
              ) : null}
            </Box>
          ) : (
            <Text color={c.faint}>{phases.length ? 'phase has no features yet' : 'generate a roadmap first (g)'}</Text>
          )}
        </Panel>
      </Box>
      <Box paddingLeft={1}>
        <Text color={c.faint}>
          {running ? 'generating… x stop' : 'g generate · G refresh · j/k phase · n/p feature · c convert→spec'}
        </Text>
      </Box>
    </Box>
  );
}
