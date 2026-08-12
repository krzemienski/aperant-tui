import React from 'react';
import { Text } from 'ink';
import type { Theme } from '../theme/themes';

export function barText(pct: number, width = 14): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function ProgressBar({ pct, width = 14, theme: c }: { pct: number; width?: number; theme: Theme }) {
  return <Text color={c.accent}>{barText(pct, width)}</Text>;
}
