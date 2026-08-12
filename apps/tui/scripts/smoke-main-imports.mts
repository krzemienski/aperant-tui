/**
 * Phase 1 smoke proof: import the vendored agent-runtime modules UNMODIFIED
 * in a plain Node 20 process (no Electron) and call real functions.
 *
 * Run: npx tsx apps/tui/scripts/smoke-main-imports.mts
 * Exit 0 = every import + call succeeded; exit 1 with the failing module.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Isolate userData per smoke run so it is observable and side-effect free.
const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aperant-smoke-'));
process.env.APERANT_USER_DATA = path.join(runDir, 'userData');

const results: Array<{ module: string; ok: boolean; detail: string }> = [];

async function probe(name: string, fn: () => Promise<string>): Promise<void> {
  try {
    results.push({ module: name, ok: true, detail: await fn() });
  } catch (err) {
    results.push({ module: name, ok: false, detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
  }
}

await probe('@main/settings-utils', async () => {
  const su = await import('@main/settings-utils');
  const p = su.getSettingsPath();
  if (!p.startsWith(runDir)) throw new Error(`settings path not under run dir: ${p}`);
  su.writeSettingsFile({ smoke: true, ts: Date.now() });
  const back = su.readSettingsFile();
  if (back?.smoke !== true) throw new Error('settings round-trip mismatch');
  return `settings round-trip OK at ${p}`;
});

await probe('@main/project-store', async () => {
  const ps = await import('@main/project-store');
  const store = ps.projectStore;
  const projects = store.getProjects();
  if (!Array.isArray(projects)) throw new Error('getProjects did not return an array');
  return `projectStore.getProjects() -> ${projects.length} projects (real store at ${runDir})`;
});

await probe('@main/rate-limit-detector', async () => {
  const rld = await import('@main/rate-limit-detector');
  const hit = rld.isRateLimitError('Claude AI usage limit reached. Your limit will reset at 3pm.');
  const miss = rld.isRateLimitError('all systems nominal');
  if (hit !== true || miss !== false) throw new Error(`detector wrong: hit=${hit} miss=${miss}`);
  return `rate-limit detector real parse: hit=${hit}, miss=${miss}`;
});

await probe('@main/task-log-service', async () => {
  const tls = await import('@main/task-log-service');
  if (typeof tls.taskLogService.on !== 'function') throw new Error('not an EventEmitter');
  return 'taskLogService singleton constructed (EventEmitter)';
});

await probe('@main/terminal/pty-manager', async () => {
  const pm = await import('@main/terminal/pty-manager');
  const fns = Object.keys(pm).filter((k) => typeof (pm as Record<string, unknown>)[k] === 'function');
  if (!fns.length) throw new Error('no exported functions');
  return `pty-manager exports: ${fns.slice(0, 6).join(', ')}${fns.length > 6 ? '…' : ''}`;
});

await probe('@shared/state-machines (XState taskMachine)', async () => {
  const sm = await import('@shared/state-machines');
  const { createActor } = await import('xstate');
  const actor = createActor(sm.taskMachine, { input: undefined } as never);
  actor.start();
  const snap = actor.getSnapshot();
  actor.stop();
  return `taskMachine starts in state: ${JSON.stringify(snap.value)}`;
});

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.module}\n      ${r.detail}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} modules import and execute unmodified under Node ${process.version}`);
process.exit(failed ? 1 : 0);
