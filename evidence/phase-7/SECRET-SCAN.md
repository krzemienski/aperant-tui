# Phase 7 Secret Scan

Recursive scan of `evidence/phase-7/` for credential-shaped material. Binary `.png` files skipped (scanned only `.txt`, `.json`, `.md`). Re-enumerated the file list immediately before scanning since other workers are concurrently writing new files into this tree.

## Files scanned: 27

```
gates/GATES.md
gates/build.txt
gates/test.txt
gates/typecheck.txt
perf/screens/01-top.png.txt
run-20260917T202256Z-probe/f10/captures.json
run-20260917T202256Z-probe/f10/step-01-f10-askbox-open.png.txt
run-20260917T202256Z-probe/f10/step-02-f10-askbox-typed.png.txt
run-20260917T202256Z-probe/f10/step-03-f10-after-escape.png.txt
run-20260917T202256Z-probe/f18-tui/captures.json
run-20260917T202256Z-probe/f18-tui/step-01-settings-zero-accounts.png.txt
run-20260917T202256Z-probe/f18-tui/step-02-account-1-added.png.txt
run-20260917T202256Z-probe/f18-tui/step-03-settings-one-account-persisted.png.txt
run-20260917T202256Z-probe/f18-tui/step-04-account-2-appended.png.txt
run-20260917T202256Z-probe/step-01-boot-hunter-seed.png.txt
run-20260917T202952Z-linked3/awesome-researcher/captures.json
run-20260917T202952Z-linked3/awesome-researcher/step-01-boot-identity.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-02-roadmap-view.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-03-convert-feature-to-spec.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-04-board-shows-converted-task.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-05-board-selected-005huma-preSTART.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-06-agent-started-005huma.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-07-agents-swarm-live.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-08-agents-trace-live.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-09-agents-tokens-live.png.txt
run-20260917T202952Z-linked3/awesome-researcher/step-10-agent-coding-failed.png.txt
```

Note: this is a snapshot taken at scan time. Other workers are actively writing additional directories (`perf/`, `obs-gates/`, `gates-p53-p63/`, further `run-*/` dirs) into `evidence/phase-7/` concurrently; anything created after this scan ran is not covered here and should be rescanned by whoever produces the final phase report.

## Patterns used
1. `sk-[A-Za-z0-9_-]{16,}` — generic API-key prefix
2. `sk-ant-[A-Za-z0-9_-]{16,}` — Anthropic-style key prefix
3. `\b[A-Za-z0-9+/=]{32,}\b` — base64/hex run ≥32 chars
4. `Bearer\s+\S+` — bearer auth header
5. `api_key["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}` — snake_case key assignment
6. `apiKey["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}` — camelCase key assignment
7. `ANTHROPIC_AUTH_TOKEN\s*[:=]\s*\S+` — env var followed by a value

## Results

**0 credential-shaped hits** for patterns 1, 2, 4, 5, 6, 7 across all 27 files.

**14 hits** for pattern 3 (base64/hex run ≥32 chars) — **all 14 are benign**: every hit occurs on a line that is a JSON `"sha256": "<64-hex-char digest>"` field inside a capture manifest (`captures.json` or `streaming-agent-start-proof.json`). These are frame-integrity hashes computed by the capture tooling to prove screenshot provenance and detect duplicate/tampered frames — not credentials. Verified each hit's line individually starts with the literal `"sha256"` key before the hex run.

Hit locations (file : line, redacted shape — first4...last4, length):
| File | Line | Redacted shape |
|---|---|---|
| `run-20260917T202256Z-probe/f10/captures.json` | 14 | `90e0...35e7` (64 chars) |
| `run-20260917T202256Z-probe/f10/captures.json` | 30 | `e6a8...6d29` (64 chars) |
| `run-20260917T202256Z-probe/f10/captures.json` | 46 | `897e...8e46` (64 chars) |
| `run-20260917T202256Z-probe/f18-tui/captures.json` | 14 | `8ee3...04ca` (64 chars) |
| `run-20260917T202256Z-probe/f18-tui/captures.json` | 30 | `29fe...df1c` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/captures.json` | 14 | `4077...6e11` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 4 | `ae2a...2ec9` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 10 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 16 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 22 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 28 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 34 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 40 | `82c4...09fc` (64 chars) |
| `run-20260917T202952Z-linked3/awesome-researcher/streaming-agent-start-proof.json` | 46 | `6cfa...3160` (64 chars) |

## Verdict
**0 real secret hits.** All matched material is non-secret frame-integrity hashing metadata. No API keys, bearer tokens, or auth-token values found in any `.txt`, `.json`, or `.md` file under `evidence/phase-7/` as of scan time.
