/**
 * BoardView — kanban over REAL tasks discovered by the vendored projectStore
 * from the project's .auto-claude/specs tree. H/L moves persist through the
 * vendored persistPlanStatusSync; `s` starts the real vendored AgentManager
 * pipeline (its real outcome — started, or the real error — lands in AGENT
 * STREAM). No TUI-side state shadowing: after a move we re-read from disk.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Project, Task } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { StatusBadge, statusMeta, prioColor, prioGlyph } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { groupByStatus } from '../services/task-service';
import { moveTask } from '../services/task-lifecycle-service';
import { startTask, getManager, type StartOutcome } from '../services/agent-start-service';
import { useKeymap } from '../hooks/useKeymap';
import { useAppStore } from '../stores/app-store';
import { observability, overallProgress } from '../services/observability';

// P-BOARD-LIVE: DETAIL's phase line read `task.executionProgress?.phase`,
// which is populated ONLY from the main project's on-disk
// implementation_plan.json (project-store.ts loadTasksFromSpecsDir ->
// executionProgress derived from plan.executionPhase). During a live
// worktree run that file is never written to the MAIN repo path — the
// desktop's own live-sync callback (BuildOrchestratorConfig.syncSpecToSource,
// build-orchestrator.ts:99,366-368,391-393,482-484) is declared optional and
// is never actually supplied by worker.ts's runBuildOrchestrator (verified:
// no `syncSpecToSource:` key anywhere in that object literal), so every
// `if (this.config.sourceSpecDir && this.config.syncSpecToSource)` guard is
// permanently dead. The partial per-subtask sync in subtask-iterator.ts's
// syncPhasesToMain() can only UPDATE an existing main-plan file (it
// `readFile`s the main path first and no-ops silently on ENOENT) — it can
// never CREATE one. The TUI's own F-17 fix (agent-start-service.ts
// attachPlanSync/syncPlanOnExit) DOES create the main plan on first sync,
// but only fires on the agent process's `exit` event — by design, not a
// bug, but it means the main-repo plan (and therefore
// task.executionProgress) never exists until the run is already over.
// Board's DETAIL panel showed `phase -` for the task's entire ~50-minute,
// 9-subtask lifetime as a direct result.
//
// Fix: read live phase from the SAME event-driven observability tap tab 7
// (AgentsView) already uses (`observability.on('snapshot', ...)` +
// `getAgents()`), keyed by taskId — no new disk polling, no touching the
// vendored desktop sync machinery. `AgentSnapshot.phase` is set directly
// from AgentManager's `execution-progress` event (observability.ts:276-283,
// same event agent-start-service.ts's START_EVENTS already awaits for the
// initial "agent started" outcome), so it updates the instant a real phase
// transition happens, not on a 2s/3s disk-cache cadence. Falls back to the
// disk-derived `task.executionProgress?.phase` when no live agent is
// tracked for this task (task never started this session, or process
// already exited and the tap's in-memory entry may since have been GC'd on
// a future restart) — so a cold TUI relaunch still shows whatever the last
// on-disk sync recorded, exactly as before this fix.
// F-12: `x` used to be a hard-coded flash that never checked the real
// runtime — it lied about stop being unavailable even when a task WAS
// running. The vendored AgentManager (apps/desktop/src/main/agent/
// agent-manager.ts:740-742 `killTask(taskId)`, :782-784 `isRunning(taskId)`)
// exposes a real per-task kill; it just was never added to this view's
// service surface. AgentManagerLike (agent-start-service.ts, out of scope
// for this fix) doesn't declare these two methods, but the real singleton
// instance it wraps has them — extend the shape locally rather than editing
// the shared file.
type StoppableManager = { killTask: (taskId: string) => boolean; isRunning: (taskId: string) => boolean };

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'BACKLOG', queue: 'QUEUE', in_progress: 'BUILDING',
  ai_review: 'AI REVIEW', human_review: 'HUMAN', done: 'DONE', error: 'ERROR', pr_created: 'PR',
};

// P-BOARD-LIVE-PCT: DETAIL's progress % sat at a permanent 0% for a task's
// entire live worktree run, for the same root cause as the phase fix above
// (task.executionProgress never exists until the vendored F-17 exit-time
// sync writes it). Unlike phase, there is no numeric live signal to fall
// back on: the worker-thread path (worker-bridge.ts:210-221
// emitProgressFromTracker) hardcodes `phaseProgress: 0, overallProgress: 0`
// on every emit with the comment "Detailed progress calculated by UI from
// phase" — i.e. the vendored runtime is telling the consumer, by design,
// that no finer-grained number is coming. `AgentSnapshot.stepsExecuted /
// maxSteps` was considered and rejected: `maxSteps` (observability.ts:258)
// is a hardcoded 1000-step safety ceiling unrelated to the task's actual
// work size — a 40-step task would render 4% at completion, a dishonest
// number that looks like real information. `currentSubtask` (set from
// regex/tool-arg extraction in progress-tracker.ts) is a free-text id with
// no accompanying total, so a numerator with no honest denominator is the
// same trap. What IS genuinely known and fixed: the phase sequence itself
// (planning → coding → qa_review/qa_fixing → complete, phase-protocol.ts's
// EXECUTION_PHASES) and its weight bands, already mirrored byte-for-byte
// in this file's PHASE_WEIGHTS and already used this exact way at
// AgentsView.tsx:241 (`overallProgress(r.phase, 0)`). This is phase-
// granular, not work-granular progress — coarse floor-of-phase, not smooth
// step-by-step advancement — but it is honest: it reflects a real phase
// transition every time it moves and never fabricates a subtask count that
// was never observed.
//
// `overallProgress()` returns 0 for phases outside PHASE_WEIGHTS (failed,
// rate_limit_paused, auth_failure_paused have no band) — a task that
// reaches qa_review (80%) and then fails would otherwise visibly regress
// to 0%. `pctHighWaterMark` clamps per-taskId to the highest value observed
// this session so the on-screen number never goes backwards, matching the
// same guard the disk-derived path gets for free (subtask completion counts
// only ever go up). MODULE-level (like the `observability` singleton this
// file already imports), not a component ref: App.tsx:246 conditionally
// mounts BoardView only while `view === 'board'`, so a `useRef` here would
// silently reset to empty on every tab-away-and-back — the single most
// common interaction — undoing the very regression guard it exists for.
// Verified live: switching to tab 7 and back during a real run reset a
// component-ref version of this map from 20% back to 0% while the live
// agent (same phase) was still running underneath.
const pctHighWaterMark = new Map<string, number>();

function progressOf(t: Task, live?: number): number {
  if (live !== undefined) return live;
  if (t.executionProgress) return Math.round(t.executionProgress.overallProgress);
  if (!t.subtasks?.length) return t.status === 'done' ? 100 : 0;
  const done = t.subtasks.filter((s) => s.status === 'completed').length;
  return Math.round((done / t.subtasks.length) * 100);
}

interface Props {
  theme: Theme;
  project: Project;
  tasks: Task[];
  onOpenLogs: (task: Task) => void;
  /** Re-read tasks from disk after a lifecycle write (move, start, ...). */
  onTasksChanged: () => void;
  isActive: boolean;
}

