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
import { listProviderAccounts, provisionAnthropicAccount, provisionMoonshotAccount, activateAccount } from '../services/account-service';

type SettingsFocus = 'theme' | 'accounts';

export function SettingsView({ theme: c, isActive }: { theme: Theme; isActive: boolean }) {
  const themeName = useAppStore((s) => s.themeName);
  const cycleTheme = useAppStore((s) => s.cycleTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [accountFlash, setAccountFlash] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [accountsVersion, setAccountsVersion] = React.useState(0);
  // P6.2: tab toggles which panel j/k/return act on — THEME (cycle/persist,
  // the pre-existing behavior) or ACCOUNTS (move the account cursor,
  // return activates it). Matches the tab-focus convention WorktreeView
  // uses for its list/diff panes.
  const [focus, setFocus] = React.useState<SettingsFocus>('theme');
  const [accountSel, setAccountSel] = React.useState(0);

  // Single read per render — reused by the keymap handlers below AND the
  // ACCOUNTS panel render further down (accountsVersion forces a re-render
  // after any write so this always reflects the file on disk).
  const accounts = listProviderAccounts();
  const accountSelClamped = Math.min(accountSel, Math.max(0, accounts.length - 1));
  void accountsVersion;

  useKeymap({
    tab: () => setFocus((f) => (f === 'theme' ? 'accounts' : 'theme')),
    j: () => {
      if (focus === 'accounts') setAccountSel((s) => Math.min(s + 1, accounts.length - 1));
      else cycleTheme(1);
    },
    k: () => {
      if (focus === 'accounts') setAccountSel((s) => Math.max(s - 1, 0));
      else cycleTheme(-1);
    },
    down: () => {
      if (focus === 'accounts') setAccountSel((s) => Math.min(s + 1, accounts.length - 1));
      else cycleTheme(1);
    },
    up: () => {
      if (focus === 'accounts') setAccountSel((s) => Math.max(s - 1, 0));
      else cycleTheme(-1);
    },
    return: () => {
      if (focus !== 'accounts') { setTheme(themeName); return; } // persists (already live-applied on cycle)
      const selected = accounts[accountSelClamped];
      if (!selected) {
        setAccountFlash({ ok: false, msg: 'no provider accounts — press a or m to add one first' });
        return;
      }
      if (accounts.length === 1) {
        setAccountFlash({ ok: true, msg: `${selected.name || selected.provider} is the only account — already active` });
        return;
      }
      const r = activateAccount(selected.id);
      setAccountFlash(r.ok
        ? { ok: true, msg: r.alreadyActive ? `${selected.name || selected.provider} is already active` : `activated: ${selected.name || selected.provider} (${r.accountId})` }
        : { ok: false, msg: `not activated: ${r.reason}` });
      setAccountsVersion((v) => v + 1);
    },
    // Provision an account from the environment — REAL write to settings.json
    // in the exact shape the vendored AgentManager queue reads. `a` targets
    // the Anthropic-compatible router (ANTHROPIC_AUTH_TOKEN/ANTHROPIC_BASE_URL);
    // `m` keeps the Moonshot (Kimi) path (MOONSHOT_API_KEY/…_BASE_URL).
    a: () => {
      const r = provisionAnthropicAccount();
      setAccountFlash(r.ok
        ? { ok: true, msg: `anthropic account ${r.updated ? 'updated' : 'added'}: ${r.accountId} → ${r.baseUrl}` }
        : { ok: false, msg: `not provisioned: ${r.reason}` });
      setAccountsVersion((v) => v + 1);
    },
    m: () => {
      const r = provisionMoonshotAccount();
      setAccountFlash(r.ok
        ? { ok: true, msg: `moonshot account ${r.updated ? 'updated' : 'added'}: ${r.accountId} → ${r.baseUrl}` }
        : { ok: false, msg: `not provisioned: ${r.reason}` });
      setAccountsVersion((v) => v + 1);
    },
  }, { isActive });

  const desktopSettings = readSettingsFile() ?? {};

  // D-A: the legacy top-level `provider`/`model` keys are almost never set —
  // real routing lives in `providerAccounts[]` + `globalPriorityOrder[]`
  // (written by account-service.ts). Reading only the legacy keys made a
  // fully-configured router render as "not configured" here while the
  // ACCOUNTS panel below correctly showed a live account. Resolve the
  // effective account the same way the vendored queue resolver would: the
  // head of `globalPriorityOrder`, falling back to the first provisioned
  // account, falling back to the legacy keys.
  const priorityOrder = Array.isArray(desktopSettings.globalPriorityOrder)
    ? (desktopSettings.globalPriorityOrder as unknown[]).map(String)
    : [];
  const effectiveAccount =
    (priorityOrder.length ? accounts.find((a) => a.id === priorityOrder[0]) : undefined) ??
    accounts[0];
  const legacyProvider = String(desktopSettings.provider ?? desktopSettings.apiProvider ?? '');
  const providerValue = effectiveAccount?.provider || legacyProvider || 'not configured';
  const providerConfigured = Boolean(effectiveAccount?.provider || legacyProvider);

  const legacyModel = String(desktopSettings.model ?? desktopSettings.defaultModel ?? '');
  let modelValue: string;
  if (process.env.APERANT_MODEL) {
    modelValue = `${process.env.APERANT_MODEL} (env APERANT_MODEL)`;
  } else if (process.env.ANTHROPIC_DEFAULT_SONNET_MODEL) {
    modelValue = `${process.env.ANTHROPIC_DEFAULT_SONNET_MODEL} (env ANTHROPIC_DEFAULT_SONNET_MODEL)`;
  } else if (legacyModel) {
    modelValue = `${legacyModel} (desktop settings)`;
  } else {
    modelValue = 'sonnet (default)';
  }

  const queueValue = effectiveAccount
    ? `${accounts.length} account${accounts.length === 1 ? '' : 's'} → ${effectiveAccount.baseUrl ?? 'no baseUrl'}`
    : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`;

  const rows: Array<[string, string, string]> = [
    ['tui config', getConfigPath(), c.faint],
    ['desktop settings', getSettingsPath(), c.faint],
    ['provider', providerValue, providerConfigured ? c.text : c.faint],
    ['model', modelValue, c.text],
    ['queue', queueValue, accounts.length ? c.text : c.faint],
  ];

  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="THEME" focused={focus === 'theme'} theme={c} flexGrow={1}>
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
        <Text color={c.dim}>tab focus · j/k select · applies live · persists to tui.json</Text>
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
        <Panel title="ACCOUNTS" focused={focus === 'accounts'} theme={c} flexGrow={1}>
          {accounts.length === 0 ? (
            <Text color={c.faint}>no provider accounts — press a (anthropic router) or m (moonshot) from env</Text>
          ) : (
            accounts.map((a, i) => {
              const cursored = focus === 'accounts' && i === accountSelClamped;
              const active = a.id === effectiveAccount?.id;
              return (
                <Text key={a.id} backgroundColor={cursored ? c.panelAlt : undefined} wrap="truncate-end">
                  <Text color={cursored ? c.accent : c.faint}>{cursored ? '❯ ' : '  '}</Text>
                  <Text color={c.accent2}>{a.provider.padEnd(10)}</Text>
                  <Text color={c.text}>{a.name.padEnd(22)}</Text>{' '}
                  <Text color={c.dim}>{a.hasKey ? 'configured' : 'no key'}</Text>{'  '}
                  <Text color={c.faint}>{a.baseUrl ?? ''}</Text>
                  {active ? <Text color={c.accent}>{'  ACTIVE'}</Text> : null}
                </Text>
              );
            })
          )}
          {accountFlash ? (
            <Text color={accountFlash.ok ? c.ok : c.err} wrap="truncate-end">{accountFlash.msg}</Text>
          ) : null}
          <Text color={c.dim}>tab focus · j/k select · ⏎ activate · a add Anthropic · m add Moonshot</Text>
        </Panel>
      </Box>
    </Box>
  );
}
