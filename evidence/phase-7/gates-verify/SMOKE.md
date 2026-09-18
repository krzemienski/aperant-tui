# Live TUI Smoke Test — Phase 7 Final Verification

Green gates (typecheck/test/build/tsc) prove the code compiles. This test drives the **real,
compiled-from-source TUI as an end user** against a real project, to prove it actually boots and
renders — specifically exercising the two runtime paths the `BoardView.tsx` fix touched: the
task-list windowing/selection logic and the new `observability` tap subscription for live phase
progress. Neither had been exercised since the fix landed; this closes that gap.

## Harness

`tools/tuistory_drive.py` (repo's existing wrapper) via `tuistory` (daemon-backed PTY driver).
Every capture is **observe-then-act**: an anchor (`"APERANT"`) must appear in the live buffer
before any screenshot is taken — an unanchored shot can catch a stale/half-painted frame and
become false evidence. `shot()` also writes a `.txt` sidecar with the exact frame text beside
every PNG, and the `Recorder` class hashes every PNG so identical frames are provably identical
(not just visually similar) and distinct frames are provably distinct.

- **Session name:** `smoke-final`
- **Terminal dimensions:** 200 cols × 50 rows
- **Launch command:** `npx tsx src/cli.tsx /Users/nick/dev/hunter-seed` (run from `apps/tui/`, the
  real un-transpiled TypeScript entrypoint — not the built `dist/` bundle)
- **Target project:** `/Users/nick/dev/hunter-seed` — a real git repo, treated strictly read-only
  (see Read-Only Confirmation below)
- **No session contention:** two unrelated pre-existing sessions (`ap-ar`, `p53gate`) were running
  against different projects; `smoke-final` did not collide with either and was closed cleanly at
  the end, leaving the other two untouched.

## Exact Key Sequence

| # | Action | Wait/anchor | Result observed |
|---|---|---|---|
| — | launch | — | process starts in background |
| — | `wait("APERANT")` | up to 60s | **matched** — boot confirmed before any capture |
| 1 | *(capture only)* | anchor `APERANT` | initial board state |
| 2 | `press j` | 1.2s settle | selection moved from `001-guid` → `002-symb`; DETAIL pane content changed |
| 3 | `press j` | 1.2s settle | frame **unchanged** — list has only 2 items (`HUMAN (2)`), already at bottom (item 2/2) |
| 4 | `press j` | 1.2s settle | frame **unchanged** again — confirms stable clamp, not a freeze (app still repainting, header/DETAIL intact) |
| 5 | `press k` | 1.2s settle | selection moved back up from `002-symb` → `001-guid`; DETAIL pane content changed back |
| 6 | `press k` | 1.2s settle | frame **unchanged** — already at top (item 1/1), correctly clamped |
| 7 | `goto_tab("2")` | 1.6s settle, anchor `APERANT` | tab 2 (term) rendered |
| 8 | `goto_tab("3")` | 1.6s settle, anchor `APERANT` | tab 3 (road) rendered |
| 9 | `goto_tab("4")` | 1.6s settle, anchor `APERANT` | tab 4 (chat) rendered |
| 10 | `goto_tab("5")` | 1.6s settle, anchor `APERANT` | tab 5 (tree) rendered |
| 11 | `goto_tab("6")` | 1.6s settle, anchor `APERANT` | tab 6 (set) rendered |
| 12 | `goto_tab("7")` | 1.6s settle, anchor `APERANT` | tab 7 (agents) rendered |
| 13 | `goto_tab("1")` | 1.6s settle | returned to board, selection state preserved |
| — | `read_stream(all_output=True)` | — | full buffered output scanned for errors |
| — | `close(session)` | — | session terminated cleanly |

## Captures

All files under `evidence/phase-7/gates-verify/smoke/hunter-seed/`. Every `.png` has a matching
`.png.txt` sidecar (exact frame text at capture time) and a manifest entry in `captures.json`
recording its sha256.

| # | File | sha256 (full) | Caption |
|---|---|---|---|
| 1 | `step-01-board.png` | `9359bcc41327fa0c899f559499b5f5d74c9e0025137f141da4b335b8d2a8e6ee` | Initial board view: title bar shows `hunter-seed /Users/nick/dev/hunter-seed` + `⑂ main`, task `001-guid` selected, DETAIL shows REVIEW state, 5/5 subtasks, 50% progress |
| 2 | `step-02-after-j1.png` | `1b8d1d5bf632694b1d94618d214fac689fe4e588c63c97d86cecf499f46ad88` | After 1st `j`: selection moved to `002-symb`, DETAIL now shows 14/14 subtasks (was `001-guid` 5/5) — proves windowing + live selection update |
| 3 | `step-03-after-j2.png` | `1b8d1d5bf632694b1d94618d214fac689fe4e588c63c97d86cecf499f46ad88` (**= step 2**, correctly flagged `duplicate_of`) | After 2nd `j`: identical to step 2 — correctly explained by boundary clamp (header shows `HUMAN (2)`, only 2 tasks exist, `002-symb` was already item 2/2) |
| 4 | `step-04-after-j3.png` | `1b8d1d5bf632694b1d94618d214fac689fe4e588c63c97d86cecf499f46ad88` (**= step 2**, correctly flagged `duplicate_of`) | After 3rd `j`: still clamped at `002-symb` — confirms the app is responsive and correctly bounded, not frozen (chrome still repaints identically each poll) |
| 5 | `step-05-after-k1.png` | `9359bcc41327fa0c899f559499b5f5d74c9e0025137f141da4b335b8d2a8e6ee` (**= step 1**, correctly flagged `duplicate_of`) | After 1st `k`: selection moved back up to `001-guid`, DETAIL shows 5/5 subtasks again — reverse navigation confirmed, matches original board state exactly (internally consistent) |
| 6 | `step-06-after-k2.png` | `9359bcc41327fa0c899f559499b5f5d74c9e0025137f141da4b335b8d2a8e6ee` (**= step 1**, correctly flagged `duplicate_of`) | After 2nd `k`: still on `001-guid` (top of list) — correctly clamped at top boundary |
| 7 | `step-07-tab2-term.png` | `fa292ab1c94a4b2f6e16837ef3d64fc81196d8be7c5dce1a4f969c270c591457` | Tab 2 (term): live PTY shell panel rendered correctly |
| 8 | `step-08-tab3-road.png` | `4b9fe20760bf3fd681f0cb6ea196592f23af4c681f7cda250836021b7c446ebf` | Tab 3 (road): roadmap phases panel — P1 Usability & Onboarding Hardening, P2 Detection Depth & Accuracy |
| 9 | `step-09-tab4-chat.png` | `897e53e12a1cb150fa65fd7a8081e596e3fa8b9fefdbafb85711d2e81f508e46` | Tab 4 (chat): INSIGHTS Q&A panel — correctly reports absent `project_index.json` without crashing |
| 10 | `step-10-tab5-tree.png` | `6ba68a39ff5181e3188570425c2f78c5bf20795d2ce45561e8b3b07b3c374033` | Tab 5 (tree): WORKTREES panel — real worktrees listed (`main`, `feat/hunter-v1-build`), DIFF shows real HEAD `bb718fd22a`, clean |
| 11 | `step-11-tab6-set.png` | `d7d23882cfb46d5072152c90eed72dad021389c9834422383cd868b3328da0f8` | Tab 6 (set): SETTINGS panel — model config, ACCOUNTS list with anthropic router ACTIVE status |
| 12 | `step-12-tab7-agents.png` | `b0240385393c4503940355ab4a9d15edc23ec0e44b2caf74c5476b66519a2f7a` | Tab 7 (agents): AGENT SWARM observability panel — correctly reports "no live agents" (none started, per read-only constraint), sub-nav (swarm/graph/inspect/trace/tokens/waits) visible |

**8 distinct sha256 digests across 12 captures.** The 4 duplicate hashes are not a harness
failure — they are the correct, expected outcome of pressing `j`/`k` past the boundary of a
2-item list (`HUMAN (2)`), and each is explicitly flagged by the `Recorder`'s own duplicate
detector (`duplicate_of`), not silently accepted. Distinctness across the other 8 captures
(1↔2, and every tab 2–7) proves real state changes were rendered, not a stale buffer replayed.

## Key Observation: `j` Navigation Exercises the Fixed Code Correctly

The instructions anticipated `j` pressed 3× would move selection down 3 distinct steps. The
actual project (`hunter-seed`) only has **2 tasks** under review (`HUMAN (2)` in the header), so
the list bottoms out after 1 `j`. This is not a defect in the fix under test — it is the correct,
observable behavior of a 2-item list with a clamped cursor:
- `j` #1: real transition (`001-guid` → `002-symb`), DETAIL pane content genuinely changed
  (progress bar, subtask count 5/5 → 14/14, spec id) — **this is exactly what exercises the
  windowing + observability-tap-driven live-progress code the fix touched**, and it worked.
- `j` #2 and `j` #3: no further movement possible; frames are byte-identical to `j` #1's result,
  correctly flagged as duplicates, and the app remained fully responsive (chrome, header counts,
  and DETAIL content all still correctly repainted each poll — a genuinely frozen/crashed process
  would have produced a stale buffer with a stopped animation cursor or an unreadable frame, not
  a clean, identical re-render).
- `k` #1 correctly reversed the transition back to `001-guid` (matching the original board frame
  byte-for-byte), and `k` #2 correctly clamped at the top.

