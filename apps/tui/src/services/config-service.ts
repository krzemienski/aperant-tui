/**
 * TUI config: ~/.aperant/tui.json — real load/save with zod validation.
 * Malformed config fails clearly: parse error is surfaced, config reset to
 * defaults, and the broken file is preserved as tui.json.broken-<ts>.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';

const KeymapSchema = z.record(z.string(), z.string());
export const TuiConfigSchema = z.object({
  theme: z.string().default('cyberpunk'),
  scrollbackLines: z.number().int().positive().max(100000).default(10000),
  keymap: KeymapSchema.default({}),
  recentProjects: z.array(z.string()).default([]),
});
export type TuiConfig = z.infer<typeof TuiConfigSchema>;

export function getConfigPath(): string {
  const base = process.env.APERANT_USER_DATA || path.join(os.homedir(), '.aperant');
  return path.join(base, 'tui.json');
}

export class ConfigError extends Error {}

export function loadConfig(): TuiConfig {
  const p = getConfigPath();
  if (!fs.existsSync(p)) return TuiConfigSchema.parse({});
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    const brokenPath = `${p}.broken-${Date.now()}`;
    fs.renameSync(p, brokenPath);
    throw new ConfigError(
      `TUI config at ${p} is not valid JSON (${(err as Error).message}). ` +
      `Moved to ${brokenPath}; starting with defaults.`
    );
  }
  const parsed = TuiConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ConfigError(`TUI config at ${p} failed validation: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}

export function saveConfig(cfg: TuiConfig): void {
  const p = getConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n');
  fs.renameSync(tmp, p); // atomic on POSIX
}

export function updateConfig(patch: Partial<TuiConfig>): TuiConfig {
  let cfg: TuiConfig;
  try { cfg = loadConfig(); } catch { cfg = TuiConfigSchema.parse({}); }
  const next = TuiConfigSchema.parse({ ...cfg, ...patch });
  saveConfig(next);
  return next;
}
