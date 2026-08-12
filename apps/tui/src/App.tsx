/** App — root layout, view router, global keymap. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
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
import { openProject, type OpenedProject } from './services/project-service';
import { getTasks, getCounts, refreshTasks } from './services/task-service';
import { readSettingsFile } from '@main/settings-utils';

interface AppProps {
  projectPath: string;
}

const VIEW_KEYS: Record<string, ViewName> = { '1': 'board', '2': 'term', '3': 'road', '4': 'chat', '5': 'tree', '6': 'set' };

export function App({ projectPath }: AppProps) {
  const { exit } = useApp();
  const view = useAppStore((s) => s.view);
  const themeName = useAppStore((s) => s.themeName);
  const paletteOpen = useAppStore((s) => s.paletteOpen);
  const helpOpen = useAppStore((s) => s.helpOpen);
  const toast = useAppStore((s) => s.toast);
  const configError = useAppStore((s) => s.configError);
  const store = useAppStore.getState();

  const tier = useMemo(() => detectColorTier(), []);
  const theme = useMemo(() => resolveTheme(themeName, tier), [themeName, tier]);

  const [opened, setOpened] = useState<OpenedProject | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logsTask, setLogsTask] = useState<Task | null>(null);
  const ctrlCArmed = useRef(false);

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

  const overlaysOpen = paletteOpen || helpOpen;
  useKeymap({
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
  }, { isActive: !overlaysOpen });

  // Palette open: Esc closes (TextInput consumes Enter itself).
  useInput((input, key) => {
    if (key.escape && paletteOpen) store.closePalette();
  }, { isActive: paletteOpen });

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
    <Box flexDirection="column" borderStyle="single" borderColor={theme.border}>
      <TitleBar theme={theme} projectName={opened.project.name} projectPath={opened.project.path}
        branch={opened.branch} counts={counts} profile={profile} />
      <TabBar view={view} theme={theme} />
      <Box flexDirection="column" flexGrow={1} paddingX={1} minHeight={10}>
        {helpOpen ? <HelpOverlay theme={theme} /> : null}
        {!helpOpen && view === 'board' && (
          <BoardView theme={theme} project={opened.project} tasks={tasks} isActive={viewActive}
            onOpenLogs={(t) => { setLogsTask(t); store.setView('logs'); }} />
        )}
        {!helpOpen && view === 'term' && <TerminalView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'road' && <RoadmapView theme={theme} project={opened.project} />}
        {!helpOpen && view === 'chat' && <InsightsView theme={theme} project={opened.project} />}
        {!helpOpen && view === 'tree' && <WorktreeView theme={theme} project={opened.project} isActive={viewActive} />}
        {!helpOpen && view === 'set' && <SettingsView theme={theme} isActive={viewActive} />}
        {!helpOpen && view === 'logs' && <LogsView theme={theme} task={logsTask} isActive={viewActive} onBack={() => store.setView('board')} />}
      </Box>
      {paletteOpen ? <CommandPalette theme={theme} ctx={paletteCtx} /> : <StatusLine view={view} theme={theme} />}
      {toast ? <Toast msg={toast} theme={theme} /> : null}
    </Box>
  );
}
