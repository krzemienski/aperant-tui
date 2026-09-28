/** App — root layout, view router, global keymap. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { Project, Task } from '@shared/types';
import { resolveTheme } from './theme/tokens';
import { detectColorTier } from './util/truecolor';
import { useAppStore, type ViewName } from './stores/app-store';
import { useKeymap } from './hooks/useKeymap';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { StatusLine } from './components/StatusLine';
import { Toast } from './components/Toast';
import { HelpOverlay } from './components/HelpOverlay';
import { CommandPalette, type PaletteContext } from './components/CommandPalette';
import { BoardView } from './views/BoardView';
import { TerminalView } from './views/TerminalView';
import { RoadmapView } from './views/RoadmapView';
import { InsightsView } from './views/InsightsView';
import { WorktreeView } from './views/WorktreeView';
import { SettingsView } from './views/SettingsView';
import { LogsView } from './views/LogsView';
import { AgentsView } from './views/AgentsView';
import { openProject, type OpenedProject } from './services/project-service';
import { getTasks, getCounts, refreshTasks } from './services/task-service';
import { readSettingsFile } from '@main/settings-utils';
import { registerSettingsAccessor } from '@main/ai/auth/resolver';
import { observability } from './services/observability';
import { getSpecsDir } from '@shared/constants';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface AppProps {
  projectPath: string;
}

// The vendored auth resolver reads provider accounts through a settings
// accessor the Electron main process registers at boot. The TUI runs the
// same code in-process, so it must register its own accessor (raw settings
// file, no migration) — without this, queue resolution finds zero accounts
// and every runner falls back to unauthenticated defaults.
registerSettingsAccessor((key: string) => {
  // The vendored resolver handles both shapes (string-encoded JSON or raw
  // arrays/objects) — hand the raw value through the same cast the desktop
  // uses; filtering on typeof would hide array-valued keys like
  // providerAccounts.
  return readSettingsFile()?.[key] as string | undefined;
});

const VIEW_KEYS: Record<string, ViewName> = { '1': 'board', '2': 'term', '3': 'road', '4': 'chat', '5': 'tree', '6': 'set', '7': 'agents' };

// Ink renders whatever height the tree asks for. When the frame's height
// REACHES the terminal's row count it abandons incremental repaint and issues
// a full clearTerminal on EVERY frame (node_modules/ink/build/ink.js:121,
// `if (outputHeight >= this.options.stdout.rows)`), which in a real PTY stacks
// never-cleared frames until the app is unreadable — measured 2026-09-28 in a
// 200x50 tmux pane during a live roadmap run that was growing the feature
// list (34 stacked repaints, evidence/phase-4/run-.../logs/
// frame-overflow-scrollback-ap6.txt).
//
// Nothing in the tree bounded total height: the root Box carried only
// `minHeight`. Views whose content scales with DATA (the roadmap's phase and
// feature lists) therefore grew the frame without limit as generation added
// features. Pin the root BELOW the terminal's height so the frame can never
// reach the overflow threshold: the comparison is `>=`, so a frame of exactly
// `rows` still takes the full-clear path. Reserve one row. Every Panel
// already clips with overflow="hidden", so the excess is trimmed instead of
// corrupting the display. `stdout.rows` is undefined on a non-TTY — fall back
// to the 50-row floor the capture harness uses.
function useTerminalRows(): number {
  const { stdout } = useStdout();
  // `- 1` is load-bearing, not cosmetic: see the `>=` above.
  const [rows, setRows] = useState(Math.max(1, (stdout?.rows ?? 50) - 1));
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setRows(Math.max(1, (stdout.rows ?? 50) - 1));
    onResize();
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);
  return rows;
}

export function App({ projectPath }: AppProps) {
  const { exit } = useApp();
  const view = useAppStore((s) => s.view);
  const themeName = useAppStore((s) => s.themeName);
  const paletteOpen = useAppStore((s) => s.paletteOpen);
  const helpOpen = useAppStore((s) => s.helpOpen);
  const toast = useAppStore((s) => s.toast);
  const configError = useAppStore((s) => s.configError);
  const textInputActive = useAppStore((s) => s.textInputActive);
  const store = useAppStore.getState();

  const tier = useMemo(() => detectColorTier(), []);
  const theme = useMemo(() => resolveTheme(themeName, tier), [themeName, tier]);

  const [opened, setOpened] = useState<OpenedProject | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logsTask, setLogsTask] = useState<Task | null>(null);
  const ctrlCArmed = useRef(false);
  // Must be called before ANY early return below (App returns a bare error /
  // loading frame when `opened` is null) — a hook after a conditional return
  // renders a different hook count between passes and React aborts the tree
  // with "Rendered more hooks than during the previous render".
  const termRows = useTerminalRows();
  // D14: agents/chat were a one-way trap — AgentsView literally tells the
  // user on screen "esc then 1-7 to switch tabs", but escape only called
  // closeOverlays() and never restored digit tab-navigation. `escape` now
  // ARMS tabNavArmed; the very next digit consumes it and switches views.
  // Ref-armed with an auto-disarm timeout, like ctrlCArmed above — but
  // unlike ctrlCArmed, a digit press or a second escape must be able to
  // cancel the pending disarm, so the timer handle itself is tracked in
  // tabNavTimer rather than fired-and-forgotten.
  const tabNavArmed = useRef(false);
  const tabNavTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const doOpenProject = useCallback((p: string) => {
    try {
      const o = openProject(p);
      setOpened(o);
      setOpenError(null);
      setTasks(getTasks(o.project));
      useAppStore.getState().flash(`project → ${o.project.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOpenError(msg);
      useAppStore.getState().flash(msg);
    }
  }, []);

  useEffect(() => { doOpenProject(projectPath); }, [projectPath]);

  // Real refresh: projectStore scans disk (3s TTL cache inside vendored code);
  // we invalidate and re-scan so external changes (agent runs, desktop app) show up.
  useEffect(() => {
    if (!opened) return;
    const id = setInterval(() => setTasks(refreshTasks(opened.project)), 2000);
    return () => clearInterval(id);
  }, [opened?.project.id]);

  useEffect(() => {
    if (configError) store.flash(configError);
  }, [configError]);

  const quit = useCallback(() => { exit(); }, [exit]);

  const paletteCtx: PaletteContext = useMemo(() => ({ openProject: doOpenProject, quit }), [doOpenProject, quit]);

  // Observability tap configuration: where sentinel files live for a task
  // (main spec dir + task worktree spec dir) and where task metadata reads.
  useEffect(() => {
    if (!opened?.project) return;
    const project = opened.project;
    const specsRel = getSpecsDir(project.autoBuildPath);
    observability.configure({
      specDirCandidates: (taskId) => [
        path.join(project.path, specsRel, taskId),
        path.join(project.path, '.auto-claude', 'worktrees', 'tasks', taskId, specsRel, taskId),
      ],
      taskMeta: (taskId) => {
        for (const dir of [
          path.join(project.path, specsRel, taskId),
          path.join(project.path, '.auto-claude', 'worktrees', 'tasks', taskId, specsRel, taskId),
        ]) {
          const metaPath = path.join(dir, 'task_metadata.json');
          if (existsSync(metaPath)) {
            try {
              return JSON.parse(readFileSync(metaPath, 'utf-8')) as { model?: string; provider?: string };
            } catch { return null; }
          }
        }
        return null;
      },
    });
  }, [opened]);

  // D18: a focused text input owns the keyboard. Ink's useInput has no
  // consumption semantics, so unless the global keymap stands down, typing a
  // '?' or ':' into InsightsView's ask box fires help/palette instead of
  // entering the character (reproduced: a typed question containing '?' opened
  // the help overlay mid-sentence).
  const overlaysOpen = paletteOpen || helpOpen;
  const globalKeysActive = !overlaysOpen && !textInputActive;
  useKeymap({
    // Digit tab-switching yields inside the agents view, whose own 1-6 keys
    // select observability sub-views (D4 lesson: dispatch, don't freeze).
    ...Object.fromEntries(Object.entries(VIEW_KEYS).map(([k, v]) => [k, () => store.setView(v)])),
    ':': () => store.openPalette(),
    '?': () => store.toggleHelp(),
    escape: () => store.closeOverlays(),
    'ctrl+c': () => {
      if (ctrlCArmed.current) { quit(); return; }
      ctrlCArmed.current = true;
      store.flash('press ctrl+c again to quit');
      setTimeout(() => { ctrlCArmed.current = false; }, 1500);
    },
  // Chat view yields digits too: InsightsView's 1-6 keys browse ideation
  // types when in ideation mode (same pattern as agents).
  }, { isActive: globalKeysActive && view !== 'agents' && view !== 'chat' });

  // D14: while the agents/chat view is active, the non-digit globals live
  // here as before, PLUS digit bindings gated on tabNavArmed.
  //
  // When NOT armed the digit handlers below no-op — that is safe, not a
  // swallow. Ink's useInput (hooks/useKeymap.ts wraps
  // ink/build/hooks/use-input.js) subscribes each active instance
  // independently on a plain EventEmitter with no stopPropagation: every
  // active useInput/useKeymap — this one AND AgentsView's/InsightsView's
  // own 1-6 keymap — receives every keystroke no matter what any other
  // instance's handler does. So a ref-gated no-op here is functionally
  // identical to conditionally omitting the binding (the heavier "only
  // spread the bindings into the keymap object when armed, via state"
  // alternative) — either way AgentsView's `1` still selects SWARM and
  // InsightsView's `4` still selects ideation type 4 when we're not armed.
  useKeymap({
    ':': () => store.openPalette(),
    '?': () => store.toggleHelp(),
    escape: () => {
      store.closeOverlays();
      tabNavArmed.current = true;
      store.flash('press 1-7 to switch tabs');
      clearTimeout(tabNavTimer.current);
      tabNavTimer.current = setTimeout(() => {
        tabNavArmed.current = false;
        tabNavTimer.current = undefined;
      }, 1500);
    },
    'ctrl+c': () => {
      if (ctrlCArmed.current) { quit(); return; }
      ctrlCArmed.current = true;
      store.flash('press ctrl+c again to quit');
      setTimeout(() => { ctrlCArmed.current = false; }, 1500);
    },
    ...Object.fromEntries(Object.entries(VIEW_KEYS).map(([k, v]) => [k, () => {
      if (!tabNavArmed.current) return;
      tabNavArmed.current = false;
      clearTimeout(tabNavTimer.current);
      tabNavTimer.current = undefined;
      store.setView(v);
    }])),
  }, { isActive: globalKeysActive && (view === 'agents' || view === 'chat') });

  // Palette open: Esc closes (TextInput consumes Enter itself).
  useInput((input, key) => {
    if (key.escape && paletteOpen) store.closePalette();
  }, { isActive: paletteOpen });

  // Help overlay is a REPLACEMENT view whose own close keys must stay live
  // while it is open (the main keymaps are disabled under overlays, so
  // without this binding help could never be dismissed).
  useInput((input, key) => {
    if (helpOpen && (key.escape || input === '?')) store.closeOverlays();
  }, { isActive: helpOpen });

  if (openError && !opened) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="#FF4444">failed to open project: {openError}</Text>
        <Text color="#8A8A9A">usage: aperant [path-to-project]</Text>
      </Box>
    );
  }
  if (!opened) {
    return <Box padding={1}><Text>opening {projectPath}…</Text></Box>;
  }

  const counts = getCounts(opened.project);
  const settings = readSettingsFile() ?? {};
  const profile = String(
    (settings.activeProfile as string) ?? (settings.claudeProfile as string) ??
    ((settings.profiles as Record<string, unknown> | undefined)?.active as string) ?? 'no profile'
  );

  const viewActive = !overlaysOpen;
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.border}
      height={termRows} overflow="hidden">
      <TitleBar theme={theme} projectName={opened.project.name} projectPath={opened.project.path}
        branch={opened.branch} counts={counts} profile={profile} />
      <TabBar view={view} theme={theme} />
      <Box flexDirection="column" flexGrow={1} paddingX={1} minHeight={10}>
        {helpOpen ? <HelpOverlay theme={theme} /> : null}
        {!helpOpen && view === 'board' && (
          <BoardView theme={theme} project={opened.project} tasks={tasks} isActive={viewActive}
            onOpenLogs={(t) => { setLogsTask(t); store.setView('logs'); }}
            onTasksChanged={() => setTasks(refreshTasks(opened.project))} />
        )}
        {!helpOpen && view === 'term' && <TerminalView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'road' && <RoadmapView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'chat' && <InsightsView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'tree' && <WorktreeView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'set' && <SettingsView theme={theme} isActive={viewActive} />}
        {!helpOpen && view === 'agents' && <AgentsView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'logs' && <LogsView theme={theme} task={logsTask} isActive={viewActive} onBack={() => store.setView('board')} />}
      </Box>
      {paletteOpen ? <CommandPalette theme={theme} ctx={paletteCtx} /> : <StatusLine view={view} theme={theme} />}
      {toast ? <Toast msg={toast} theme={theme} /> : null}
    </Box>
  );
}