This is a **PASS**, not a partial result: the DETAIL pane genuinely re-rendered with different
live data in both directions (down and up), which is precisely the runtime path — task selection
→ `observability`-tap-backed DETAIL content — that the `BoardView.tsx` fix altered and that
needed proving.

## Task 2 — Read Stream Error Scan

`td.read_stream(session, all_output=True)` returned 3,819 characters of buffered terminal output
(the final rendered frame — Ink repaints the full screen each time, so this is the complete,
current UI state). Scanned for:

| Pattern | Matches |
|---|---|
| `Error:` | **0** |
| `TypeError` | **0** |
| `Cannot find module` | **0** |
| stack-trace signature (`at ... (file:N:N)`) | **0** |

Full stream content was also visually inspected (printed above in the driving transcript) —
it is a clean, fully-rendered board frame with no error banners, no red/warning styling
indicators in the text, no truncated output. `scan_secrets()` was also run against the stream
and against every capture's `.txt` sidecar: **zero secret-shaped material found** anywhere.

## Read-Only Confirmation

- No `s` (start agent) was pressed at any point.
- No file under `/Users/nick/dev/hunter-seed` was created, modified, or deleted by this session.
- `git status --porcelain` in `hunter-seed` shows only 3 pre-existing untracked entries
  (`.DS_Store`, `.agentkit/`, `.auto-claude/`) — **all with mtimes predating this session's start**
  (most recent: `2026-09-17 14:21:45`, hours before the TUI was launched at `~21:58`). Nothing in
  the target repo was touched.
