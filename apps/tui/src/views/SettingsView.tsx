/**
 * SettingsView — REAL theme picker (j/k + ⏎, live-applies and persists to
 * ~/.aperant/tui.json) and a real readout of the desktop settings file.
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import { THEMES, THEME_NAMES } from '../theme/themes';
import { Panel } from '../components/Panel';
import { useAppStore } from '../stores/app-store';
import { useKeymap } from '../hooks/useKeymap';
import { getConfigPath } from '../services/config-service';
import { getSettingsPath, readSettingsFile } from '@main/settings-utils';

export function SettingsView({ theme: c, isActive }: { theme: Theme; isActive: boolean }) {
  const themeName = useAppStore((s) => s.themeName);
  const cycleTheme = useAppStore((s) => s.cycleTheme);
  const setTheme = useAppStore((s) => s.setTheme);

  useKeymap({
    j: () => cycleTheme(1),
    k: () => cycleTheme(-1),
    down: () => cycleTheme(1),
    up: () => cycleTheme(-1),
    return: () => setTheme(themeName), // persists (already live-applied on cycle)
  }, { isActive });

  const desktopSettings = readSettingsFile() ?? {};
  const rows: Array<[string, string, string]> = [
    ['tui config', getConfigPath(), c.faint],
    ['desktop settings', getSettingsPath(), c.faint],
    ['provider', String(desktopSettings.provider ?? desktopSettings.apiProvider ?? 'not configured'), String(desktopSettings.provider ?? desktopSettings.apiProvider ?? '').length ? c.text : c.faint],
    ['model', String(desktopSettings.model ?? desktopSettings.defaultModel ?? 'not configured'), c.text],
  ];

  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="THEME" focused theme={c} flexGrow={1}>
        {THEME_NAMES.map((k) => {
          const th = THEMES[k];
          const on = k === themeName;
          return (
            <Text key={k} backgroundColor={on ? c.panelAlt : undefined}>
              <Text color={on ? c.accent : c.faint}>{on ? '❯ ' : '  '}</Text>
              <Text color={th.bg} backgroundColor={th.accent}>  </Text>
              <Text backgroundColor={th.accent2}>  </Text>
              <Text color={on ? c.text : c.dim}> {th.name}</Text>
              {on ? <Text color={c.accent}>  ACTIVE</Text> : null}
            </Text>
          );
        })}
        <Text> </Text>
        <Text color={c.dim}>j/k select · applies live · persists to tui.json</Text>
      </Panel>
      <Panel title="CONFIG" theme={c} flexGrow={1}>
        {rows.map(([k, v, col]) => (
          <Box key={k} gap={1}>
            <Box width={17}><Text color={c.dim}>{k}</Text></Box>
            <Text color={col} wrap="truncate-end">{v}</Text>
          </Box>
        ))}
      </Panel>
    </Box>
  );
}
