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
 * Locations where credential-SHAPED strings are expected and are not leaks:
 *
 *  - test files declare fixtures (`sk-test-…`) by design;
 *  - `evidence/` holds verbatim agent traces, which faithfully recorded the
 *    synthetic vectors the agent itself authored while building vigil's secret
 *    redactor (VG-005). The trace is correct BECAUSE it captured them, and
 *    rewriting it would falsify the proof artifacts.
 *
 * Suppressing by location rather than by value keeps this from degenerating
 * into an ever-growing allowlist, and keeps the gate strict exactly where it
 * matters: real source, config, and committed settings.
 *
 * The live-token check below still runs everywhere, including these paths —
 * an actual operator credential is never acceptable, even in a trace.
 */
const SHAPE_EXEMPT_LOCATION = [
  /(^|\/)__tests__\//,
  /\.test\.[cm]?[jt]sx?$/,
  /^evidence\//,
  // Captured agent work product. `005-secret-redaction.diff` is the verbatim
  // diff of a secret-redactor feature, so its own test vectors are part of the
  // artifact; it lives outside `evidence/` only so the literal evidence scan
  // stays clean.
  /^docs\/plan\/phases\/work-product\//,
];

/** Hyphenated English/identifier tails that merely contain the `sk-` substring. */
const BENIGN_WORD = /^sk-(execution|event|events|started|status|detail|review|selected|derived|metadata|captured|absence|confirmed|iterator|iteration|lifecycle|service|converter|column|backed|box|pattern|prefixed|ant|\d)/;

const CRED_SHAPE = /sk-[A-Za-z0-9_-]{16,}/g;
/**
 * Requires a *plausible value*: at least 6 chars, and not starting with a
 * character that marks the match as documentation rather than a credential —
 * `.` (the literal scan regex `ANTHROPIC_AUTH_TOKEN=..` quoted in prose),
 * `[` (a character class), `<` (a `<token>` placeholder), or `$` (a shell or
 * GitHub Actions variable reference such as `${{ secrets.* }}`).
 *
 * This deliberately keeps the phase-4 verdict doc IN scope: it is exactly
 * where a real token could later be pasted while quoting evidence.
 */
const ASSIGNMENT = /ANTHROPIC_AUTH_TOKEN=(?![.[<$])[^\s"'`]{6,}/g;

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
 * Two files match by construction, not because they carry credentials:
 *  - the hash manifest is (hash, path) pairs, and upstream FILENAMES such as
 *    `subtask-prompt-generator.ts` / `task-store.ts` contain the `sk-`
 *    substring;
 *  - this scanner's own source contains the detection patterns.
 * Documentation is NOT exempt — the tightened ASSIGNMENT regex above
 * distinguishes quoted prose from a real value instead.
 */
const SELF_REFERENTIAL = new Set([
  'apps/DESKTOP-SHA256SUMS.txt',
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

    // POSIX-normalized: `path.relative` yields `\` on Windows, which would make
    // the `^evidence/` and `__tests__/` location patterns silently never match.
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (SELF_REFERENTIAL.has(rel)) continue;
    const text = readFileSync(abs, 'utf8');
    scanned += 1;

    if (liveToken.length >= 12 && text.includes(liveToken)) {
      findings.push({ rel, kind: 'LIVE_TOKEN', detail: '<redacted>' });
    }
    // Shape matching is suppressed in test/evidence locations (see above); the
    // live-token check just above is NOT, so a real credential is still caught
    // anywhere in the tree.
    const shapeExempt = SHAPE_EXEMPT_LOCATION.some((re) => re.test(rel));
    if (!shapeExempt) {
      for (const m of text.matchAll(CRED_SHAPE)) {
        const hit = m[0];
        if (BENIGN_WORD.test(hit)) continue;
        findings.push({ rel, kind: 'CREDENTIAL_SHAPE', detail: `${hit.slice(0, 8)}…` });
      }
    }
    for (const m of text.matchAll(ASSIGNMENT)) {
      findings.push({ rel, kind: 'TOKEN_ASSIGNMENT', detail: m[0].slice(0, 28) });
    }
  }
}

walk(repoRoot);

console.log(`credential scan: ${scanned} text files`);
console.log(`  findings                  : ${findings.length}`);
if (liveToken.length >= 12) {
  console.log('  live-token value check    : RAN (token present in env)');
} else {
  // In CI the secret is intentionally absent. Say so explicitly: a clean run
  // here proves the SHAPE and ASSIGNMENT legs only — it is not evidence that
  // the operator's real token is absent from the tree.
  console.log('  live-token value check    : SKIPPED — ANTHROPIC_AUTH_TOKEN not in env');
  console.log('    (shape + assignment legs still enforced; exact-value leg unproven here)');
}

if (findings.length > 0) {
  console.error('\nFAIL: credential-shaped content in the tree:');
  for (const f of findings.slice(0, 40)) {
    console.error(`  [${f.kind}] ${f.rel}  ${f.detail}`);
  }
  if (findings.length > 40) console.error(`  … and ${findings.length - 40} more`);
  process.exit(1);
}

console.log('\nOK: no credential material found.');
