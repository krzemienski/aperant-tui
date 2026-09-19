#!/usr/bin/env node
/**
 * Vendored drift audit.
 *
 * `apps/desktop/` is vendored from upstream under `apps/DESKTOP-SHA256SUMS.txt`
 * (1288 entries). Downstream edits are permitted, but VENDORED-PATCHES.md
 * states every one is marked inline with `[APERANT-PATCH <name>]`. That
 * contract is only enforceable if something checks it — this is that check.
 *
 * Exit 0  : every drifted file carries a patch marker, or is explicitly
 *           allow-listed below (formats that cannot hold a comment).
 * Exit 1  : a vendored file changed with no marker and no allow-list entry,
 *           i.e. an unrecorded upstream edit.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorRoot = path.join(repoRoot, 'apps', 'desktop');
const manifestPath = path.join(repoRoot, 'apps', 'DESKTOP-SHA256SUMS.txt');

/**
 * Files that legitimately drift but cannot carry an inline marker (JSON has no
 * comment syntax). Each MUST be documented in VENDORED-PATCHES.md instead.
 */
const MARKERLESS_ALLOWLIST = new Set(['./package.json']);
const MARKER = 'APERANT-PATCH';

if (!existsSync(manifestPath)) {
  console.error(`drift audit: manifest missing at ${manifestPath}`);
  process.exit(1);
}

const entries = readFileSync(manifestPath, 'utf8')
  .split('\n')
  .map((line) => /^([0-9a-f]{64})\s+[* ]?(.+)$/.exec(line.trimEnd()))
  .filter((m) => m !== null)
  .map((m) => ({ sha: m[1], rel: m[2] }));

if (entries.length === 0) {
  console.error('drift audit: manifest parsed to zero entries — refusing to pass vacuously');
  process.exit(1);
}

let matched = 0;
const missing = [];
const undocumented = [];
const documented = [];

for (const { sha, rel } of entries) {
  const abs = path.join(vendorRoot, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    continue;
  }
  const buf = readFileSync(abs);
  if (createHash('sha256').update(buf).digest('hex') === sha) {
    matched += 1;
    continue;
  }
  if (MARKERLESS_ALLOWLIST.has(rel)) {
    documented.push(`${rel} (allow-listed, see VENDORED-PATCHES.md)`);
  } else if (buf.toString('utf8').includes(MARKER)) {
    documented.push(rel);
  } else {
    undocumented.push(rel);
  }
}

console.log(`vendored manifest: ${entries.length} entries`);
console.log(`  byte-identical to upstream : ${matched}`);
console.log(`  drifted, patch-documented  : ${documented.length}`);
console.log(`  drifted, UNDOCUMENTED      : ${undocumented.length}`);
console.log(`  missing from tree          : ${missing.length}`);

for (const rel of documented) console.log(`    documented: ${rel}`);

if (missing.length > 0) {
  console.error('\nFAIL: manifest lists files absent from the vendored tree:');
  for (const rel of missing) console.error(`  ${rel}`);
  process.exit(1);
}

if (undocumented.length > 0) {
  console.error('\nFAIL: vendored files changed without an [APERANT-PATCH] marker:');
  for (const rel of undocumented) console.error(`  ${rel}`);
  console.error('\nEither add the inline marker and a VENDORED-PATCHES.md entry,');
  console.error('or revert the file to its upstream contents.');
  process.exit(1);
}

console.log('\nOK: all vendored drift is documented.');
