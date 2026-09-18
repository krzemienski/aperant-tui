# Redaction note — awesome-researcher private source content

**Date:** 2026-09-17
**Scope:** content-only redaction. Event structure, ordering, timestamps, event
types, token counts, tool NAMES, and file PATHS are all preserved exactly.
Only file/diff BODY payloads that verbatim-quoted private third-party source
were replaced with `[REDACTED: ...]` markers carrying a length and a sha256
prefix, so a reviewer can confirm something was present and how much, without
the content itself being published.

## Why

This run's `awesome-researcher/` subdirectory captured a real agent session
against `/Users/nick/awesome-researcher`, a private codebase unrelated to
this public repository (github.com/krzemienski/aperant-tui). The flight
recorder (`agent-events.jsonl`) and the work-product artifacts (`*.diff`,
`*.patch`) are legitimate proof that the TUI drove a real coding agent
against a real project — but they also embedded that project's actual
source code (docstrings, function bodies, diff hunks) as a side effect of
recording every tool call/result verbatim. Permission to publish this repo
does not extend to a third party's private codebase, so that content had to
be removed before any of this evidence tree ships.

## Files redacted

### `awesome-researcher/agent-events.jsonl`
- **9548 lines before and after** (line count unchanged; only individual line
  CONTENTS were rewritten). All 9548 lines are still valid JSON, one object
  per line.
- **63 redaction markers** applied across three payload shapes:
  - **48** `Read`/`Bash`/`Grep` `tool-result` payloads whose `result` field
    verbatim-quoted real file content (source lines, docstrings, config
    values, `git show`/`git diff` blobs, pytest failure output quoting real
    assertion values, Python heredoc output printing parsed source
    structures). Marker: `[REDACTED: verbatim source from private repo
    awesome-researcher, <N> chars, sha256:<12-hex>]`.
  - **14** `Edit` `tool-call` args (`old_string` + `new_string` on 7 edits)
    quoting the pre-existing private source being edited and the private
    module's real internal function/class signatures in the replacement.
    Markers: `[REDACTED: verbatim source from private repo
    awesome-researcher, <N> chars, sha256:<12-hex>]` (old_string) /
    `[REDACTED: source referencing private repo awesome-researcher
    internals, <N> chars, sha256:<12-hex>]` (new_string).
  - **1** `Grep` `tool-result` in `content` output mode returning real
    function/class-definition line matches.
- **Not redacted** (verified benign, left as-is): `ls`/`find -name` directory
  listings (filenames only), `git log --oneline`/`git status`/`git branch`/
  `git diff --stat`/`git diff --name-status` (paths + line counts, no code),
  pytest PASS/FAIL summary counts and test NAMES (not source bodies), `git
  commit` confirmation output (hash + insertion count, no diff), `Write`/
  `Edit` tool-result CONFIRMATION strings ("Successfully wrote N lines to
  ..." — no content echoed back), and the agent's own search-query text
  (e.g. a `Grep` tool-call's `pattern` argument naming a class it is looking
  for — that is metadata about the search, not leaked content).

### `awesome-researcher/work-product.diff`
- Diff header (`diff --git`, `index`, `---`, `+++`) preserved.
- Hunk body (60 insertions, 2 deletions, 3488 chars) replaced with one
  `[REDACTED: diff hunk body from private repo awesome-researcher, 60
  insertions(+), 2 deletions(-), 3488 chars, sha256:<12-hex>]` line.

### `awesome-researcher/0001-auto-claude-Complete-subtask-1-1-bs4-HTML-link-extra.patch`
- `git format-patch` metadata preserved: `From`/`Date`/`Subject`, the commit
  message body, the `---` stat summary (`1 file changed, 60 insertions(+), 2
  deletions(-)`), the diff header, and the `-- \n2.55.0` trailer.
- Same hunk body (60 insertions, 2 deletions, 3487 chars — one char shorter
  than the `.diff` copy because this file lacks a leading blank line)
  replaced with the equivalent `[REDACTED: ...]` marker.
- This file is a duplicate of `work-product.diff` in `git format-patch`
  form; both existed because the driving harness saved the work product two
  ways. Both were redacted identically.

## What was intentionally NOT touched

- `step-29-agents-swarm-isolated.png.txt` (a screenshot text-sidecar) still
  contains two ~40–90 character UI-truncated fragments of source text (e.g.
  `"""Extract the leading indent + bullet marker + one spac…"` cut mid-word
  by the TUI's own truncate-end rendering, and a `class ResourceInsert:`
  three-line preview cut with `…`). These are NOT full reconstructable
  excerpts — they are proof of the TUI's real LIVE TOOL TRACE truncating
  preview behavior, which is exactly what that capture is evidencing. The
  corresponding `.png` binary shows the same truncated text rendered in the
  terminal. Redacting an image (and its manifest sha256 entry) is a
  different operation than text redaction and was not authorized in this
  pass — **flagged for a separate decision**, not silently left in or
  silently altered.
- The 8 other `agent-events.jsonl` files under `evidence/` (phase-2,
  phase-3.5 ×2, phase-4 ×3, phase-5 hunter-seed, phase-5 vigil) were checked
  directly: none of them contains the substring `awesome-researcher`,
  `awesome_researcher`, `proofpunk-agent`, or `proofpunk_agent` anywhere.
  Their own source excerpts (which do exist, in the same shape as the ones
  redacted here) are exclusively from `/tmp/aperant-fixture` (throwaway),
  `/Users/nick/Desktop/vigil`, and `/Users/nick/dev/hunter-seed` — the
  user's own development projects, not a third party's private codebase —
  and were left untouched per operator instruction.

## Verification performed

- Every one of the 9548 `agent-events.jsonl` lines parses as valid JSON
  after redaction (`json.loads` over every line, zero errors).
- Re-scanned the full `evidence/` + `audit-evidence/` tree (965 text-like
  files) for eight distinctive strings unique to awesome-researcher's real
  source (docstring openers, `class ResourceInsert`, `class SourcePatcher`,
  `def parse_markdown`, `def _extract_html_links`): the only remaining hits
  are the two benign classes described above (search-query text; truncated
  UI-preview fragments in one screenshot sidecar).
- `MANIFEST.json` in this run directory still lists the old (pre-redaction)
  byte sizes and sha256 hashes for the three modified files. Those entries
  are now **stale** and should be regenerated before this evidence is
  treated as sealed/final, so a reviewer doesn't compare a hash against
  content that no longer exists on disk.
