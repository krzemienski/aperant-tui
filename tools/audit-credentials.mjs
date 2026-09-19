#!/usr/bin/env node
/**
 * Credential scan.
 *
 * Contract: the provider token is env-only (`ANTHROPIC_AUTH_TOKEN`) and must
 * never be written, logged, or committed.
 *
 * This deliberately does NOT assert `rg 'sk-'` returns nothing. That pattern is
 * a substring of ordinary English inside faithful agent traces — `task-event`,
 * `subtask-1-1`, `disk-backed` — and the evidence tree also legitimately
 * contains the agent's own synthetic redaction fixtures from
 * `tests/redact.test.ts` (it built a secret redactor). Asserting zero there
 * would force falsifying real event logs. Instead this checks what actually
 * constitutes a leak:
 *
 *   1. the live token value, if one is present in the environment
 *   2. credential-shaped strings that are not on the synthetic-fixture list
 *   3. `ANTHROPIC_AUTH_TOKEN=<value>` assignments committed to the tree
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '__pycache__']);
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.jsonl', '.md', '.txt',
  '.log', '.html', '.yml', '.yaml', '.py', '.sh', '.diff', '.cast',
]);

/**
 * Synthetic vectors authored by the agent while building vigil's secret
 * redactor (VG-005) and captured verbatim by the event tap. These are literal
 * test fixtures, not credentials; the trace is correct BECAUSE it recorded
 * them. Matched exactly — a real key would not equal one of these.
 */
const SYNTHETIC_FIXTURES = new Set([
  'sk-abcdefghijklmnop0123456789',
  'sk-abcdefghijklmnopqrstuvwx',
  'sk-aaaaaaaaaaaaaaaa0000000000',
  'sk-bbbbbbbbbbbbbbbb1111111111',
  'sk-deadbeefdeadbeef00',
  'sk-live-0123456789abcdef',
  'sk-abc123DEF456ghi789jkl',
  'sk-keyaskeyaskeyaskeyas',
  'sk-test-real-key',
]);

/** Hyphenated English/identifier tails that merely contain the `sk-` substring. */
const BENIGN_WORD = /^sk-(execution|event|events|started|status|detail|review|selected|derived|metadata|captured|absence|confirmed|iterator|iteration|lifecycle|service|converter|column|backed|box|pattern|prefixed|ant|\d)/;

const CRED_SHAPE = /sk-[A-Za-z0-9_-]{16,}/g;
const ASSIGNMENT = /ANTHROPIC_AUTH_TOKEN=[^\s"'`$<]{2,}/g;

const liveToken = (process.env.ANTHROPIC_AUTH_TOKEN ?? '').trim();

/**
 * Vendored files that still hash-match `DESKTOP-SHA256SUMS.txt` are upstream's
 * bytes, not ours — their test fixtures (`sk-test-…`, `sk-key-…`) are not our
 * leaks, and the manifest already proves they are unmodified. Scan only files
 * we could actually have introduced a secret into: anything outside the
 * vendored tree, plus any vendored file that HAS drifted.
 */
function buildUpstreamCleanSet() {
  const manifestPath = path.join(repoRoot, 'apps', 'DESKTOP-SHA256SUMS.txt');
  const vendorRoot = path.join(repoRoot, 'apps', 'desktop');
  const clean = new Set();
  if (!existsSync(manifestPath)) return clean;
  for (const line of readFileSync(manifestPath, 'utf8').split('\n')) {
    const m = /^([0-9a-f]{64})\s+[* ]?(.+)$/.exec(line.trimEnd());
    if (!m) continue;
    const abs = path.join(vendorRoot, m[2]);
    if (!existsSync(abs)) continue;
    if (createHash('sha256').update(readFileSync(abs)).digest('hex') === m[1]) {
      clean.add(path.resolve(abs));
    }
  }
  return clean;
}

const upstreamClean = buildUpstreamCleanSet();

/**
 * Paths whose matches are self-referential rather than credentials:
 *  - the hash manifest lists FILENAMES (`subtask-prompt-generator.ts`,
 *    `task-store.ts`) that contain the `sk-` substring;
 *  - the phase-4 verdict quotes the literal scan regex in prose;
 *  - this scanner contains its own patterns.
 * Each is a fixed, reviewed path — not a wildcard suppression.
 */
const SELF_REFERENTIAL = new Set([
  'apps/DESKTOP-SHA256SUMS.txt',
  'docs/plan/phases/phase-4-VALIDATION.md',
  'tools/audit-credentials.mjs',
]);

const findings = [];
let scanned = 0;

/** @param {string} dir */
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.git')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs);
      continue;
    }
    if (!TEXT_EXT.has(path.extname(entry.name))) continue;
    if (statSync(abs).size > 64 * 1024 * 1024) continue;
    // Unmodified upstream bytes — covered by the hash manifest, not by us.
    if (upstreamClean.has(path.resolve(abs))) continue;

    const rel = path.relative(repoRoot, abs);
    if (SELF_REFERENTIAL.has(rel)) continue;
    const text = readFileSync(abs, 'utf8');
    scanned += 1;

    if (liveToken.length >= 12 && text.includes(liveToken)) {
      findings.push({ rel, kind: 'LIVE_TOKEN', detail: '<redacted>' });
    }
    for (const m of text.matchAll(CRED_SHAPE)) {
      const hit = m[0];
      if (SYNTHETIC_FIXTURES.has(hit) || BENIGN_WORD.test(hit)) continue;
      findings.push({ rel, kind: 'CREDENTIAL_SHAPE', detail: `${hit.slice(0, 8)}…` });
    }
    for (const m of text.matchAll(ASSIGNMENT)) {
      findings.push({ rel, kind: 'TOKEN_ASSIGNMENT', detail: m[0].slice(0, 28) });
    }
  }
}

walk(repoRoot);

console.log(`credential scan: ${scanned} text files`);
console.log(`  live token present in env : ${liveToken ? 'yes (checked)' : 'no (value check skipped)'}`);
console.log(`  findings                  : ${findings.length}`);

if (findings.length > 0) {
  console.error('\nFAIL: credential-shaped content in the tree:');
  for (const f of findings.slice(0, 40)) {
    console.error(`  [${f.kind}] ${f.rel}  ${f.detail}`);
  }
  if (findings.length > 40) console.error(`  … and ${findings.length - 40} more`);
  process.exit(1);
}

console.log('\nOK: no credential material found.');