export function BoardView({ theme: c, project, tasks, onOpenLogs, onTasksChanged, isActive }: Props) {
  const [sel, setSel] = useState(0);
  const [focus, setFocus] = useState<'list' | 'detail'>('list');
  const [starting, setStarting] = useState(false);
  // useKeymap.ts's coalesced-keystroke split (P7.1) can dispatch the SAME
  // handler N times synchronously within one React batch (a held/repeated
  // key that arrived coalesced in one PTY data event). `starting` state
  // does not update between those synchronous calls — React batches the
  // setStarting(true) below — so a closure-only guard on `starting` would
  // let every one of those N calls slip past and fire `startTask` for real.
  // A ref updates synchronously and is safe across a same-tick burst.
  const startingRef = useRef(false);
  // Real lifecycle events, newest last — rendered in AGENT STREAM.
  const [stream, setStream] = useState<string[]>([]);
  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const flat = useMemo(() => groups.flatMap(([, items]) => items), [groups]);
  const clamped = Math.min(sel, Math.max(0, flat.length - 1));
  const task = flat[clamped];
  const flash = useAppStore((s) => s.flash);

  // P-BOARD-LIVE: subscribe to the same coalesced 'snapshot' event tab 7
  // uses (observability.ts:196 — emitted at most once per 16ms frame when
  // dirty), and re-derive a taskId -> phase map on each one. This is a
  // cheap O(live-agent-count) rebuild, not a disk read, and only re-renders
  // when a real phase/step/token update actually occurred.
  const [liveTick, setLiveTick] = useState(0);
  useEffect(() => {
    const onSnap = () => setLiveTick((n) => n + 1);
    observability.on('snapshot', onSnap);
    return () => { observability.off('snapshot', onSnap); };
  }, []);
  const livePhaseByTaskId = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of observability.getAgents()) {
      // idle/complete/failed carry no useful "what is it doing right now"
      // signal beyond what the disk-derived status/column already shows —
      // only surface phases that represent genuine in-flight work.
      if (a.phase && a.phase !== 'idle') m.set(a.taskId, a.phase);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveTick is the trigger, not a value read here
  }, [liveTick]);
  const livePctByTaskId = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of observability.getAgents()) {
      if (!a.phase || a.phase === 'idle') continue;
      const raw = overallProgress(a.phase, 0);
      const prevMax = pctHighWaterMark.get(a.taskId) ?? 0;
      const clamped = Math.max(raw, prevMax);
      pctHighWaterMark.set(a.taskId, clamped);
      m.set(a.taskId, clamped);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveTick is the trigger, not a value read here
  }, [liveTick]);

  const log = (line: string) => setStream((s) => [...s.slice(-40), line]);

  const move = (dir: 1 | -1) => {
    if (!task) return;
    const r = moveTask(project, task, dir);
    if (r.ok) {
      flash(`${task.id.slice(0, 8)}: ${r.from} → ${r.to}`);
      log(`${new Date().toISOString().slice(11, 19)} move ${task.id.slice(0, 8)} ${r.from} → ${r.to} (persisted)`);
      // Follow the moved task to its new row rather than selecting its old neighbor.
      const moved = tasks.map((t) => t.id === task.id ? { ...t, status: r.to } : t);
      setSel(groupByStatus(moved).flatMap(([, items]) => items).findIndex((t) => t.id === task.id));
      onTasksChanged();
    } else {
      flash(r.reason);
      log(`${new Date().toISOString().slice(11, 19)} move ${task.id.slice(0, 8)} refused: ${r.reason}`);
    }
  };

  const start = () => {
    if (!task || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    log(`${new Date().toISOString().slice(11, 19)} start ${task.id.slice(0, 8)} → vendored AgentManager…`);
    startTask(project, task)
      .then((o: StartOutcome) => {
        log(`${new Date().toISOString().slice(11, 19)} ${o.ok ? 'started' : 'failed'} ${o.taskId.slice(0, 8)}: ${o.detail}`);
        flash(o.ok ? `agent started: ${task.id.slice(0, 8)}` : `start failed: ${o.detail.slice(0, 60)}`);
        onTasksChanged();
      })
      .finally(() => { startingRef.current = false; setStarting(false); });
  };

  const stop = () => {
    if (!task) { flash('no task selected'); return; }
    getManager().then((am) => {
      const m = am as unknown as StoppableManager;
      if (!m.isRunning(task.id)) {
        flash(`${task.id.slice(0, 8)}: no live agent process for this task`);
        return;
      }
      const killed = m.killTask(task.id);
      log(`${new Date().toISOString().slice(11, 19)} ${killed ? 'stopped' : 'stop failed'} ${task.id.slice(0, 8)}`);
      flash(killed ? `stopped: ${task.id.slice(0, 8)}` : `stop failed: ${task.id.slice(0, 8)}`);
      onTasksChanged();
    }).catch((err: unknown) => {
      flash(`stop failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  };

  useKeymap({
    j: () => setSel((s) => Math.min(s + 1, flat.length - 1)),
    k: () => setSel((s) => Math.max(s - 1, 0)),
    down: () => setSel((s) => Math.min(s + 1, flat.length - 1)),
    up: () => setSel((s) => Math.max(s - 1, 0)),
    return: () => setFocus((f) => (f === 'list' ? 'detail' : 'list')),
    H: () => move(-1),
    L: () => move(1),
    s: start,
    x: stop,
    l: () => task && onOpenLogs(task),
    // Only `j`/`k` are named here — see useKeymap.ts's P7.1 fix comment for
    // why: they are pure `setSel((s) => ...)` functional-updater calls with
    // no side effects, verified safe to fire N times synchronously in one
    // React batch. `H`/`L`/`s`/`x` all read stale closure state (`task`,
    // `starting`) across a same-tick burst and are NOT listed — see `start`'s
    // ref-based reentrancy guard above for why a naive split would have been
    // unsafe for `s` specifically.
  }, { isActive, splittableKeys: ['j', 'k'] });

  // P7.1 fix: BoardView used to .map() every task in every column
  // unconditionally on every render — with 200 tasks that meant Ink had to
  // diff and repaint a 200+-line-tall tree on every single keystroke.
  // Measured impact (evidence/phase-7/perf/P7.1-VERDICT.md): sustained
  // j-scroll dropped 93.3% of keystrokes at 200-task scale (only ~3.4
  // registered scroll-steps/sec — ~296.7ms per step, ~18x over the
  // 16.67ms/60fps budget). The same protocol at 20 tasks dropped 46-67%,
  // proving the degradation scaled with unwindowed render cost rather than
  // a fixed terminal/instrument ceiling. Fix: flatten the grouped columns
  // into header+item rows, then render only a viewport-sized WINDOW of that
  // flat list, scrolled to keep `sel` visible — the standard virtualized-list
  // technique. Column header counts (BACKLOG (23) etc.) still read the TRUE
  // per-status total from `items.length`, never the windowed subset, so
  // header counts stay accurate at any scroll position.
  type BoardRow =
    | { kind: 'header'; status: string; count: number }
    | { kind: 'item'; task: Task; flatIndex: number };

  // O(n) index lookup instead of repeated flat.indexOf(t) (which would be
  // O(n) per call, O(n²) overall) — trivial at 200 tasks either way, but
  // this is the performance-sensitive view, so do it the cheap way. Task
  // ids are unique strings, so a plain string-keyed lookup table covers it.
  const flatIndexById = useMemo(() => {
    const m: Record<string, number> = {};
    flat.forEach((t, i) => { m[t.id] = i; });
    return m;
  }, [flat]);

  const boardRows = useMemo<BoardRow[]>(() => {
    const out: BoardRow[] = [];
    for (const [status, items] of groups) {
      out.push({ kind: 'header', status, count: items.length });
      for (const t of items) out.push({ kind: 'item', task: t, flatIndex: flatIndexById[t.id] ?? -1 });
    }
    return out;
  }, [groups, flatIndexById]);

  // Rows of chrome above/below the TASKS panel's content area that eat into
  // the terminal's row budget: App's outer border (2) + TitleBar (1) +
  // TabBar (1) + StatusLine (1) + this Panel's own border (2) + title row
  // (1) = 8, plus a 1-row safety margin so the last visible row never
  // straddles a repaint. Same `useStdout().stdout.rows` convention PtyPane
  // already uses to size itself against the real terminal.
  const BOARD_CHROME_ROWS = 9;
  const { stdout } = useStdout();
  const viewportRows = Math.max(5, (stdout?.rows ?? 50) - BOARD_CHROME_ROWS);

  // Scroll offset persists across renders via a ref (not state) and is
  // recomputed synchronously from `clamped` on every render — no second
  // render pass is needed just to reposition the window when `sel` moves.
  const scrollRef = useRef(0);
  const selRowIndex = boardRows.findIndex((r) => r.kind === 'item' && r.flatIndex === clamped);
  if (selRowIndex >= 0) {
    if (selRowIndex < scrollRef.current) scrollRef.current = selRowIndex;
    if (selRowIndex >= scrollRef.current + viewportRows) scrollRef.current = selRowIndex - viewportRows + 1;
  }
  const maxScroll = Math.max(0, boardRows.length - viewportRows);
  scrollRef.current = Math.min(Math.max(scrollRef.current, 0), maxScroll);
  const visibleRows = boardRows.slice(scrollRef.current, scrollRef.current + viewportRows);

  // P-BOARD-LIVE: prefer the live observability phase over the disk-derived
  // one for the currently-selected task; see the header comment block for
  // why the disk value alone stays '-' for an entire live run.
  const livePhase = task ? livePhaseByTaskId.get(task.id) : undefined;
  const displayPhase = livePhase ?? task?.executionProgress?.phase ?? null;
  // Same "prefer live, fall back to disk" pattern as displayPhase above —
  // livePctByTaskId is only populated for taskIds with a genuinely tracked
  // live agent (see livePctByTaskId's guard), so a task with no live agent
  // (never started this session, or process already exited) falls through
  // to progressOf's disk-derived computation exactly as before this fix.
  const livePct = task ? livePctByTaskId.get(task.id) : undefined;

  return (
    <Box flexDirection="row" gap={1} flexGrow={1}>
      <Panel title="TASKS" focused={focus === 'list'} theme={c} flexGrow={1} flexBasis="46%">
        {groups.length === 0 ? (
          <Box flexDirection="column" paddingY={1}>
            <Text color={c.faint}>no tasks — {project.path}/.auto-claude/specs has no spec directories</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {visibleRows.map((r) => {
              if (r.kind === 'header') {
                return (
                  <Text key={`h-${r.status}`} color={c.dim}>
                    <Text color={statusMeta(c, r.status)[0]}>◆</Text> {COLUMN_LABELS[r.status] ?? r.status}{' '}
                    <Text color={c.faint}>({r.count})</Text>
                  </Text>
                );
              }
              const t = r.task;
              const on = r.flatIndex === clamped;
              const pct = progressOf(t, livePctByTaskId.get(t.id));
              return (
                <Text key={t.id} backgroundColor={on ? c.panelAlt : undefined} wrap="truncate-end">
                  <Text color={on ? c.accent : c.faint}>{on ? '❯ ' : '  '}</Text>
                  <Text color={c.dim}>{t.id.slice(0, 8).padEnd(8)}</Text>{' '}
                  <Text color={prioColor(c, t.metadata?.priority)}>{prioGlyph(t.metadata?.priority)}</Text>{' '}
                  <Text color={on ? c.text : c.dim}>{t.title}</Text>
                  {pct > 0 ? <Text color={statusMeta(c, t.status)[0]}> {String(pct).padStart(3)}%</Text> : null}
                </Text>
              );
            })}
          </Box>
        )}
      </Panel>

      <Box flexDirection="column" gap={1} flexGrow={1} flexBasis="54%">
        <Panel title="DETAIL" focused={focus === 'detail'} theme={c}>
          {task ? (
            <Box flexDirection="column">
              <Box gap={1}>
                <Text color={c.dim}>{task.id.slice(0, 8)}</Text>
                <StatusBadge status={task.status} theme={c} />
              </Box>
              <Text color={c.text} wrap="truncate-end">{task.title}</Text>
              <Box gap={1}>
                <Text color={c.dim}>progress</Text>
                <ProgressBar pct={progressOf(task, livePct)} theme={c} />
                <Text color={c.text}>{progressOf(task, livePct)}%</Text>
              </Box>
              <Text color={c.dim}>
                subtasks <Text color={c.text}>{task.subtasks.filter((s) => s.status === 'completed').length}/{task.subtasks.length} complete</Text>
              </Text>
              <Text color={c.dim}>
                phase <Text color={displayPhase ? c.accent2 : c.faint}>{displayPhase ?? '-'}</Text>
              </Text>
              <Text color={c.dim} wrap="truncate-end">
                location <Text color={c.info}>{task.location ?? 'main'}</Text>
                {'  '}spec <Text color={c.faint}>{task.specId}</Text>
              </Text>
            </Box>
          ) : (
            <Text color={c.faint}>nothing selected</Text>
          )}
        </Panel>

        <Panel title="AGENT STREAM" theme={c} flexGrow={1}>
          {stream.length ? (
            stream.slice(-12).map((l, i) => (
              <Text key={i} color={l.includes('failed') || l.includes('refused') ? c.err : c.dim} wrap="truncate-end">{l}</Text>
            ))
          ) : task?.logs?.length ? (
            task.logs.slice(-12).map((l, i) => (
              <Text key={i} color={c.dim} wrap="truncate-end">{l}</Text>
            ))
          ) : (
            <Text color={c.faint}>{task ? 'no recorded runs for this task' : 'select a task'}</Text>
          )}
        </Panel>
      </Box>
    </Box>
  );
}
