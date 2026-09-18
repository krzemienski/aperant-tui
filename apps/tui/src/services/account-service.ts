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

export type ActivateResult =
  | { ok: true; accountId: string; alreadyActive: boolean }
  | { ok: false; reason: string };

export interface AccountView {
  id: string;
  provider: string;
  name: string;
  baseUrl?: string;
  hasKey: boolean;
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
 * Ids are minted from the clock, so two adds inside one millisecond would
 * collide — harmless while appends were unreachable, a real id clash now
 * that they are. Suffix on collision instead of handing back a duplicate id.
 */
function mintAccountId(accounts: Array<Record<string, unknown>>, provider: string, now: number): string {
  const base = `${provider}-${now.toString(36)}`;
  if (!accounts.some((a) => String(a.id) === base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!accounts.some((a) => String(a.id) === candidate)) return candidate;
  }
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
  // F-18: identity is (provider, baseUrl), not provider alone. Matching on
  // provider alone made the second add of a family overwrite the first in
  // place, so an operator running two routers of the same family had no way
  // to hold both. Same endpoint still updates in place (keeping its id and
  // its slot in globalPriorityOrder); only a new endpoint appends.
  const existing = accounts.find((a) => a.provider === 'moonshot' && String(a.baseUrl ?? '') === baseUrl);

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
    accountId = mintAccountId(accounts, 'moonshot', now);
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

const ANTHROPIC_DEFAULT_BASE_URL = 'https://router.hack.ski/v1';

/**
 * Provision (or update) an Anthropic-compatible router account from explicit
 * input, falling back to the environment:
 *   ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL (token via env only — never
 *   written into settings.json; the caller must keep ANTHROPIC_AUTH_TOKEN
 *   exported in the TUI process for every live call).
 */
export function provisionAnthropicAccount(
  input: { apiKey?: string; baseUrl?: string; name?: string } = {},
): ProvisionResult {
  const apiKey = (input.apiKey ?? process.env.ANTHROPIC_AUTH_TOKEN ?? '').trim();
  // The @ai-sdk/anthropic client appends '/messages' to baseURL, so the
  // account must carry the '/v1' root the router serves (curl-proofed:
  // https://router.hack.ski/v1/messages → 200).
  const rawBaseUrl = (input.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? ANTHROPIC_DEFAULT_BASE_URL).trim();
  const baseUrl = /\/v\d+$/.test(rawBaseUrl) ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/v1`;

  if (!apiKey) {
    return { ok: false, reason: 'no token — set ANTHROPIC_AUTH_TOKEN in the environment' };
  }
  if (apiKey.length < 8 || /\s/.test(apiKey)) {
    return { ok: false, reason: 'token looks malformed (too short or contains whitespace) — refusing to write' };
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    return { ok: false, reason: `base URL must be http(s), got "${baseUrl}"` };
  }

  const settingsPath = getSettingsPath();
  const read = readSettingsRaw(settingsPath);
  if (!read.ok) return { ok: false, reason: read.reason };
  const settings = read.settings;

  const accounts = Array.isArray(settings.providerAccounts)
    ? (settings.providerAccounts as Array<Record<string, unknown>>)
    : [];
  const now = Date.now();
  // F-18: see the moonshot twin above — identity is (provider, baseUrl).
  // An operator with one Anthropic-compatible router who adds a second must
  // end up with two accounts, not one clobbered account.
  const existing = accounts.find((a) => a.provider === 'anthropic' && String(a.baseUrl ?? '') === baseUrl);

  let accountId: string;
  let updated = false;
  if (existing) {
    existing.apiKey = apiKey;
    existing.baseUrl = baseUrl;
    existing.updatedAt = now;
    accountId = String(existing.id);
    updated = true;
  } else {
    accountId = mintAccountId(accounts, 'anthropic', now);
    accounts.push({
      id: accountId,
      provider: 'anthropic',
      name: input.name ?? 'Anthropic (operator router)',
      authType: 'api-key',
      billingModel: 'pay-per-use',
      apiKey,
      baseUrl,
      createdAt: now,
      updatedAt: now,
    });
  }
  settings.providerAccounts = accounts;

  const order = Array.isArray(settings.globalPriorityOrder)
    ? (settings.globalPriorityOrder as string[])
    : [];
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
    // P6.2: never surface even a prefix of the key — a boolean is the only
    // credential-existence signal this view model exposes.
    return {
      id: String(a.id ?? ''),
      provider: String(a.provider ?? '?'),
      name: String(a.name ?? ''),
      baseUrl: typeof a.baseUrl === 'string' ? a.baseUrl : undefined,
      hasKey: typeof a.apiKey === 'string' && a.apiKey.length > 0,
    };
  });
}

/**
 * P6.2: "active account" is defined as whichever provisioned account sits
 * at the HEAD of `globalPriorityOrder` in settings.json — this is the exact
 * contract the vendored queue resolver honors (see
 * apps/desktop/src/main/ai/auth/resolver.ts:buildDefaultQueueConfig — it
 * sorts `providerAccounts` by index-in-`globalPriorityOrder`, treating
 * absence as `Infinity` so unlisted accounts sort last, and hands the
 * sorted queue to `resolveAuthFromQueue`, which tries accounts in that
 * order). Activating an account therefore means rewriting
 * `globalPriorityOrder` so that account's id is first — nothing else about
 * the account (its key, its baseUrl) changes.
 *
 * Reuses the same atomic tmp-file+rename write as provisionAnthropicAccount
 * / provisionMoonshotAccount so a crash mid-write can never corrupt
 * settings.json.
 */
export function activateAccount(accountId: string): ActivateResult {
  if (!accountId) {
    return { ok: false, reason: 'no account id given' };
  }

  const settingsPath = getSettingsPath();
  const read = readSettingsRaw(settingsPath);
  if (!read.ok) return { ok: false, reason: read.reason };
  const settings = read.settings;

  const accounts = Array.isArray(settings.providerAccounts)
    ? (settings.providerAccounts as Array<Record<string, unknown>>)
    : [];
  const target = accounts.find((a) => String(a.id ?? '') === accountId);
  if (!target) {
    return { ok: false, reason: `no provider account with id "${accountId}"` };
  }

  const order = Array.isArray(settings.globalPriorityOrder)
    ? (settings.globalPriorityOrder as unknown[]).map(String)
    : [];
  const alreadyActive = order.length > 0 && order[0] === accountId;
  if (alreadyActive) {
    return { ok: true, accountId, alreadyActive: true };
  }

  settings.globalPriorityOrder = [accountId, ...order.filter((id) => id !== accountId)];

  try {
    writeSettingsAtomic(settingsPath, settings);
  } catch (err) {
    return { ok: false, reason: `failed to write settings.json: ${err instanceof Error ? err.message : String(err)}` };
  }
  return { ok: true, accountId, alreadyActive: false };
}
