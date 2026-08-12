#!/usr/bin/env node
/**
 * Bundle the TUI entry (apps/tui/src/cli.tsx) + the vendored agent runtime
 * into dist/cli.js — a single CJS executable for `aperant` (npm start, and
 * the Phase 8 npm-distribution path).
 *
 * Same conventions as tools/build-worker.mjs: electron and @sentry/electron
 * are aliased to the TUI shims; native modules stay external.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'apps/tui/dist/cli.mjs');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [path.join(root, 'apps/tui/src/cli.tsx')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  logLevel: 'info',
  banner: {
    // CJS deps (signal-exit & co.) call require() at runtime; give the ESM
    // bundle a real createRequire so those resolves work.
    js: "import { createRequire as __aperantCreateRequire } from 'node:module'; const require = __aperantCreateRequire(import.meta.url);",
  },
  alias: {
    electron: path.join(root, 'libs/electron-shim/index.js'),
    '@sentry/electron': path.join(root, 'libs/sentry-adapter/index.js'),
    '@sentry/electron/main': path.join(root, 'libs/sentry-adapter/index.js'),
    '@sentry/electron/renderer': path.join(root, 'libs/sentry-adapter/index.js'),
    '@sentry/electron/preload': path.join(root, 'libs/sentry-adapter/index.js'),
  },
  external: [
    '@libsql/client',
    'node-pty',
    'better-sqlite3',
    'sharp',
    'fsevents',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    // ink's devtools import sits behind `process.env.DEV === 'true'`;
    // statically false here so esbuild eliminates the dev-only branch
    // (react-devtools-core is a browser-only package) instead of bundling it.
    'process.env.DEV': 'false',
  },
});

fs.chmodSync(outFile, 0o755);
const stat = fs.statSync(outFile);
console.log(`cli bundle: ${outFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
