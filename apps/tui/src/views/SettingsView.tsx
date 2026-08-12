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
import { listProviderAccounts, provisionMoonshotAccount } from '../services/account-service';

export function SettingsView({ theme: c, isActive }: { theme: Theme; isActive: boolean }) {
  const themeName = useAppStore((s) => s.themeName);
  const cycleTheme = useAppStore((s) => s.cycleTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [accountFlash, setAccountFlash] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [accountsVersion, setAccountsVersion] = React.useState(0);

  useKeymap({
    j: () => cycleTheme(1),
    k: () => cycleTheme(-1),
    down: () => cycleTheme(1),
    up: () => cycleTheme(-1),
    return: () => setTheme(themeName), // persists (already live-applied on cycle)
    // Provision a Moonshot (Kimi) account from the environment — REAL write to
    // settings.json in the exact shape the vendored AgentManager queue reads.
    a: () => {
      const r = provisionMoonshotAccount();
      setAccountFlash(r.ok
        ? { ok: true, msg: `moonshot account ${r.updated ? 'updated' : 'added'}: ${r.accountId} → ${r.baseUrl}` }
        : { ok: false, msg: `not provisioned: ${r.reason}` });
      setAccountsVersion((v) => v + 1);
    },
  }, { isActive });

  const desktopSettings = readSettingsFile() ?? {};
  const accounts = listProviderAccounts(); // re-read on accountsVersion change
  void accountsVersion;
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
      <Box flexDirection="column" flexGrow={1} gap={1}>
        <Panel title="CONFIG" theme={c}>
          {rows.map(([k, v, col]) => (
            <Box key={k} gap={1}>
              <Box width={17}><Text color={c.dim}>{k}</Text></Box>
              <Text color={col} wrap="truncate-end">{v}</Text>
            </Box>
          ))}
        </Panel>
        <Panel title="ACCOUNTS" theme={c} flexGrow={1}>
          {accounts.length === 0 ? (
            <Text color={c.faint}>no provider accounts — press a to add Moonshot (Kimi) from env</Text>
          ) : (
            accounts.map((a) => (
              <Box key={a.id} gap={1}>
                <Box width={10}><Text color={c.accent2}>{a.provider}</Text></Box>
                <Box width={22}><Text color={c.text} wrap="truncate-end">{a.name}</Text></Box>
                <Text color={c.dim}>{a.hasKey ? `key ${a.keyPreview}` : 'no key'}</Text>
                <Text color={c.faint} wrap="truncate-end">{a.baseUrl ?? ''}</Text>
              </Box>
            ))
          )}
          {accountFlash ? (
            <Text color={accountFlash.ok ? c.ok : c.err} wrap="truncate-end">{accountFlash.msg}</Text>
          ) : null}
          <Text color={c.dim}>a add/update Moonshot (Kimi) from env · writes settings.json · queue-priority first</Text>
        </Panel>
      </Box>
    </Box>
  );
}