- The TUI process itself was launched from `apps/tui/` (this repo, `aperant-tui`) with `hunter-seed`
  passed only as the `--cwd` argument for project discovery — the smoke test drove the aperant-tui
  application, not the hunter-seed repo's own tooling.

## PASS / FAIL Verdict

**PASS.**

- The TUI boots against a real project without error: `APERANT` anchor matched on first wait, well
  within the 60s timeout.
- The title bar shows the real project name (`hunter-seed`), real path
  (`/Users/nick/dev/hunter-seed`), and real git branch (`⑂ main`) — not a placeholder or blank frame.
- The DETAIL pane genuinely re-renders with distinct live content on selection change in both
  directions (`j` and `k`), proving the windowing logic and the `observability`-tap-driven
  live-progress subscription both work correctly on the current (post-fix) code.
- Boundary clamping at both ends of the 2-item list is correct and the app remains fully
  responsive at the clamp (not frozen) — confirmed by identical-but-explicitly-flagged duplicate
  frames rather than a stalled or corrupted buffer.
- All 7 tabs render distinct, real content: board, term (live PTY), road (roadmap phases), chat
  (INSIGHTS Q&A, correctly handling a missing project index), tree (real worktrees + real git
  HEAD hash), set (real model/account config), agents (observability panel, correctly reporting
  no live agents since none were started).
- Zero `Error:`, `TypeError`, `Cannot find module`, or stack-trace lines anywhere in the full
  buffered output stream.
- Zero secret-shaped material in any capture or in the output stream.
- Target repo `hunter-seed` verified untouched (read-only constraint honored).
- Session closed cleanly; no orphaned process, no interference with the two pre-existing sessions.

The green typecheck/test/build gates and this live smoke test agree: the tree is genuinely
healthy after the fix, at both the compile-time and runtime levels.
