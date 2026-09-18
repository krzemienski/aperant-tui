# SECRET-SCAN-FINAL — evidence/phase-7 (full recursive sweep)

**Files scanned:** 133 (`.txt`, `.json`, `.md`, `.diff`, `.mjs`, `.py` — all recursively under `evidence/phase-7/`, `.png` binaries skipped by extension filter)
**Read errors:** 0

## Patterns used

1. `sk-[A-Za-z0-9_-]{10,}` — generic API-key prefix
2. `sk-ant-[A-Za-z0-9_-]{10,}` — Anthropic key prefix
3. base64/hex run ≥32 chars: `[A-Za-z0-9+/]{32,}={0,2}`
4. `Bearer\s+\S+`
5. `api_key["']?\s*[:=]\s*["']?[^\s"',}]+`
6. `apiKey["']?\s*[:=]\s*["']?[^\s"',}]+`
7. `ANTHROPIC_AUTH_TOKEN` followed by a value

## Result: **0 credential hits.** All 107 raw pattern matches classified benign.

### Breakdown by pattern (all benign)

| Pattern | Raw matches | Classification |
|---|---|---|
| `base64/hex-run-32+` | 92 | Benign — see below |
| `ANTHROPIC_AUTH_TOKEN` | 12 | Benign — see below |
| `apiKey` | 2 | Benign — redacted placeholders |
| `sk-` | 1 | Benign — false positive, filename substring |
| `sk-ant-` | 0 | none |
| `Bearer ` | 0 | none |
| `api_key` | 0 | none |

### Benign explanations

**base64/hex ≥32-char runs (92 matches):**
- **94 additional occurrences** of `"sha256": "<64 hex>"` fields inside capture manifests (`captures.json`, `*-RESULT.json`, `*-RECHECK.json`) were pre-excluded from the count above per task instruction — these are **frame-integrity hashes**, not secrets. They hash PNG screenshot bytes for tamper detection, e.g. `"sha256": "8120f0675b8e70827d7f2671d6c45..."` next to a `"file": "step-01-...png"` field.
- Of the 92 counted matches, the large majority are **inline sha256 hash values quoted in prose** inside `*-VERDICT.md` files (e.g. `` sha256 `4dc0b88eb8c4dd3149591e72fe...` `` in `P6.3-RECHECK-VERDICT.md`, or "Before restart... `4f2a12eedb18524ab4666b61ab20a3619f60b9fdb04e7cce5224c8934b069517`" in `LINKED-VERDICT.md`) — same frame-integrity-hash class, just narrated in Markdown instead of a JSON field. Explicitly benign under the same rule.
- The remainder are **long repo-relative file paths** concatenated without spaces (e.g. `apps/desktop/src/main/ai/session/stream-handler.ts` inside a JSON `"location"`/`"evidence"` string value) that happen to be ≥32 chars of `[A-Za-z0-9+/]` — no `/` boundary breaks the regex's character class since `/` is itself in the allowed set. False positives from the regex matching path text, not credential material.

**`ANTHROPIC_AUTH_TOKEN` (12 matches):**
- All occurrences are either (a) **the literal env-var *name*** referenced in driver scripts (`const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;` in `obs-cache-probe*.mjs`, `p357-run1-run2-driver.mjs`) with no value ever printed — the script reads the var into a local variable and passes it straight into an SDK client constructor (`apiKey: AUTH_TOKEN`), never logging it; or (b) **prose references** in verdict Markdown discussing the auth mechanism (`"which reads ANTHROPIC_AUTH_TOKEN/ANTHROPIC_..."`) or a captured caption noting "secret_hits field is `0`" as part of that gate's own no-leak claim; or (c) this very scan report describing pattern #7 itself.
- Zero instances show an actual token value following the name.

**`apiKey` (2 matches):**
- `evidence/phase-7/obs-gates/scripts/obs-cache-probe.mjs:41` — `apiKey: AUTH_TOKEN` — variable reference, not a literal value.
- `evidence/phase-7/gates-p53-p63/P6.3-RECHECK.json:105` — `"apiKey": "<redacted len=35 — never printed in any evidence artifact>"` — an explicit, pre-redacted placeholder string; the literal text says "redacted," it is not a real key.

**`sk-` (1 match):**
- `evidence/phase-7/gates-final/GATES-FINAL.md:40` — matched inside the substring `...auto-claude-Complete-**s**ubta**sk**-1-1-bs4-HTML-link-extra.patch` (a filename echoed from `git status --porcelain`). The regex matched `sk-1-1-bs4-HTML-link-extra` as a false positive inside the English word "subtask" + trailing filename characters. Not a credential — it is a filename fragment.

## Verdict

**0 real credential hits** across all 133 scanned files. Every match resolves to one of: a pre-declared frame-integrity sha256 hash (JSON field or prose-quoted), an env-var name with no value ever printed, an explicitly pre-redacted placeholder, or a regex false-positive on a file path / filename substring.
