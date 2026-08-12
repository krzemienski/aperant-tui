import React from 'react';
import { Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { TaskStatus } from '@shared/types';

export function statusMeta(theme: Theme, status: string): [string, string] {
  const map: Record<string, [string, string]> = {
    backlog: [theme.faint, 'BACKLOG'],
    queue: [theme.info, 'QUEUED'],
    in_progress: [theme.accent, 'BUILD'],
    ai_review: [theme.warn, 'AI-QA'],
    human_review: [theme.accent2, 'REVIEW'],
    done: [theme.ok, 'DONE'],
    pr_created: [theme.info, 'PR'],
    error: [theme.err, 'ERROR'],
  };
  return map[status] ?? [theme.dim, status.toUpperCase()];
}

export function StatusBadge({ status, theme }: { status: TaskStatus | string; theme: Theme }) {
  const [color, label] = statusMeta(theme, status);
  return <Text color={color}>[{label}]</Text>;
}

export function prioColor(theme: Theme, p?: string): string {
  return p === 'high' ? theme.err : p === 'medium' || p === 'med' ? theme.warn : theme.dim;
}

export function prioGlyph(p?: string): string {
  return p === 'high' ? '▲' : p === 'medium' || p === 'med' ? '◆' : '▽';
}
