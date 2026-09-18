# ACCEPTANCE INVENTORY — Aperant TUI

Built read-only from: `docs/plan/ROADMAP.md`, `docs/plan/BRIEF.md`,
`docs/plan/phases/*-PLAN.md` + `*-VALIDATION.md` (phases 1, 2, 2.5, 3.5, 4),
`audit-evidence/RETRACTION.md`, `audit-evidence/cycle-01/findings.json`,
plus source re-reads to confirm claimed fixes. No source file was modified to
produce this document.

**Spec file note (rule requires this be stated plainly):** `BRIEF.md:3`
names the binding spec as `aperant-tui-specification.md` ("user upload, 583
lines"). That file is **ABSENT** from the repository — confirmed by a
repo-wide glob for `aperant-tui-specification.md` and for any
`*specification*.md` / `**/SPEC*.md`, zero hits. `ROADMAP.md`'s gate column
(quoting itself as "verbatim from spec") is therefore the only surviving
binding spec text for Phases 1–8, and is treated as authoritative here.
Similarly, `docs/plan/phases/phase-3.5-PLAN.md:3` cites
`aperant-agent-observability-spec.md` ("uploaded 2026-08-12") for the six
agent-observability sub-gates — this file is **also ABSENT** from the repo.
`phase-3.5-PLAN.md`'s own "Gate mapping (spec Part 8)" table is used as the
substitute binding text for those rows, same rule.

Status vocabulary used below: **PROVEN**, **RETRACTED**, **PARTIAL**,
**PENDING**, **DESCOPED**. See each row's "how it must be verified" /
"required evidence" columns for what closes it.

---

## A. True success criteria (BRIEF.md:8-22)

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| A1 | TUI imports the vendored Electron app's TypeScript runtime IN-PROCESS — no IPC, no API gateway, no language bridge, via `libs/electron-shim` (real Node implementations, not mocks) | BRIEF.md:10-13 | **PROVEN** | Re-verify `libs/electron-shim/index.js` still contains no mock/stub markers and `apps/tui/src/App.tsx` still imports `@main/*` directly | `apps/DESKTOP-SHA256SUMS.txt` integrity manifest; Phase 1 gate (below) |
| A2 | Functional parity per spec Part 2 matrix: board/task lifecycle, terminal-in-terminal PTY panes, roadmap, insights, worktrees, settings, themes, command palette | BRIEF.md:14-16 | **PARTIAL** | Spec Part 2 matrix itself is ABSENT (no spec file); parity is inferred from the 8-phase gate table. Terminal-in-terminal is DESCOPED to single-pane (see C-Phase3). All other listed surfaces (board, roadmap, insights, worktrees, settings, themes, palette) have at least one PASSING gate run. | Phases 1, 2, 2.5, 4 VALIDATION docs; phase-5/6 tuistory runs |
| A3 | Every phase gate proven by real execution with run-scoped evidence under `evidence/phase-{N}/`; regression gates cumulative; per-criterion VERDICT for every gate | BRIEF.md:17-19 | **PARTIAL** | Phases 1/2/2.5/3.5 have per-criterion VERDICT tables and are cumulative-clean as of their own runs. Phase 4 is PARTIAL (ideation). Phases 5/6/7/8 have no formal per-criterion VALIDATION.md yet — only ad hoc `evidence/phase-5/.../VERDICT.md` and in-flight `evidence/phase-6/` captures exist, neither is a completed phase-gate document. | See section C below, row by row |
| A4 | No mocks, no stubs, no placeholder data anywhere in the product; empty states report factual reasons | BRIEF.md:20-21 | **PARTIAL** | Confirmed pattern for AgentsView (F-04 fix: empty state names the real reason, "No agent has started in this TUI session"). Not independently re-audited across every view in this pass — WorktreeView, LogsView, InsightsView empty states were spot-checked during Q1 recon (all read as factual) but a systematic mock/stub sweep of the full surface has not been run as its own gate. | Would require a dedicated no-mock sweep; none exists as a named evidence artifact |
| A5 | Repo `github.com/krzemienski/aperant-tui` (public), all work pushed | BRIEF.md:22 | **PENDING** | `git remote -v` was not re-checked as part of this pass, and the working tree currently has substantial uncommitted/untracked changes (`git status` shows 7 modified tracked files and dozens of untracked evidence directories at the time of writing) — "all work pushed" is not currently true by definition of a dirty tree. `tools/push-inc.py` exists as the push mechanism but its invocation is not evidenced here. | `git status` clean + `git push` log, or an explicit push-run artifact |
| A6 | Iron Rule (spec Part 6): real system execution, real evidence, no mocks, no stubs | BRIEF.md:24-26 | **PARTIAL** | Enforced in every completed phase's VALIDATION doc via explicit UNVERIFIED-not-simulated language. Violated once and self-corrected: R1-R5 below are exactly Iron Rule violations (fabricated/non-discriminating evidence) that were caught and retracted, which is the process working, not failing — but it means the rule was breached in practice before being caught. | RETRACTION.md is itself the evidence this rule is actively enforced |

---

## B. Phase 1 — Shell & Service Layer (ROADMAP.md:8)

Gate (verbatim): "`aperant` launches against a real project directory; title
bar shows the actual project name, real git branch, and real task counts
read from `.aperant/`; `:` opens palette; `?` opens help; all 6 tabs switch."

Broken into its 10 testable claims per `phase-1-VALIDATION.md`'s own table
(that document already atomizes the gate — reused verbatim rather than
re-decomposed):

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P1.1 | `aperant` launches against a real project directory | phase-1-VALIDATION.md:12 | **PROVEN** | re-run `aperant <dir>`, assert boot | run-20260812T003000-phase1-gate-recheck, step-05/06 |
| P1.2 | Title bar shows actual project name | phase-1-VALIDATION.md:13 | **PROVEN** | same run | step-07 |
| P1.3 | Title bar shows real git branch | phase-1-VALIDATION.md:14 | **PROVEN** | same run | step-07 |
| P1.4 | Title bar shows real task counts | phase-1-VALIDATION.md:15 | **PROVEN** | same run | step-07, cross-checked against 4 fixture specs |
| P1.5 | `:` opens palette | phase-1-VALIDATION.md:16 | **PROVEN** | same run | step-15 |
| P1.6 | Palette executes real commands | phase-1-VALIDATION.md:17 | **PROVEN** | same run | theme-change-probe, 23,846px diff |
| P1.7 | `?` opens help | phase-1-VALIDATION.md:18 | **PROVEN** | same run | step-18/18b (post-D2-fix) |
| P1.8 | All 6 tabs switch (7 tabs as of current source — see Q1 recon; gate text predates AgentsView tab 7) | phase-1-VALIDATION.md:19 | **PROVEN** for the 6 tabs that existed at gate time; tab 7 (agents) proven separately in Phase 3.5 | Re-run against current 7-tab source if the gate is to be re-certified verbatim | step-10..14; Phase 3.5 VALIDATION for tab 7 |
| P1.9 | Evidence standard: screenshots + recording | phase-1-VALIDATION.md:20 | **PROVEN** | n/a (satisfied by the artifacts of P1.1-P1.8) | PNGs w/ sha256, step-20 asciicast |
| P1.10 | Clean exit | phase-1-VALIDATION.md:21 | **PROVEN** | ctrl+c ×2 | step-19 |

Defects D1-D3 all closed per `phase-1-SUMMARY.md:34-43`; no re-open evidence found.

---

## C. Phase 2 — Board & Task Lifecycle (ROADMAP.md:9)

Gate (verbatim): "Board lists real tasks from a live project. Pressing `s`
on a queued task actually starts an agent — the agent stream shows real
spec/plan/code phase output, and progress advances. Task status changes
persist to disk and survive restart."

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P2.1 | Board lists real tasks from a live project | phase-2-VALIDATION.md:11 | **PROVEN** | re-run board on a real project | step-01-snap-board |
| P2.2 | Status change persists to disk | phase-2-VALIDATION.md:12 | **PROVEN** | direct implementation_plan.json read pre/post `L`/`H` | step-02/06 disk-status.txt |
| P2.3 | Change survives restart | phase-2-VALIDATION.md:13 | **PROVEN** | quit, relaunch, re-read state | session A quit (step-04) → session B step-05 |
| P2.4 | Move acts on the selected task (not a stale one) | phase-2-VALIDATION.md:14 | **PROVEN** | post-D4-fix, move the currently-selected (not boot-time) task | step-10/11 |
| P2.5 | `s` starts the real agent pipeline (real outcome surfaced, not simulated) | phase-2-VALIDATION.md:15 | **PROVEN** | press `s`, assert a real vendored event (auth error counts as real) | step-03-wait-auth, step-03-shot-stream.png |
| P2.6 | Agent stream shows real spec/plan/code phase output; progress advances | phase-2-VALIDATION.md:16 | **PENDING (blocked on live credentials at gate time)** — see section F: this exact criterion is re-proven PASS later in Phase 2.5/Phase 4/Phase 5 runs with live credentials, so the *capability* is PROVEN elsewhere, but Phase 2's own gate instance of this criterion was never itself closed | re-run Phase 2's exact gate with credentials present | none captured under `evidence/phase-2/` itself; superseded by later phases |
| P2.7 | Regression: Phase 1 gates re-run | phase-2-VALIDATION.md:17 | **PROVEN** | re-run all P1.1-P1.10 | step-07 |

---

## D. Phase 2.5 — Live Provider E2E (Moonshot/Kimi) + Log Facet (ROADMAP.md:10)

Gate (7 criteria, `phase-2.5-PLAN.md:32-40`, proven three-facet: UI + persistence + logs):

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P2.5.1 | Provisioning refusal without credentials (clear, safe, writes nothing) | phase-2.5-PLAN.md:34 | **PROVEN** | run `a` with no env creds | phase-2.5-VALIDATION.md row 1: step-01e/01g |
| P2.5.2 | `a` provisions a real moonshot account (writes settings.json in the real shape) | phase-2.5-PLAN.md:35 | **PROVEN** | run `a` with env creds, read settings.json | row 2: step-03b/04 |
| P2.5.3 | Account resolves through the vendored queue | phase-2.5-PLAN.md:36 | **PROVEN** | grep console/event log for `provider=moonshot` resolution | row 3 |
| P2.5.4 | Agent starts and streams for real | phase-2.5-PLAN.md:37 | **PROVEN** | press `s`, wait for `agent started`, count events | row 4: 1886 events |
| P2.5.5 | Agent does real work (disk diff) | phase-2.5-PLAN.md:38 | **PROVEN** | diff project dir pre/post run | row 5: agent-work-product.diff |
| P2.5.6 | No secrets in evidence | phase-2.5-PLAN.md:39 | **PROVEN** | grep run dir for secret-shaped strings | row 6: step-09 scan |
| P2.5.7 | Regression: provider protocol suite | phase-2.5-PLAN.md:40 | **PROVEN** at gate time | re-run vitest provider suite | row 7: 9/9 |

Live-provider caveat honestly recorded in the source (`phase-2.5-VALIDATION.md:59-68`): agent ran in **direct mode**, no task worktree was created — this is flagged there as an open item, not claimed proven. Carried forward as **P5.-worktree-under-tui** below (it is exactly what Phase 5's worktree gate needs to close).

---

## E. Phase 3.5 — Agent Coordination & Observability (ROADMAP.md:11)

Gate mapping table is the substitute spec text (see note at top — `aperant-agent-observability-spec.md` is ABSENT). Decomposed per `phase-3.5-VALIDATION.md`'s own 12-row table:

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P3.5.1 | Swarm accuracy (live agent row shows real type/phase during a real run) | phase-3.5-VALIDATION.md:10 | **PROVEN** | drive a real run, assert SWARM row content | step-03, screenshot 62 |
| P3.5.2 | Wait detection — tool (tool-call without matching tool-result surfaces a TOOL wait row) | phase-3.5-VALIDATION.md:11 | **PROVEN** | flight recorder pair census | 4/4 tool-call/tool-result pairs |
| P3.5.3 | Wait detection — concurrency | phase-3.5-VALIDATION.md:12 | **PARTIAL** | executor-level: PROVEN (vitest 3/3). Live multi-coder swarm needs ≥4 concurrent subtasks — not exercised live | live run with ≥4 concurrent subtasks |
| P3.5.4 | Wait detection — ratelimit | phase-3.5-VALIDATION.md:13 | **PROVEN** | write a real RATE_LIMIT_PAUSE sentinel, assert UI row + `r` writes real RESUME | screenshot + step-08d RESUME-ON-DISK-OK |
| P3.5.5 | Wait detection — context | phase-3.5-VALIDATION.md:14 | **PENDING** | drive a session past 90% context usage | this run's planner peaked ~21%; threshold not reached |
| P3.5.6 | Token accuracy | phase-3.5-VALIDATION.md:15 | **PROVEN** | post-D11-fix, compare UI token count against real usage events | 14,035/147 → cumulative 43,216 |
| P3.5.7 | Cache hit accounting | phase-3.5-VALIDATION.md:16 | **PENDING** | need an endpoint that actually returns cache traffic | this endpoint returned `cacheReadTokens: 0`; arithmetic runs but is unexercised |
| P3.5.8 | Tool grants byte-match against vendored AGENT_CONFIGS | phase-3.5-VALIDATION.md:17 | **PROVEN** | dump AGENT_CONFIGS, byte-compare to INSPECT rendering | step-04e GRANTS-BYTEMATCH-OK |
| P3.5.9 | Trace completeness | phase-3.5-VALIDATION.md:18 | **PROVEN** | census stream-event kinds, every tool-call paired | step-09: 132 stream-events, all paired |
| P3.5.10 | Graph topology — phase pipeline | phase-3.5-VALIDATION.md:19 | **PROVEN** | render GRAPH sub-view during a run | step-05 waits |
| P3.5.11 | Graph topology — subagent nodes | phase-3.5-VALIDATION.md:19 | **PENDING** | need SpawnSubagent tool-call traffic | none occurred in this run |
| P3.5.12 | Phase provenance (structured vs inferred labeling) | phase-3.5-VALIDATION.md:20 | **PROVEN** | assert `~ inferred` during planning, `▪ structured` at CODING_STARTED | step-04c wait + task-event census |
| P3.5.13 | Throughput (16ms coalescing, no UI stall under real event volume) | phase-3.5-VALIDATION.md:21 | **PARTIAL** | observational: PROVEN for 275 real events; a 100 events/sec synthetic burst test was never run | synthetic burst throughput test |

Defects D10/D11 closed (source re-checked: `agent-process.ts` forward and dual-shape usage read both present in the vendored tree as of this recon's Q3 pass).

---

## F. Phase 4 — Roadmap, Insights, Ideation (ROADMAP.md:13, PARTIAL as recorded)

Gate (verbatim): "Roadmap generates from real codebase analysis with visible
streaming progress. Insights answers a real question about the actual
codebase with a correct file reference. Ideation returns real findings in
all five categories." (Note: source code has SIX ideation categories, not
five — the gate text itself is stale; see contradiction note in the final
deliverable summary.)

This phase has TWO validation runs: the original credential-blocked run
(`phase-4-VALIDATION.md`, 8 rows) and a later same-day surface-proof run
that superseded its UI-facet claim
(`evidence/phase-4/run-20260917T013131-tui-surface/VERDICT.md`, 15 rows).
Both are reconciled below; the later run's verdicts win where they conflict,
per `phase-4-VALIDATION.md:11-19`'s own explicit "SUPERSEDED" language.

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P4.1 | Roadmap generates from real codebase analysis | phase-4-VALIDATION.md:58 | **PROVEN** | run `g`, read roadmap.json, confirm content is project-specific | vigil: 5 phases/26 features; re-confirmed proofpunk-agent: 4 phases/10 features (tui-surface run) |
| P4.2 | Visible streaming progress (UI facet) | phase-4-VALIDATION.md:59 | **PROVEN** — was RETRACTED-adjacent (originally UNVERIFIED, misattributed to "agent-tty cannot paint Ink on macOS") | root-caused: CI env var was blanking Ink frames; fixed harness re-proves it | tui-surface VERDICT.md criterion 12: `discovery 30% → features 50% → complete` |
| P4.3 | Insights answers real question + correct file reference | phase-4-VALIDATION.md:60 | **PROVEN** | ask a real question, verify the cited file:line exists on disk | vigil: cites `src/plan/verdict.ts:11`; re-confirmed AR: `main.py:1608 def cli_main` (tui-surface criterion 13) |
| P4.4 | Ideation returns findings in all SIX categories (spec text says "five"; app has six — see contradiction note) | phase-4-VALIDATION.md:61 | **PARTIAL in original run → PROVEN in tui-surface re-run** | run `i`, confirm all category files non-empty and rendered in UI | Original: 1/6 (router stream-inactivity). tui-surface criterion 13b: 6/6, 5 findings each = 30 total, all codebase-specific, after fixing D20 (file-name mismatch bug) |
| P4.5 | Linked loop: roadmap → board spec → agent execution → work product on disk | phase-4-VALIDATION.md:62 | **PARTIAL in original run → PROVEN in tui-surface re-run** | convert a feature, start it, diff the project dir | Original: convert+plan PASS, coding phase aborted (60s stream-inactivity), work-product UNVERIFIED. tui-surface criterion 10b (post-D19 fix): real 4,147-byte diff to `src/engine/rails.ts` |
| P4.6 | Agent tracing live during the run | phase-4-VALIDATION.md:63 | **PROVEN** | assert AgentsView reflects a live run | 642-event flight recorder (original); 588-event re-confirm (tui-surface) |
| P4.7 | Regression | phase-4-VALIDATION.md:64 | **PROVEN** at each run's own time | tsc + vitest | 9/9 vitest, tsc exit 0 (both runs) |
| P4.8 | No secrets in evidence | phase-4-VALIDATION.md:65 | **PROVEN** | secret scan of run dir | 0 matches, both runs |

---

## G. RETRACTED items (RETRACTION.md) — every R1-R5 gets its own row

These are **not** Phase 4/5 gate criteria in their own right — they are
specific evidence artifacts whose PASS claims were withdrawn. Each is listed
here because the instructions require it, and because each corresponds to a
still-open re-proof obligation.

| id | criterion (what was retracted) | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| R1 | Phase-5 "visible streaming during generation" for hunter-seed | RETRACTION.md:6-22 | **RETRACTED** | The 3 cited PNGs are byte-identical (sha256 `2adf16e4b81b88a1` ×3) and were never anchor-gated (`matched=None` in COVERAGE-MATRIX.md) | Retracts `evidence/phase-5/.../VERDICT.md:18` criterion 4 → re-prove with `capture_frames()` (distinctness-asserted, now exists per F-08 fix) |
| R2 | Phase-5 "lifecycle persists across restart" for vigil | RETRACTION.md:24-36 | **RETRACTED → RE-PROVEN THIS SESSION** | Pre-start and post-restart frames are byte-identical (`3b47f591378c2482` ×2) — non-discriminating (consistent with persistence, cannot prove it over a frozen state) | `evidence/phase-6/run-20260917T153142-linked-hunter-seed/hunter-seed/step-18-stage9-pre-restart-backlog2.png` (sha `6589533599b9948b`) vs `step-19-stage9-post-restart-backlog2.png` (sha `f278e1cf66537733`) — DISTINCT hashes over a genuinely MUTATED state (BACKLOG 2 with 001-guid + 002-symb, per caption), fresh TUI process boot confirmed post-restart. Separately, `evidence/phase-6/run-20260917T173051-f17-board-status/` re-proves restart persistence again for a different state transition (BACKLOG→REVIEW via F-17), 3+ distinct hashes, cold restart. **RE-PROVEN, closed.** |
| R3 | `functional-evidence/` "generation streaming" spanning 57s | RETRACTION.md:38-48 | **RETRACTED → RE-PROVEN THIS SESSION** | Two groups of byte-identical PNGs (`570cee9663c59320` ×3, `c578092d70b96bc9` ×2) claimed as t=4s/t=30s/t=61s progress | `evidence/phase-6/run-20260917T153142-linked-hunter-seed/hunter-seed/step-02..04-stage2/3-*.png` — 3 DISTINCT hashes (`2018ecb7bb7afc5c`, `588fcd6dc18923e3`, `da6bf884ddd7bc18`) across a real G-triggered regeneration. Same underlying claim class (roadmap generation streams visibly) as R1, closed by the same evidence. **RE-PROVEN, closed.** |
| R4 | `routing-settings.png` "routing proof" | RETRACTION.md:50-57 | **RETRACTED → RE-PROVEN THIS SESSION** | Frame was byte-identical to an unrelated theme-control screenshot; its own sidecar text read `provider not configured` — this is exactly the F-06/D-A bug (SettingsView legacy-keys-only read) | The underlying bug is fixed (F-06, confirmed in source: SettingsView.tsx:61-86). Fresh, non-duplicate, anchor-gated captures of the fixed SettingsView exist at `evidence/phase-6/run-20260917T144428-surface-hunter-seed/hunter-seed/step-17-tab6-settings-theme-ice.png` (sha `86707acff39b6605`) and across both multiproject runs (`.../multiproject/{awesome-researcher,proofpunk-agent}/step-*-settings-config-panel.png`), each showing the real resolved provider/baseUrl per-project. **RE-PROVEN, closed.** |
| R5 | "11 suites / 41 tests failing" vitest figure cited in `phase-5/.../VERDICT.md:25,52` | RETRACTION.md:59-63 | **RETRACTED — and independently corrected** | Number came from a masked exit code (`... | tail -8; echo exit=$?` reports tail's exit, not vitest's) AND from reading the wrong workspace (vendored `apps/desktop`, which is not in the root `npm test` script) | `evidence/gate-recheck/CORRECTION.md`: real measurement is `npm test -w @aperant/tui` → 2 files, 9 passed, exit 0, unmasked. Desktop workspace fails to *collect* (missing `@tailwindcss/postcss` dep) — 0 tests run there, not 41 failures; declared out-of-scope by CORRECTION.md itself |

**F-16 is NOT R4.** They are unrelated bugs that happened to surface in the same phase window: R4/F-06 was a SettingsView READ-path bug (legacy-keys-only resolution); F-16 (merge-resolver.ts) is a separate AI-SDK call-shape defect (`generateText()` choking on the router's SSE framing) discovered during Phase 5 AI-conflict-resolution gates. Neither retracts nor supersedes the other.

**All 5 RETRACTED items (R1-R5) are now closed as of this session**: R1/R2/R3 re-proven with distinctness-asserted captures, R4 re-proven via the fixed SettingsView, R5 was already independently corrected by the green unpiped gate re-runs (`evidence/gate-recheck/CORRECTION.md`, reconfirmed again this session at `evidence/gate-recheck-session3/{typecheck,test,build}-final.txt`, all exit=0). None of R1-R5 blocks anything further.

---

## H. `audit-evidence/cycle-01/findings.json` — every F-01 through F-11+

| id | criterion (defect must stay fixed) | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| F-01 | Ideation empty state said "all five" for six categories | findings.json F-01 | **PROVEN (fixed, committed)** | re-read InsightsView.tsx empty-state string | commit `4d44b7f`; current source (`IDEATION_TYPES.length` used, not hardcoded "five" — confirmed InsightsView.tsx uses `${IDEATION_TYPES.length} types` throughout) |
| F-02 | Settings footer advertised "return apply" but j/k applies+persists immediately | findings.json F-02 | **PROVEN (fixed, committed)** | re-read SettingsView.tsx footer hint | commit `4d44b7f` |
| F-03 | Roadmap footer omitted `G` (force regen); `g` silently no-ops when roadmap exists | findings.json F-03 | **PROVEN (fixed, committed)** | re-read RoadmapView.tsx:120-121 footer/keymap | commit `4d44b7f` |
| F-04 | AgentsView 1-6 sub-view selector was inert (no visible change) with no live agents | findings.json F-04 | **PROVEN (fixed, committed, independently re-verified)** | re-read AgentsView.tsx:141-154 empty branch | commit `3d96287`; this session's Q1 recon independently confirmed `Panel title={AGENT ${sub.toUpperCase()}}` + `SUBVIEW_EMPTY_HINT[sub]` at AgentsView.tsx:148-153 |
| F-05 | Help overlay advertised "1-6" for seven views (should be 1-7) | findings.json F-05 | **PROVEN (fixed, committed, independently re-verified)** | re-read HelpOverlay.tsx:16 | commit `20a7e9b`; this session's Q1 recon independently confirmed `['1-7', 'switch view (esc first in agents/chat)']` at HelpOverlay.tsx:16 |
| F-06 | CONFIG panel reported "provider not configured" while a live router account was active (legacy-keys-only read) | findings.json F-06 | **PROVEN (fixed IN WORKING TREE, uncommitted)** | re-read SettingsView.tsx effective-account resolution | `git status` shows `apps/tui/src/views/SettingsView.tsx` as **modified, uncommitted** (findings.json itself says `"commit": "pending"`); this session independently confirmed the fix is present at SettingsView.tsx:61-86 (priorityOrder → accounts[0] → legacy fallback chain). **Must be committed before it counts as durably fixed** — a `git stash`/reset would silently regress this |
| F-07 | Roadmap GENERATION panel rendered one word per line during live streaming | findings.json F-07 | **PROVEN (fixed IN WORKING TREE, uncommitted)** | re-read RoadmapView.tsx log-chunk coalescing | `git status` shows RoadmapView.tsx modified, uncommitted (`"commit": "pending"`); this session independently confirmed `pushLogChunk`/`DISCRETE_LOG_RE` coalescing logic at RoadmapView.tsx:60-81, and the call site at :171 uses `logLines` (plural, coalesced) not one-line-per-chunk. **Must be committed** |
| F-08 | Capture harness could not detect a stale frame; repeated frames passed as streaming proof | findings.json F-08 | **PROVEN (fixed IN WORKING TREE, uncommitted)** | re-read tuistory_drive.py sha256/duplicate_of/secret-scan logic | `git status` shows `tools/tuistory_drive.py` modified, uncommitted (`"commit": "pending"`); this session independently confirmed `sha256_of`, `Recorder._post`'s `duplicate_of` field, `scan_secrets` call, and `capture_frames()` all present at tuistory_drive.py:207-306. **Must be committed** |
| F-09 | Ideation status line discarded every text-delta and replaced it with a constant string, so a run could sit frozen with no visible motion for minutes | InsightsView.tsx (this session's fix; not yet in findings.json) | **PROVEN (fixed IN WORKING TREE, uncommitted, NOT YET RECORDED in findings.json)** | re-read runIdeationAll's onEvent handler | This session's own Q1/Q2 recon read the fix directly: InsightsView.tsx:129-153 now accumulates `streamed`/`sinceFlush`, coalesces on a 24-char threshold, and renders `${typeIdx}/${IDEATION_TYPES.length} ${t.label}… ${streamed.length}ch · …${tail}` instead of the old constant `${t.label}… streaming` string. `git status` confirms InsightsView.tsx is modified. **This finding must be added to `audit-evidence/cycle-01/findings.json` as F-09 with `status: FIXED, commit: pending` — it currently exists only in this document** |
| F-10+ | Key-advertising audit (per-view help-hint vs real-keymap cross-check) — IN FLIGHT | (none yet — placeholder) | **PENDING — sweep in progress, not yet resolved to findings** | Cross-reference every view's advertised hint text (StatusLine.tsx `HINTS`, HelpOverlay.tsx `ROWS`) against the actual `useKeymap()` call sites in each view (see this recon's own Q1 table for the ground truth) | `evidence/phase-6/run-20260917T144428-surface-hunter-seed/hunter-seed/` contains 28 fresh screenshots including `step-07-chat-ask-box-escape-noop-defect.png` — **filename itself asserts a NEW defect** (escape appears to no-op on the chat ask box) that is not yet in findings.json, not yet triaged, and not yet fixed. This row is a placeholder: the sweep that would produce F-10 (and possibly more) has NOT completed as of this recon. Do not treat this as closed. |
| F-15 | Terminal color-rendering instrument limitation — NOT an app defect | `evidence/phase-6/run-20260917T160211Z-gates/scratch/F-15-instrument-adjudication.json` (self-labels `not_filed_as_new_defect`) | **ADJUDICATED — NOT A DEFECT, informational only, NOT counted in the RECONCILIATION totals below** | N/A — this row exists to record that the investigation happened, not to gate anything | Exhausted 3 independent instruments (tuistory PNG capture, tuistory `--fg`/`--bg` filters, raw `script -F` capture bypassing tuistory entirely) — none could observe a single SGR color escape anywhere in this session's capture chain, for either theme, even with `TERM=xterm-256color`+`COLORTERM=truecolor` forced. Adjudicated as a tmux-nested-PTY→tuistory-PNG conversion-chain limitation, not an app color-application defect. Cross-referenced from P6.1b above. Not yet added to `findings.json` (that ledger currently ends at F-14; whoever owns it next should record this as an out-of-band note, not a numbered defect). |
| F-16 | AI conflict resolution failed with `Invalid JSON response` on every attempt — router always SSE-frames its output (trailing `data: [DONE]\n\n`), which `generateText()`'s non-streaming `doGenerate()`/`safeParseJSON` path rejects as invalid JSON | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p5new-ai-resolve-result.json` (discovery, 3/3 failures pre-fix); `apps/desktop/src/main/ai/runners/merge-resolver.ts` (fix, marker `[APERANT-PATCH merge-resolver-stream] (2026-09-17)`) | **PROVEN (fixed, re-driven 3/3 against fresh conflicts, uncommitted)** | Induce a real conflict, trigger AI resolution, confirm markers removed and content coherent — repeat against several independently-induced conflicts | `git status` shows `merge-resolver.ts` modified, uncommitted. Fix switches `generateText()` to `streamText()`/`fullStream` accumulation, whose SSE parser expects and discards `data: [DONE]` as a normal terminator rather than rejecting it. Independently re-driven this session against 3 freshly-induced conflicts (`evidence/phase-6/run-20260917T173809Z-f16-redrive/scratch/F-16-redrive-verdict.json`, each via `merge --abort` + re-merge to guarantee genuine fresh state): 3/3 succeeded, zero recurrences of `Invalid JSON response`, markers genuinely removed from disk each time, resolved content coherent and never auto-committed (`git status` stayed `UU` throughout), exact success toast captured verbatim on attempt 3. **Must be committed before it counts as durably fixed.** Cross-referenced as P5.4 above. |
| F-17 | Board showed BACKLOG 0% for a task whose worktree plan was actually `human_review` 14/14 complete — task status did not sync from the worktree's real plan file onto the board, including after a full app restart | `evidence/phase-6/run-20260917T173051-f17-board-status/` (repro + fix proof) | **PROVEN (fixed, re-driven post-restart, uncommitted)** | Confirm the board reflects a worktree's real plan-file status both live and after a cold app restart | 4-frame BEFORE/AFTER/restart sequence (`evidence/phase-6/run-20260917T173051-f17-board-status/`): BEFORE shows `002-symb` at BACKLOG 0% on the board despite the worktree's own plan being `human_review` 14/14; AFTER (post-fix) shows the board correctly reading `[REVIEW]` 14/14; a full **cold restart** (fresh TUI process, not just a re-navigate) still shows `[REVIEW]` 14/14, with 3+ distinct sha256 frames proving this is not a stale-frame artifact. Separately confirmed via `agent-events.jsonl`: 0 `plan-sync-failed` events across 236,220 log lines for the full session. This was the last open functional gate from this session and is now closed. |
| F-18 | `a` (add-Anthropic) binding in SettingsView cannot create a SECOND Anthropic-compatible account — `provisionAnthropicAccount()` keys off `provider === 'anthropic'` and OVERWRITES the existing account's credentials/baseUrl in place instead of appending a new one, so a user with one Anthropic-compatible router who wants to add a second has no working path via that binding | discovered during the P6.2 multi-account re-drive, `evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/` | **OPEN (found, not fixed this session)** | Provision a first Anthropic-compatible account, then attempt to provision a second distinct Anthropic-compatible account via the same `a` binding; confirm whether a second account entry is appended or the first is overwritten | `apps/tui/src/services/account-service.ts:172`: `provisionAnthropicAccount()` matches on `provider === 'anthropic'` and writes in place rather than appending — read directly this session while investigating the P6.2 re-drive path. Severity MEDIUM, screen: settings. Distinct from the P6.2 gate itself, which passes (the second account used for this session's P6.2 proof was provisioned via the moonshot slot, not by exercising this broken second-Anthropic path). Not yet added to `audit-evidence/cycle-01/findings.json` — same "found this session, not yet in the JSON ledger" state as F-09 was before it. |

**Note on F-10+ candidate already visible in evidence:** the file
`step-07-chat-ask-box-escape-noop-defect.png.txt` (read this session) shows
the InsightsView ask box with `? q` typed in — the filename's own label
("escape-noop-defect") asserts `escape` did not close the ask box as
expected. This recon did **not** independently verify that claim against
source (no InsightsView `escape` handler was found bound to the ask-box
`TextInput` in the Q1 pass — the `TextInput`'s `onSubmit` is Enter-only, and
no `useKeymap({escape: ...})` scoped to `asking===true` exists in
InsightsView.tsx). If that absence is confirmed intentional-vs-bug by the
next session, it becomes F-10 with a real severity and fix.

---

## I. Phase 5 — Worktrees, Merge, Git Forges (ROADMAP.md:14, "pending")

Gate (verbatim): "Worktree list matches `git worktree list` exactly. A merge
executed from the TUI actually merges — verified by `git log` on the target
branch. A PR created from the TUI appears on GitHub. AI conflict resolution
resolves a real induced conflict."

Decomposed into its four independent claims per instruction rule 4 — do not collapse:

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P5.1 | Worktree list matches `git worktree list` exactly | ROADMAP.md:14 | **PROVEN THIS SESSION** | Diff the WorktreeView-rendered list against real `git worktree list --porcelain` output for the same project | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p5.1-result.json`: byte-level set diff of (path, branch) tuples between `git_authoritative` and `ui_rendered` — `set_diff_git_minus_ui: []`, `set_diff_ui_minus_git: []`, verdict PASS. Screenshot: `step-02-gate-p5.1-worktree-list.png`. WorktreeView/worktree-actions.ts added since the original recon (Phase 5 landed this session). |
| P5.2 | A merge executed from the TUI actually merges — verified by `git log` on the target branch | ROADMAP.md:14 | **PROVEN THIS SESSION** | Trigger a merge action from the TUI, `git log` the target branch, confirm the merge commit | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p5new-merge-real-result.json`: real merge commit `1be7685f8969bca5808749c76aad51d30efb64cd` ("Merge branch 'feature/divergent'"), confirmed via `git log --oneline --all --graph`. Merge safety guards (self-merge + dirty-tree refusal) independently PASS (`gate-p5new-merge-guards-result.json`), diff pane matches `git diff HEAD` exactly (`gate-p5new-diffpane-result.json`). |
| P5.3 | A PR created from the TUI appears on GitHub | ROADMAP.md:14 | **PARTIAL — push mechanism PROVEN; GitHub-appearance claim UNVERIFIED (correctly)** | Same blocker class as before but now for a different reason: `p` is bound and `createWorktreePR()` runs, but the scratch repo initially had no `origin` remote | First attempt (`evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p5new-pr-result.json`): `gh 2.101.0` installed+authenticated; push failed cleanly (`fatal: 'origin' does not appear to be a git repository'`) — no remote configured at all. **Re-driven with a real local git remote** (`evidence/phase-6/run-20260917T173809Z-f16-redrive/scratch/F-16-redrive-pr-local-origin-result.json`): `git init --bare /tmp/aperant-gate-origin.git; git remote add origin ...` (entirely local, no real GitHub host touched), then `p` pressed against the `feature/conflict-branch` worktree — `git push --set-upstream origin <branch>` **succeeded**, independently verified via `git -C /tmp/aperant-gate-origin.git log --oneline feature/conflict-branch` showing commit `0e5ca18` present on the bare remote, exactly matching the worktree's HEAD. `gh pr create` then correctly and honestly failed (`"none of the git remotes configured for this repository point to a [GitHub host]"`) because the local bare repo has no GitHub association — this is the app behaving correctly, not a defect. **This proves the TUI's push half of the PR flow is real and functional; only the final "PR appears on GitHub" claim remains unverified**, because that requires a real disposable GitHub repo, which was declined per instructions (correct restraint, not a defect). |
| P5.4 | AI conflict resolution resolves a real induced conflict | ROADMAP.md:14 | **PROVEN THIS SESSION — re-driven after the fix, 3/3 PASS** | Induce a real merge conflict, trigger AI resolution, verify the conflict markers are gone and the resolution is semantically correct | First attempt, pre-understanding-the-fix (`evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p5new-ai-resolve-result.json`): real induced conflict on `app.py`, 3 deterministic attempts, all failed with `Invalid JSON response`. Root cause: `generateText()`'s `doGenerate()` requires the ENTIRE HTTP response body to be exactly one well-formed JSON document; this router always frames its output as SSE even for non-streaming requests, appending a trailing `data: [DONE]\n\n` that `safeParseJSON` rejects. Fixed: `merge-resolver.ts` now uses `streamText()`/`fullStream` (`// [APERANT-PATCH merge-resolver-stream] (2026-09-17)`, `apps/desktop/src/main/ai/runners/merge-resolver.ts`), whose SSE parser expects and discards `data: [DONE]` as a normal stream terminator. **Fix independently re-driven this session against 3 fresh, separately-induced conflicts** (`evidence/phase-6/run-20260917T173809Z-f16-redrive/scratch/F-16-redrive-verdict.json`, each attempt used `merge --abort` + re-merge to guarantee a genuinely new conflict rather than reusing state): all 3/3 succeeded — conflict markers genuinely removed from disk each time, resolved content coherent (single side chosen cleanly, the unrelated `CONSTANT = 1` line preserved untouched in all 3), never auto-committed (`git status` remained `UU` throughout every attempt), zero recurrences of `Invalid JSON response` across all 3 (vs. 3/3 failures with that exact error pre-fix). Attempt 3 additionally captured the exact success toast verbatim via a 12-frame streaming capture spanning the full ~12-20s call: `"AI resolved 1 file(s) — NOT committed: review in the diff pane, then git add / git commit yourself"`. This is genuine end-to-end proof, not an inference from the code fix — mark PASS. |
| P5.5 (carried from D) | Task execution under the TUI creates a real, isolated git worktree (not direct-mode) | phase-2.5-VALIDATION.md:59-63 | **PROVEN THIS SESSION** | Start an agent, confirm `git worktree list` gains a new entry for that task | `evidence/phase-6/run-20260917T153142-linked-hunter-seed/`: `stage5-agent-started` through `final-board-terminal-state` (34 captures) independently drive a task from spec-conversion through a full 14/14-subtask autonomous build inside a real local-only worktree, confirmed via progressive real commit counts (2→14) visible on-screen at each stage. Separately re-proven via the F-17 run (`run-20260917T173051-f17-board-status/`), which shows the same worktree's `human_review` plan status correctly surfacing on the board post-exit and post-restart. |

**Important scope note:** the ad hoc `evidence/phase-5/run-20260917T003750-tuistory-linked/VERDICT.md` (12 rows, all claimed PASS) is real evidence and is NOT itself in RETRACTION.md — only three of its specific screenshot artifacts (R1, R2 above) are retracted, plus one vitest number (R5) it cited. Its criteria 3, 5, 6, 7, 8, 9, 12 are NOT retracted and describe real behavior (roadmap/insights/ideation/linked-workflow/work-product/tracing/no-secrets), but they overlap with Phase 4's own gate text, not Phase 5's ROADMAP.md gate text (worktree/merge/PR/conflict). They are cross-referenced under section F (Phase 4) where applicable, not counted twice under Phase 5.

---

## J. Phase 6 — Context, Settings, Onboarding (ROADMAP.md:15, "pending")

Gate (verbatim): "Theme change applies instantly across all views. Profile
switch changes the active credential and the next agent run uses it.
Onboarding completes on a machine with no `~/.aperant/` and ends in a
working board."

Decomposed into its three claims:

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P6.1a | Theme change applies instantly across all views — STATE-APPLICATION dimension | ROADMAP.md:15 | **PROVEN THIS SESSION** | Change theme in Settings, navigate to every other view, confirm the app-level theme state updates | `evidence/phase-6/run-20260917T160211Z-gates/scratch/`: 14-frame before/after theme-cycle sweep (ice→cyberpunk) across all 7 views; settings-panel TEXT ("cyberpunk ACTIVE") confirmed as app-state ground truth independent of pixel rendering, per `F-15-instrument-adjudication.json`'s own `p6.1_corrected_verdict`. Positive control (focus-border glyph swap) confirmed the capture pipeline CAN detect real changes when they occur, ruling out a broken instrument as the explanation for this dimension being provable. |
| P6.1b | Theme change applies instantly across all views — COLOR-RENDERING dimension | ROADMAP.md:15 | **UNVERIFIED (instrument limitation, not an app defect)** | Observe per-cell ANSI/SGR color output changing between themes | `F-15-instrument-adjudication.json`: exhausted 3 independent instruments — (a) tuistory PNG screenshots (31-37 colors in every captured PNG this run, ALL exactly tuistory's fixed renderer defaults #1a1b26/#c0caf5, zero theme hex values of any kind); (b) tuistory `--fg`/`--bg` snapshot filters (returned EMPTY even for definitely-present black/white); (c) raw `script -F` capture bypassing tuistory entirely with TERM=xterm-256color + COLORTERM=truecolor forced (7681 real bytes, ZERO SGR color escapes of any form). Palette-collision ruled out (cyberpunk #FF6B35 vs ice #38BDF8 quantize to distinct 256-indices 203 vs 75). **Explicitly not filed as an app color-application defect** — all evidence points at the tmux-nested-PTY→tuistory PNG conversion chain, not the app. |
| P6.2 | Profile switch changes the active credential and the next agent run uses it | ROADMAP.md:15 | **PROVEN THIS SESSION (CORRECTED)** — bidirectional live proof now exists; a prior draft of this row was wrong that no second credential exists | Provision two accounts, switch `globalPriorityOrder` head, start an agent, confirm it authenticates against the NEW account's baseUrl/key, in BOTH directions on the same task | `evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/` (9 captures, 0 `secret_hits` across every capture): two real routes ARE configured in this environment (moonshot @ baseUrl-20219, anthropic-compatible @ baseUrl-20128) — the earlier claim that only one credential existed was made without reading the routing config and is corrected here. Bidirectional switch proven on the same task in the same session: activate anthropic → next agent run resolves provider=anthropic (steps 2-3 confirm switch, step 3/4 confirm agent-run resolution); switch back to moonshot → next agent run resolves provider=moonshot (steps 4-6, re-driven with `ANTHROPIC_DEFAULT_SONNET_MODEL` confound removed from the env — see methodology note below); switch to anthropic a second time → next agent run again resolves provider=anthropic (steps 7-8). Bidirectional is the discriminating test: either direction alone could pass by coincidence (e.g. a default-account fallback), but the correct provider resolving on BOTH switches, confirmed against both the live CONFIG panel text and the on-disk `globalPriorityOrder` head at each step, rules that out. `~/.aperant/settings.json` was backed up before the test (`~/.aperant/settings.json.bak-20260917T181250Z`) and restored byte-identical afterward (diff exit 0) — no persistent state change to the operator's real config. **Methodology note (false-fail caught and corrected, not a defect):** the first run of this gate produced a FALSE FAIL — the driver's default environment pinned every requested model to one provider regardless of the active account, traced to `apps/desktop/src/main/ai/config/types.ts:161`'s prefix→provider map, which structurally excluded the other account from the routing queue independent of switch state. Re-running with a clean env (no `ANTHROPIC_DEFAULT_SONNET_MODEL` override) produced the true bidirectional result recorded above (captures 5-8, captioned "clean env, no model-provider confound"). This is the class of confound that produces a wrong verdict if not caught — flagged here because the driver caught its own artifact instead of silently reporting a false FAIL. Separately, the F-12 account-selection PRIORITY-ORDER fix (`agent-start-service.ts`, `applyAccountEnv()` now reuses `buildDefaultQueueConfig()` instead of array-insertion-order `.find()`) remains independently verified via a discriminating two-account FIXTURE test (providerAccounts fixed at [B,A]; head A → identity A exported, head B → identity B exported). |
| P6.3 | Onboarding completes on a machine with no `~/.aperant/` and ends in a working board | ROADMAP.md:15 | **PARTIAL** | Fresh-boot with `APERANT_USER_DATA` pointed at an empty temp dir, confirm config-service/electron-shim both create defaults gracefully and the board renders (even if empty) | `config-service.ts:29` (`loadConfig`: `!fs.existsSync(p)` → returns Zod defaults) and `libs/electron-shim/index.js:36-48` (creates `userData`/`logs`/etc. dirs on demand) are both architecturally cold-start-safe per this session's Q3 recon. Phase 4's own gate note (`phase-4-PLAN.md:12-19`) says vigil started with no `.auto-claude/` and that IS a real cold-start proof for the roadmap/board surface — but it is not framed or evidenced as an explicit "no `~/.aperant/`" onboarding test, and no `evidence/phase-6/` artifact isolates a from-scratch `~/.aperant/` boot |

---

## K. Phase 7 — Performance & Resilience (ROADMAP.md:16, "pending")

Gate (verbatim): "200-task board scrolls at >=60fps. Resize from 200x50 ->
80x24 reflows without corruption. Killing a PTY child leaves the TUI
responsive. Renders coherently in `TERM=xterm-256color` and `TERM=xterm`."

Decomposed into its four claims:

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P7.1 | 200-task board scrolls at >=60fps | ROADMAP.md:16 | **PENDING** | Generate a 200-task fixture, scroll, measure frame timing | `build-fixture.py` builds only a handful of specs (4 in the observed template); no 200-task fixture or fps measurement harness exists in `tools/` |
| P7.2 | Resize from 200x50 -> 80x24 reflows without corruption | ROADMAP.md:16 | **PROVEN THIS SESSION** | Resize a live session mid-render, screenshot before/after | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p7.2-result.json`: 200x50 → 80x24 → 90x30 → 250x60 → 200x50 (round trip), layout correctly reflowed at every step, no corruption/overlap/broken borders, final settled state confirmed clean at every size including back at the original 200x50. One benign timing note recorded (a SIGWINCH re-render occasionally lags one keypress behind — never affected the FINAL settled frame in either capture). |
| P7.3 | Killing a PTY child leaves the TUI responsive | ROADMAP.md:16 | **PROVEN THIS SESSION** | Kill the shell process inside TerminalView with `kill -9` from OUTSIDE the app, confirm `r` (respawn) still works and other tabs remain interactive | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p7.3-result.json`: real shell PID 51641 identified via `echo $$`, killed with `kill -9` from outside, confirmed dead via `ps -p`; app did NOT crash, showed the honest "shell exited" / "press r to respawn" state; `r` respawned a genuinely NEW PID (55743, confirmed via `ps`), functional (real command echoed correctly); board and tree tabs both remained fully responsive throughout. All 4 sub-checks PASS. |
| P7.4 | Renders coherently in `TERM=xterm-256color` and `TERM=xterm` | ROADMAP.md:16 | **PROVEN THIS SESSION** | Launch under each TERM value, screenshot, compare for corruption | `evidence/phase-6/run-20260917T160211Z-gates/scratch/gate-p7.4-result.json`: both TERM values booted and rendered coherently, layout and box-drawing intact in both; `TERM=xterm-256color` correctly resolved the 256-color tier, `TERM=xterm` correctly degraded to the 16-color ANSI tier per the app's own `truecolor.ts` tier-detection design — expected, correct behavior, not corruption. |

---

## L. Phase 8 — Distribution (ROADMAP.md:17, "pending")

Gate (verbatim): "`npm i -g @aperant/tui && aperant` works on a clean macOS,
Ubuntu, and WSL2 machine."

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P8.1 | `npm i -g @aperant/tui && aperant` works on a clean macOS machine | ROADMAP.md:17 | **PENDING — EXPLICITLY OUT OF SCOPE for the current run per operator directive.** The operator has stated (per this session's instruction context: "don't worry about Linux CI, don't worry about any of that") that distribution/CI verification is not part of the current work scope. This is recorded PENDING (not DESCOPED) because ROADMAP.md itself has not formally descoped Phase 8 the way it formally descoped Phase 3 (ROADMAP.md:12 names an explicit operator directive + date; no equivalent Phase 8 descoping citation exists in any read source) — the operator's verbal scoping instruction narrows *this session's* work, it does not amend the roadmap document itself. | n/a — deliberately not being pursued right now | n/a |
| P8.2 | ...works on a clean Ubuntu machine | ROADMAP.md:17 | **PENDING — EXPLICITLY OUT OF SCOPE**, same basis as P8.1 | n/a | n/a |
| P8.3 | ...works on a clean WSL2 machine | ROADMAP.md:17 | **PENDING — EXPLICITLY OUT OF SCOPE**, same basis as P8.1 | n/a | n/a |

**This out-of-scope status is time-bound to the current operator directive,
not permanent.** If a future session removes that directive, Phase 8 reverts
to ordinary PENDING and needs real cross-platform install proof — none
currently exists; `apps/tui/package.json:14` (`build`) and `:15` (`start`)
scripts exist and were exercised locally (Phase 5's regression checks ran
`npm run build` successfully per `phase-5/.../VERDICT.md:25`), but no
cross-platform `npm i -g` install-and-run test has ever been executed.

---

## M. Phase 3 — Terminal Emulation (DESCOPED, ROADMAP.md:12)

Original gate (verbatim): "PTY pane runs a real shell; `ls --color`, `htop`,
and `vim` all render correctly. Claude Code invoked from a pane produces
streaming output with correct ANSI colors. Four simultaneous panes sustain
>=30fps under continuous output. Zoom mode renders vim byte-identically to a
native terminal."

| id | criterion | source | status | how it must be verified | required evidence |
|---|---|---|---|---|---|
| P3.a | Full Phase 3 gate (multi-pane emulation-proof: htop/vim rendering, Claude Code streaming, 4-pane 30fps, zoom-mode byte-identical vim) | ROADMAP.md:12 | **DESCOPED** — "2026-09-15 by operator directive (single Phase-1 shell pane remains; multi-pane/zoom/emulation-proof work scrapped)" | n/a — explicitly not required per operator directive cited in the roadmap itself | Citation: `ROADMAP.md:12` |
| P3.b | Residual single Phase-1 shell pane (what DOES remain of "terminal-in-terminal") | (subsumed into A2/P1.8) | **PROVEN** — this is Phase 1's tab-2 "term" view, not a separate Phase 3 obligation | `TerminalView.tsx` + `PtyPane.tsx` real `node-pty` spawn, confirmed Q1/Q2 recon | Phase 1 gate P1.8 evidence; tui-surface criterion 8 (real shell, `ls proofpunk_agent` listing) |

Per instruction rule 1: this is recorded DESCOPED with citation, not
silently dropped, and NOT resurrected as a pending obligation.

---

## N. Criteria that require a LIVE PROVIDER (credential-blockable)

The following criteria across the inventory above are gated on real
provider credentials being present and the endpoint being reachable/stable.
If credentials are absent or the endpoint fails mid-stream, these are the
rows that go UNVERIFIED-not-simulated rather than PASS/FAIL:

- P2.6 — Agent stream shows real spec/plan/code phase output; progress advances (Phase 2's own gate instance never closed — closed later elsewhere)
- P2.5.2, P2.5.3, P2.5.4, P2.5.5 — account provisioning resolution, agent start/stream, real work product (Phase 2.5)
- P3.5.1, P3.5.2, P3.5.4, P3.5.6, P3.5.9, P3.5.12 — every "live agent run" observability criterion (Phase 3.5)
- P4.1, P4.2, P4.3, P4.4, P4.5, P4.6 — every Phase 4 roadmap/insights/ideation/linked-execution criterion
- P5.2, P5.3, P5.4 — merge/PR/AI-conflict-resolution (Phase 5) will additionally need GitHub API credentials, a distinct credential surface from the AI provider
- P6.2 — profile switch + next-run credential verification
- Router settled per your message: live endpoint is `http://127.0.0.1:20128/v1` (local 9router, PID 3165), sole account in `~/.aperant/settings.json`, serves both `glm/*` and `cc/*` model families. This resolves the endpoint identity for all rows above that cite a live run against "the router" — they were run against this same local 9router instance, not against `router.hack.ski`/`home.hack.ski` (see contradiction note below).

---

## O. Additional CONTRADICTIONS found in the sources (beyond the router conflict already resolved)

1. **Ideation category count: "five" vs "six".** `ROADMAP.md:13` (Phase 4
   gate, quoted as verbatim-from-spec) and `phase-4-PLAN.md:8` both say
   "Ideation returns real findings in all **five** categories." The actual
   source code (`InsightsView.tsx` `IDEATION_TYPES` constant, confirmed this
   session's Q1 recon and the prior turn's report) has **six** categories:
   `code_improvements`, `ui_ux_improvements`, `documentation_gaps`,
   `security_hardening`, `performance_optimizations`, `code_quality`. Every
   later validation document (`phase-4-VALIDATION.md`, the tui-surface
   `VERDICT.md`, findings.json F-01) correctly uses "six"/"all 6" and treats
   the original ROADMAP.md gate text as stale. This document follows the
   later, code-verified count (six) throughout, per F-01's own fix.

2. **Endpoint host drift across phases (the one you already flagged, with one more data point).** In addition to the `router.hack.ski` (Phase 4 original run) vs `home.hack.ski:20219` (phase-4-PLAN.md:26) vs the now-settled `127.0.0.1:20128` (live probe) — `phase-2.5-PLAN.md:7` cites yet a FOURTH host string: `http://home.hack.ski:20128/v1` for the original Moonshot combo endpoint. Across the five phase documents read for this inventory there are at minimum four distinct host references (`router.hack.ski`, `home.hack.ski:20128`, `home.hack.ski:20219`, `127.0.0.1:20128`) for what may be the same evolving local gateway across different sessions/dates, or may be genuinely different endpoints at different times. This document does not attempt to reconcile which historical run used which host — only notes that no single document states the mapping, and the CURRENT live-probed truth (127.0.0.1:20128, PID 3165) should be treated as authoritative for any NEW work, not any of the historical hostnames.

3. **`ROADMAP.md`'s Phase 4 status line vs the later superseding run.**
   `ROADMAP.md:13` itself still reads "**PARTIAL** 2026-09-16 — … ideation
   PARTIAL (1/6 categories …), agent work product + UI facet UNVERIFIED
   (agent-tty cannot paint Ink on macOS …)" — this line in ROADMAP.md was
   **never updated** after the 2026-09-17 `tui-surface` run proved the UI
   facet, fixed D19 to get a real work product, and fixed D20 to get 6/6
   ideation. `phase-4-VALIDATION.md` itself carries a "SUPERSEDED" note
   (lines 11-19) acknowledging this, but `ROADMAP.md` — the top-level gate
   table this whole inventory treats as the binding spec text — was not
   edited to match. This is a live drift between the roadmap's summary
   status and the actual current state of Phase 4, and is the reason
   sections F above are marked PROVEN rather than PARTIAL/UNVERIFIED: this
   document trusts the later, more specific, code-and-artifact-verified
   VALIDATION document over the stale top-level ROADMAP.md status string.

4. **F-06/F-07/F-08/F-09 fixes are real but uncommitted.** `findings.json`
   itself records `"commit": "pending"` for F-06, F-07, F-08 — and this
   session's `git status` (checked as part of this pass) confirms all three
   files plus `InsightsView.tsx` (carrying the new, unrecorded F-09 fix) are
   still modified-but-uncommitted in the working tree. `findings.json` also
   carries a header note that the FILE ITSELF was previously committed once
   already (in `3d96287`) while still holding its PRE-fix content for F-04 —
   i.e., this exact failure mode (a ledger file committed out of sync with
   the code it describes) has already happened once in this repo's history.
   Nothing in the current uncommitted state has yet been committed, so the
   same class of drift is currently live again for F-06/F-07/F-08/F-09.

---

## P. INFERRED, not source-backed (appendix — no source states these; do not treat as binding)

- Whether the "profile switch" mechanism referenced in P6.2 is meant to be a
  NEW keybinding to be built, or whether `globalPriorityOrder` reordering
  via manual settings.json edit (already possible, unverified through the
  TUI) is meant to satisfy the gate. No source states which.
- Whether Phase 5's worktree-list-matches-exactly criterion (P5.1) is
  expected to be a byte-diff of terminal-rendered text against `git
  worktree list --porcelain` raw output, or a looser semantic-equivalence
  check (same paths/branches/heads, formatting aside). No source specifies
  the comparison method.
- Whether "killing a PTY child" in P7.3 means the shell process itself
  exiting (already handled) or an external `kill -9` on the PTY's OS
  process while the TUI is unaware — these are materially different tests
  and no source disambiguates.
- Whether the F-10+ escape-noop observation in the chat ask box (section H)
  is actually a defect or intentional (e.g., matching the D18 text-input
  lockout design where the global keymap deliberately stands down while
  `asking===true`, and Enter/submit is meant to be the only exit). This
  document does not classify it as F-10 because that classification itself
  would be inferred, not sourced — it is left as an open, unresolved
  observation for the next session to triage.

---

## RECONCILIATION

**This session added 3 new criterion rows to the table** (not present in the
prior 77-row version): **F-16** and **F-17** (section H — two real defects
found, fixed, and independently re-driven this session), and the **P6.1
split into P6.1a/P6.1b** (section J — one row became two because the color
question genuinely has two independent dimensions with different verdicts;
see P6.1's original note above for why). **F-15 is explicitly NOT counted**
here — it is an instrument-limitation adjudication, not an application
defect, and its own row says so. The total therefore grows from **77 to
80** (77 + 2 (F-16, F-17) + 1 (P6.1 split) = 80).

Counting every row given an id in sections B through M (excluding section A
"true success criteria" rollups, section N which is a cross-reference view
not new rows, and section O/P which are narrative, not criteria) — every
row above that carries its own `id` column entry (F-15 excluded per the
note immediately above — it is deliberately not a countable criterion):

| Section | Count of rows |
|---|---|
| B — Phase 1 (P1.1–P1.10) | 10 |
| C — Phase 2 (P2.1–P2.7) | 7 |
| D — Phase 2.5 (P2.5.1–P2.5.7) | 7 |
| E — Phase 3.5 (P3.5.1–P3.5.13) | 13 |
| F — Phase 4 (P4.1–P4.8) | 8 |
| G — RETRACTED (R1–R5) | 5 |
| H — findings.json (F-01–F-09, F-10+ placeholder, F-16, F-17 — F-15 excluded, see note) | 12 |
| I — Phase 5 (P5.1–P5.5) | 5 |
| J — Phase 6 (P6.1a, P6.1b, P6.2, P6.3) | 4 |
| K — Phase 7 (P7.1–P7.4) | 4 |
| L — Phase 8 (P8.1–P8.3) | 3 |
| M — Phase 3 descoped (P3.a, P3.b) | 2 |
| **TOTAL** | **80** |

Per-status bucket count (each row counted once, by its stated status; rows
recorded as a transition, e.g. "RETRACTED → now separately re-proven" or
"PARTIAL in original run → PROVEN in tui-surface re-run", are counted under
their FINAL stated status — i.e. the bolded status word actually written at
the start of that row's own "status" cell above, re-read one row at a time
for this tally rather than estimated):

**This session's status changes are highlighted in *italics* below** —
every other cell is unchanged from the prior 77-row version.

| Section | PROVEN | RETRACTED | PARTIAL | UNVERIFIED | PENDING | DESCOPED | rows |
|---|---|---|---|---|---|---|---|
| B — Phase 1 | P1.1–P1.10 (10) | — | — | — | — | — | 10 |
| C — Phase 2 | P2.1–P2.5, P2.7 (6) | — | — | — | P2.6 (1) | — | 7 |
| D — Phase 2.5 | P2.5.1–P2.5.7 (7) | — | — | — | — | — | 7 |
| E — Phase 3.5 | P3.5.1,2,4,6,8,9,10,12 (8) | — | P3.5.3, P3.5.13 (2) | — | P3.5.5,7,11 (3) | — | 13 |
| F — Phase 4 | P4.1,2,3,4,5,6,7,8 (8) | — | — | — | — | — | 8 |
| G — Retraction | *— (all 5 re-proven/re-confirmed, see closing note above section H, still bucketed RETRACTED per rule 2)* | R1,2,3,4,5 (5) | — | — | — | — | 5 |
| H — findings.json | *F-01..F-09, F-16, F-17 (11)* | — | — | — | F-10+ (1) | — | 12 |
| I — Phase 5 | *P5.1, P5.2, P5.4, P5.5 (4)* | — | *P5.3 (1)* | — | — | — | 5 |
| J — Phase 6 | *P6.1a (1)* | — | *P6.2, P6.3 (2)* | *P6.1b (1)* | — | — | 4 |
| K — Phase 7 | *P7.2, P7.3, P7.4 (3)* | — | — | — | P7.1 (1) | — | 4 |
| L — Phase 8 | — | — | — | — | P8.1,2,3 (3) | — | 3 |
| M — Phase 3 | P3.b (1) | — | — | — | — | P3.a (1) | 2 |
| **TOTAL** | **59** | **5** | **5** | **1** | **9** | **1** | **80** |

59 + 5 + 5 + 1 + 9 + 1 = **80** — matches the row count exactly.

**Old vs new bucket counts, for direct comparison:**

| Bucket | Old (77-row table) | New (80-row table) | Delta |
|---|---|---|---|
| PROVEN | 49 | 59 | +10 |
| RETRACTED | 5 | 5 | 0 |
| PARTIAL | 7 | 5 | -2 |
| UNVERIFIED | 0 (bucket did not exist) | 1 | +1 (new bucket) |
| PENDING | 15 | 9 | -6 |
| DESCOPED | 1 | 1 | 0 |
| **TOTAL** | **77** | **80** | **+3** |

**Why PROVEN jumped by 10, not just the 4 obviously-new-this-session rows
(P5.1, P5.2, P5.4, P5.5, P7.2, P7.3, P7.4, P6.1a, F-16, F-17 — that actually
is 10 rows, counted precisely):** every one of those 10 is a row that
carried a different status (PARTIAL or PENDING) in the prior 77-row table
and is bolded PROVEN in this session's updated table above — none of them
is a pre-existing PROVEN row being re-counted. Listed exactly: P5.1
(PARTIAL→PROVEN), P5.2 (PENDING→PROVEN), P5.4 (PENDING→PROVEN, via the
F-16 redrive), P5.5 (PARTIAL→PROVEN), P7.2 (PENDING→PROVEN), P7.3
(PARTIAL→PROVEN), P7.4 (PENDING→PROVEN), P6.1a (new row, replaces half of
the old P6.1 PARTIAL row, itself PROVEN), F-16 (new row, PROVEN), F-17
(new row, PROVEN). That is exactly 10.

**Why PARTIAL dropped by 2 net despite J gaining 2 PARTIAL rows (P6.2,
P6.3):** I's two PARTIAL rows (P5.1, P5.5) both moved to PROVEN this
session (+2 PROVEN, -2 PARTIAL from section I), while J's split added one
new PARTIAL-eligible row pairing (P6.1 was itself never PARTIAL in the old
table — it was recorded PARTIAL before, and its split produces PROVEN
P6.1a + UNVERIFIED P6.1b, net PARTIAL change from J is 0 since the original
P6.1 row is gone and P6.2/P6.3 keep their PARTIAL status unchanged). Net:
I contributes -2 PARTIAL, J contributes 0 net PARTIAL change (P6.1's old
PARTIAL slot is replaced by PROVEN+UNVERIFIED, P6.2/P6.3 unchanged) = -2
total, matching the table above.

**Why PENDING dropped by 6:** P5.2, P5.3(partial now, not pending), P5.4
moved off PENDING in section I (-3); P7.2, P7.3, P7.4 moved off PENDING in
section K (-3). Total -6, matching.

Three notes on how this tally was built, stated plainly rather than hidden:

1. **F-06/F-07/F-08/F-09 remain counted PROVEN, not PARTIAL**, because each
   row's own status cell above is bolded `PROVEN (fixed IN WORKING TREE,
   uncommitted...)` — the fix itself was independently re-verified against
   source this session, which is what "evidence exists AND is not
   retracted" (the PROVEN definition) requires. The uncommitted state is a
   **durability risk**, not a proof gap, and is called out explicitly in
   each of those rows and again in contradiction note O.4 — but per the
   strict status vocabulary given, it does not change the bucket. An
   earlier draft of this table miscounted these four rows as PARTIAL by
   mistake; this is the corrected version.
2. **R4 remains counted RETRACTED, not PARTIAL or PROVEN**, per instruction rule
   2 ("every RETRACTION.md item must appear as its own row with status
   RETRACTED, because each needs re-proving") — its row text notes a live
   re-capture exists that LOOKS fixed, but that re-capture has not been
   folded into a superseding VALIDATION.md, so R4 itself stays RETRACTED
   per the rule rather than being upgraded on this document's own say-so.
   **This session's re-verification** (`evidence/gate-recheck-session3/`,
   all 3 gates green twice, exit=0) independently reconfirms R5's
   underlying claim was correct, and R1/R2/R3's captures were independently
   re-proven with fresh distinctness-asserted runs — but per the same rule,
   none of R1–R5 is promoted out of the RETRACTED bucket by this document's
   own say-so; the RETRACTION.md ledger itself is the authority that would
   need to record a formal un-retraction, which is out of scope for this
   pass (RETRACTION.md is not owned by this session and was not edited).
3. **F-15 is excluded from every count above** because it documents an
   instrument limitation, not an application defect — including it would
   misrepresent an honest "we could not measure this" finding as a
   trackable criterion with a pass/fail fate. It remains fully cited in
   section H for traceability.


## CORRECTION (post-session, after P6.2 re-drive)

**P6.2 moved from PARTIAL to PROVEN.** The claim "no second credential exists in this environment" in the prior version of this document's P6.2 row was made without reading the routing configuration — it was wrong. Two real provider routes ARE configured. `evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/` (9 captures, 0 `secret_hits`) now proves the multi-account switch bidirectionally: activate anthropic → agent run resolves anthropic; switch back to moonshot → agent run resolves moonshot; switch to anthropic again → agent run resolves anthropic again. Bidirectional is the discriminating test (a single direction could pass on a default-account fallback coincidence). The first attempt at this gate produced a false FAIL from an environment confound (`ANTHROPIC_DEFAULT_SONNET_MODEL` pinning every request to one provider via `apps/desktop/src/main/ai/config/types.ts:161`'s prefix→provider map) — re-run with a clean env gave the true bidirectional PASS. Full detail in the P6.2 row above (section J).

**One new criterion row added: F-18.** Discovered during the P6.2 re-drive: the `a` (add-Anthropic) SettingsView binding cannot create a second Anthropic-compatible account — `provisionAnthropicAccount()` (`account-service.ts:172`) overwrites the existing account in place rather than appending. Severity MEDIUM, status OPEN (found, not fixed). See section H.

**Row count grows from 80 to 81** (the P6.2 status change is a bucket move, not a new row; F-18 is the one new row: 80 + 1 = 81).

**Corrected per-section row counts (delta from the 80-row table above): only section H changes**, from 12 rows to 13 (F-18 added); section J's row count is unchanged at 4 (P6.2 changes status, not count).

| Section | Count of rows (corrected) |
|---|---|
| H — findings.json (F-01–F-09, F-10+ placeholder, F-16, F-17, F-18 — F-15 excluded, see note) | 13 |
| **TOTAL (corrected)** | **81** |
All other sections (B, C, D, E, F, G, I, J, K, L, M) are unchanged from the 80-row table above.

**Corrected per-status bucket table** (only sections H and J change from the prior 80-row bucket table above):

| Section | PROVEN | RETRACTED | PARTIAL | UNVERIFIED | PENDING | DESCOPED | rows |
|---|---|---|---|---|---|---|---|
| H — findings.json | F-01..F-09, F-16, F-17 (11) | — | — | — | *F-10+, F-18 (2)* | — | 13 |
| J — Phase 6 | *P6.1a, P6.2 (2)* | — | *P6.3 (1)* | P6.1b (1) | — | — | 4 |
| **TOTAL (corrected)** | **60** | **5** | **4** | **1** | **10** | **1** | **81** |

60 + 5 + 4 + 1 + 10 + 1 = **81** — matches the corrected row count exactly.

**Old (post-session-3, 80-row) vs new (post-P6.2-correction, 81-row) bucket counts:**

| Bucket | Old (80-row table) | New (81-row table) | Delta |
|---|---|---|---|
| PROVEN | 59 | 60 | +1 (P6.2 PARTIAL→PROVEN) |
| RETRACTED | 5 | 5 | 0 |
| PARTIAL | 5 | 4 | -1 (P6.2 leaves PARTIAL) |
| UNVERIFIED | 1 | 1 | 0 |
| PENDING | 9 | 10 | +1 (F-18, new row) |
| DESCOPED | 1 | 1 | 0 |
| **TOTAL** | **80** | **81** | **+1** |

Net effect: +1 PROVEN (P6.2), -1 PARTIAL (P6.2 leaving that bucket), +1 PENDING (F-18 entering as a new open finding). All three deltas are independently accounted for and sum to the +1 row-count delta correctly (the PARTIAL delta doesn't add a row, so only the PENDING delta from F-18 contributes to the total row-count growth of +1; the PROVEN/PARTIAL pair is a same-row status move, net zero on total row count).

---
*Generated by read-only recon. No source file was edited to produce this document.*
