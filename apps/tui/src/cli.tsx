#!/usr/bin/env node
/**
 * aperant — TUI entry point.
 *   aperant [path]        open a project (default: cwd)
 *   aperant --version     print version
 *   aperant --help        usage
 */
import React from 'react';
import { render } from 'ink';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { App } from './App';

// The vendored pty-manager spawns process.env.SHELL || '/bin/zsh' on Unix.
// Headless/minimal environments often have SHELL unset and no zsh — which
// would spawn a nonexistent binary and the pane would exit instantly.
// Normalize ONCE here (our process env, not vendored code): first real shell wins.
if (!process.env.SHELL || !fs.existsSync(process.env.SHELL)) {
  for (const cand of ['/bin/bash', '/bin/sh', '/bin/zsh']) {
    if (fs.existsSync(cand)) { process.env.SHELL = cand; break; }
  }
}

// Point the vendored worker-bridge at the esbuild-bundled agent worker
// (tools/build-worker.mjs). The vendored default path expects an
// electron-vite build tree that does not exist in the TUI runtime.
// NOTE: ESM-safe — __dirname does not exist under tsx ESM (gate D6 catch).
if (!process.env.APERANT_WORKER_PATH) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, '../dist/agent-worker.cjs');
  if (fs.existsSync(candidate)) process.env.APERANT_WORKER_PATH = candidate;
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`aperant — Aperant terminal UI

usage: aperant [path-to-project]

keys: 1-7 switch views · j/k navigate · ':' command palette · '?' help · ctrl+c ×2 quit
config: ~/.aperant/tui.json`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('aperant-tui 0.1.0 (agent runtime: vendored Aperant 2.8.0-beta.6 + aperant patches, TypeScript/AI SDK v7)');
  process.exit(0);
}

if (!process.stdout.isTTY) {
  console.error('aperant requires a TTY. Run it in a real terminal (not a pipe).');
  process.exit(2);
}

// D21: in a TUI the terminal IS the render target — anything written outside
// Ink's frame corrupts the display. The AI SDK logs a multi-line warning for
// every call made with a model id it does not recognise (any router/proxy id),
// which scrolls the whole frame off-screen mid-session. Warnings are still
// available to the app: real failures arrive as `error` stream events and are
// rendered in-frame, and the durable record is the flight recorder at
// $APERANT_USER_DATA/logs/agent-events.jsonl.
// `as` is correct here: this is a documented AI SDK global (ai/dist/index.js:616
// reads globalThis.AI_SDK_LOG_WARNINGS) that the ambient globalThis type does
// not declare. Nothing is read back, so there is no shape to validate.
const sdkGlobals = globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean };
sdkGlobals.AI_SDK_LOG_WARNINGS = false;

const positional = args.filter((a) => !a.startsWith('-'));
const projectPath = path.resolve(positional[0] ?? process.cwd());

const { waitUntilExit } = render(<App projectPath={projectPath} />, { exitOnCtrlC: false });
waitUntilExit().then(() => process.exit(0));
