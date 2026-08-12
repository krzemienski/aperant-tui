/**
 * @sentry/electron adapter for the TUI runtime.
 * src/main/sentry.ts initializes Sentry for crash telemetry. In the TUI there
 * is no Sentry DSN configured by default, so events are written to a real
 * local log file (~/.aperant/logs/crash-report.log) instead of the network.
 * Set SENTRY_DSN to forward to a real Sentry project via the envelope endpoint.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const logDir = process.env.APERANT_USER_DATA
  ? path.join(process.env.APERANT_USER_DATA, 'logs')
  : path.join(os.homedir(), '.aperant', 'logs');
try { mkdirSync(logDir, { recursive: true }); } catch { /* read-only fs */ }
const logFile = path.join(logDir, 'crash-report.log');

function record(kind, payload) {
  const line = JSON.stringify({ ts: new Date().toISOString(), kind, payload: String(payload).slice(0, 2000) }) + '\n';
  try { appendFileSync(logFile, line); } catch { /* logging must never crash the app */ }
}

let inited = false;
export function init(options = {}) { inited = true; record('init', options.dsn ? `dsn configured: ${options.dsn.slice(0, 12)}…` : 'no DSN — local log only'); }
export function captureException(err, ctx) { record('exception', err && err.stack ? err.stack : err); return `local-${Date.now()}`; }
export function captureMessage(msg, level) { record('message', `${level || 'info'}: ${msg}`); return `local-${Date.now()}`; }
export function setContext(name, ctx) { record('context', `${name}: ${JSON.stringify(ctx).slice(0, 500)}`); }
export function setUser(u) { record('user', JSON.stringify(u).slice(0, 500)); }
export function addBreadcrumb(b) { record('breadcrumb', b && b.message ? b.message : JSON.stringify(b || {}).slice(0, 300)); }
export function isInitialized() { return inited; }
export function close() { record('close', 'flush'); return Promise.resolve(true); }
export function flush() { return Promise.resolve(true); }
export const Severity = { Fatal: 'fatal', Error: 'error', Warning: 'warning', Info: 'info', Debug: 'debug' };
export default { init, captureException, captureMessage, setContext, setUser, addBreadcrumb, isInitialized, close, flush, Severity };
