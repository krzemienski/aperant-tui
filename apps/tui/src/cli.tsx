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
import { format } from 'node:util';
import { fileURLToPath } from 'node:url';
import { App } from './App';
import { getAgentEventLogPath } from './services/agent-start-service';
import { appendEventLine } from './services/event-log';

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

// D22: vendored runtime logging writes directly to console.* during a run,
// but in a TUI the terminal IS the render target — those writes paint over
// Ink's frame. Preserve every call in the same append-only flight recorder
// instead of deleting or weakening the vendored diagnostics. `util.format`
// matches Node console formatting, including useful object inspection for
// multi-argument calls. Set APERANT_RAW_CONSOLE to bypass this guard while
// debugging; Ink's console patching is disabled in that mode as well.
function installConsoleInterceptor(): () => void {
  const originals = {
    log: console.log, info: console.info, warn: console.warn,
    debug: console.debug, error: console.error,
  };
  const levels = ['log', 'info', 'warn', 'debug', 'error'] as const;
  let writing = false;
  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      // A custom object inspector may itself log while util.format runs.
      if (writing) return;
      writing = true;
      try {
        const message = format(...args);
        const record = JSON.stringify({
          ts: new Date().toISOString(), event: 'console', taskId: null,
          level, message, payload: [message],
        }) + '\n';
        const logPath = getAgentEventLogPath();
        appendEventLine(logPath, record);
      } catch {
        /* logging must never crash the app or recurse into console */
      } finally {
        writing = false;
      }
    };
  }
  return () => {
    for (const level of levels) console[level] = originals[level];
  };
}

const positional = args.filter((a) => !a.startsWith('-'));
const projectPath = path.resolve(positional[0] ?? process.cwd());

const rawConsole = process.env.APERANT_RAW_CONSOLE !== undefined;
const restoreConsole = rawConsole ? undefined : installConsoleInterceptor();
let waitUntilExit: () => Promise<void>;
try {
  // Ink's own console patch would replace the interceptor and write to the
  // terminal again. The entrypoint owns console routing in both modes.
  ({ waitUntilExit } = render(<App projectPath={projectPath} />, {
    exitOnCtrlC: false, patchConsole: false,
  }));
} catch (error) {
  // Restore before reporting a synchronous render failure or fatal Ink exit;
  // ordinary runtime diagnostics stay in the log while the frame is alive.
  restoreConsole?.();
  console.error(error);
  process.exit(1);
}

waitUntilExit().then(
  () => {
    restoreConsole?.();
    process.exit(0);
  },
  (error: unknown) => {
    restoreConsole?.();
    console.error(error);
    process.exit(1);
  },
);
