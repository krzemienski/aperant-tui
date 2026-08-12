/**
 * Account service — REAL provider-account provisioning for the TUI.
 *
 * Writes genuine ProviderAccount entries into the vendored settings file
 * ($APERANT_USER_DATA/settings.json) in the exact shape the vendored
 * AgentManager queue resolver reads (`providerAccounts` + `globalPriorityOrder`).
 *
 * The first supported provider is Moonshot AI (Kimi) — via the
 * @aperant/moonshot-provider package — targeting either the public Moonshot
 * platform (https://api.moonshot.ai/v1) or a Kimi agent-gw deployment.
 *
 * Safety contract:
 *  - missing/empty credentials → typed error result, nothing written
 *  - corrupt existing settings.json → typed error result, file left untouched
 *  - writes are atomic (tmp file + rename)
 *  - keys are never logged or returned by listProviderAccounts()
 */
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { getSettingsPath } from '@main/settings-utils';

export interface MoonshotProvisionInput {
  apiKey?: string;
  baseUrl?: string;
  kimiChatId?: string;
  name?: string;
}

export type ProvisionResult =
  | { ok: true; accountId: string; baseUrl: string; updated: boolean }
  | { ok: false; reason: string };

export interface AccountView {
  id: string;
  provider: string;
  name: string;
  baseUrl?: string;
  hasKey: boolean;
  keyPreview?: string; // first 7 chars + '…' — never the full key
}

const MOONSHOT_DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';

function readSettingsRaw(settingsPath: string): { ok: true; settings: Record<string, unknown> } | { ok: false; reason: string } {
  if (!existsSync(settingsPath)) return { ok: true, settings: {} };
  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, reason: `settings.json is not a JSON object (${settingsPath})` };
    }
    return { ok: true, settings: parsed as Record<string, unknown> };
  } catch (err) {
    return { ok: false, reason: `settings.json unreadable/corrupt: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function writeSettingsAtomic(settingsPath: string, settings: Record<string, unknown>): void {
  mkdirSync(path.dirname(settingsPath), { recursive: true });
  const tmp = `${settingsPath}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf-8');
  renameSync(tmp, settingsPath);
}

/**
 * Provision (or update) a Moonshot provider account from explicit input,
 * falling back to environment variables:
 *   MOONSHOT_API_KEY / MOONSHOT_BASE_URL / KIMI_API_KEY / KIMI_BASE_URL / KIMI_CHAT_ID
 */
export function provisionMoonshotAccount(input: MoonshotProvisionInput = {}): ProvisionResult {
  const apiKey = (input.apiKey ?? process.env.MOONSHOT_API_KEY ?? process.env.KIMI_API_KEY ?? '').trim();
  const baseUrl = (input.baseUrl ?? process.env.MOONSHOT_BASE_URL ?? process.env.KIMI_BASE_URL ?? MOONSHOT_DEFAULT_BASE_URL).trim();
  const kimiChatId = (input.kimiChatId ?? process.env.KIMI_CHAT_ID ?? '').trim() || undefined;

  if (!apiKey) {
    return { ok: false, reason: 'no API key — set MOONSHOT_API_KEY (or KIMI_API_KEY for agent-gw)' };
  }
  if (apiKey.length < 8 || /\s/.test(apiKey)) {
    return { ok: false, reason: 'API key looks malformed (too short or contains whitespace) — refusing to write' };
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    return { ok: false, reason: `base URL must be http(s), got "${baseUrl}"` };
  }

  const settingsPath = getSettingsPath();
  const read = readSettingsRaw(settingsPath);
  if (!read.ok) return { ok: false, reason: read.reason };
  const settings = read.settings;

  const accounts = Array.isArray(settings.providerAccounts) ? (settings.providerAccounts as Array<Record<string, unknown>>) : [];
  const now = Date.now();
  const existing = accounts.find((a) => a.provider === 'moonshot');

  let accountId: string;
  let updated = false;
  if (existing) {
    existing.apiKey = apiKey;
    existing.baseUrl = baseUrl;
    if (kimiChatId) existing.kimiChatId = kimiChatId;
    existing.updatedAt = now;
    accountId = String(existing.id);
    updated = true;
  } else {
    accountId = `moonshot-${now.toString(36)}`;
    accounts.push({
      id: accountId,
      provider: 'moonshot',
      name: input.name ?? (baseUrl.includes('agent-gw') ? 'Kimi (agent-gw)' : 'Moonshot AI (Kimi)'),
      authType: 'api-key',
      billingModel: 'pay-per-use',
      apiKey,
      baseUrl,
      ...(kimiChatId ? { kimiChatId } : {}),
      createdAt: now,
      updatedAt: now,
    });
  }
  settings.providerAccounts = accounts;

  const order = Array.isArray(settings.globalPriorityOrder) ? (settings.globalPriorityOrder as string[]) : [];
  settings.globalPriorityOrder = [accountId, ...order.filter((id) => id !== accountId)];

  try {
    writeSettingsAtomic(settingsPath, settings);
  } catch (err) {
    return { ok: false, reason: `failed to write settings.json: ${err instanceof Error ? err.message : String(err)}` };
  }
  return { ok: true, accountId, baseUrl, updated };
}

/** List configured provider accounts without exposing credentials. */
export function listProviderAccounts(): AccountView[] {
  const settingsPath = getSettingsPath();
  const read = readSettingsRaw(settingsPath);
  if (!read.ok) return [];
  const accounts = Array.isArray(read.settings.providerAccounts)
    ? (read.settings.providerAccounts as Array<Record<string, unknown>>)
    : [];
  return accounts.map((a) => {
    const key = typeof a.apiKey === 'string' ? a.apiKey : '';
    return {
      id: String(a.id ?? ''),
      provider: String(a.provider ?? '?'),
      name: String(a.name ?? ''),
      baseUrl: typeof a.baseUrl === 'string' ? a.baseUrl : undefined,
      hasKey: key.length > 0,
      keyPreview: key ? `${key.slice(0, 7)}…` : undefined,
    };
  });
}
