#!/usr/bin/env node
/**
 * Bundle the vendored agent worker (apps/desktop/src/main/ai/agent/worker.ts)
 * into a single CJS file the TUI can hand to node:worker_threads.
 *
 * The vendored resolveWorkerPath() expects an electron-vite build output that
 * does not exist in the TUI; the [APERANT-PATCH worker-path] env override
 * (APERANT_WORKER_PATH) points at the artifact this script produces:
 *   apps/tui/dist/agent-worker.cjs
 *
 * Native / non-bundlable modules stay external and resolve from the workspace
 * root node_modules at runtime.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'apps/tui/dist/agent-worker.cjs');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

// electron is shimmed in the TUI; alias it to the shim so the bundle gets the
// same app.getPath behavior the rest of the TUI runtime uses.
const electronShim = path.join(root, 'libs/electron-shim/index.js');
// @sentry/electron is likewise adapter-backed
const sentryAdapter = path.join(root, 'libs/sentry-adapter/index.js');

await build({
  entryPoints: [path.join(root, 'apps/desktop/src/main/ai/agent/worker.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: false,
  logLevel: 'info',
  alias: {
    electron: electronShim,
    '@sentry/electron': sentryAdapter,
  },
  external: [
    // native modules — resolve from root node_modules at runtime
    '@libsql/client',
    'node-pty',
    'better-sqlite3',
    'sharp',
    'fsevents',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

const stat = fs.statSync(outFile);
console.log(`worker bundle: ${outFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
