/**
 * BoardView — kanban over REAL tasks discovered by the vendored projectStore
 * from the project's .auto-claude/specs tree. H/L moves persist through the
 * vendored persistPlanStatusSync; `s` starts the real vendored AgentManager
 * pipeline (its real outcome — started, or the real error — lands in AGENT
 * STREAM). No TUI-side state shadowing: after a move we re-read from disk.
 */
import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import type { Project, Task } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import { StatusBadge, statusMeta, prioColor, prioGlyph } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { groupByStatus } from '../services/task-service';
import { moveTask } from '../services/task-lifecycle-service';
import { startTask, type StartOutcome } from '../services/agent-start-service';
import { useKeymap } from '../hooks/useKeymap';
import { useAppStore } from '../stores/app-store';

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'BACKLOG', queue: 'QUEUE', in_progress: 'BUILDING',
  ai_review: 'AI REVIEW', human_review: 'HUMAN', done: 'DONE', error: 'ERROR', pr_created: 'PR',
};

function progressOf(t: Task): number {
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
  // Real lifecycle events, newest last — rendered in AGENT STREAM.
  const [stream, setStream] = useState<string[]>([]);
  const flat = tasks;
  const clamped = Math.min(sel, Math.max(0, flat.length - 1));
  const task = flat[clamped];
  const flash = useAppStore((s) => s.flash);

  const log = (line: string) => setStream((s) => [...s.slice(-40), line]);

  const move = (dir: 1 | -1) => {
    if (!task) return;
    const r = moveTask(project, task, dir);
    if (r.ok) {
      flash(`${task.id.slice(0, 8)}: ${r.from} → ${r.to}`);
      log(`${new Date().toISOString().slice(11, 19)} move ${task.id.slice(0, 8)} ${r.from} → ${r.to} (persisted)`);
      onTasksChanged();
    } else {
      flash(r.reason);
      log(`${new Date().toISOString().slice(11, 19)} move ${task.id.slice(0, 8)} refused: ${r.reason}`);
    }
  };

  const start = () => {
    if (!task || starting) return;
    setStarting(true);
    log(`${new Date().toISOString().slice(11, 19)} start ${task.id.slice(0, 8)} → vendored AgentManager…`);
    startTask(project, task)
      .then((o: StartOutcome) => {
        log(`${new Date().toISOString().slice(11, 19)} ${o.ok ? 'started' : 'failed'} ${o.taskId.slice(0, 8)}: ${o.detail}`);
        flash(o.ok ? `agent started: ${task.id.slice(0, 8)}` : `start failed: ${o.detail.slice(0, 60)}`);
        onTasksChanged();
      })
      .finally(() => setStarting(false));
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
    x: () => flash('stop: no live agent process is owned by this TUI session'),
    l: () => task && onOpenLogs(task),
  }, { isActive });

  const groups = useMemo(() => groupByStatus(tasks), [tasks]);

  return (
    <Box flexDirection="row" gap={1} flexGrow={1}>
      <Panel title="TASKS" focused={focus === 'list'} theme={c} flexGrow={1} flexBasis="46%">
        {groups.length === 0 ? (
          <Box flexDirection="column" paddingY={1}>
            <Text color={c.faint}>no tasks — {project.path}/.auto-claude/specs has no spec directories</Text>
          </Box>
        ) : (
          groups.map(([status, items]) => (
            <Box key={status} flexDirection="column">
              <Text color={c.dim}>
                <Text color={statusMeta(c, status)[0]}>◆</Text> {COLUMN_LABELS[status] ?? status}{' '}
                <Text color={c.faint}>({items.length})</Text>
              </Text>
              {items.map((t) => {
                const i = flat.indexOf(t);
                const on = i === clamped;
                const pct = progressOf(t);
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
          ))
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
                <ProgressBar pct={progressOf(task)} theme={c} />
                <Text color={c.text}>{progressOf(task)}%</Text>
              </Box>
              <Text color={c.dim}>
                subtasks <Text color={c.text}>{task.subtasks.filter((s) => s.status === 'completed').length}/{task.subtasks.length} complete</Text>
              </Text>
              <Text color={c.dim}>
                phase <Text color={task.executionProgress ? c.accent2 : c.faint}>{task.executionProgress?.phase ?? '-'}</Text>
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
