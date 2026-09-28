# Phase 4 VALIDATION — Linked loop (roadmap → board → agent execution → tracing)

Run: `evidence/phase-4/run-20260928T184623-linked-loop-live2/`
Drive window: 2026-09-28 18:46 → 19:51 UTC.
Target project: `/Users/nick/Desktop/vigil` — a real git repo with real TypeScript
source, driven as the end user through the real TUI in a real 200x50 tmux PTY
(`tools/tui-capture.py`). Every wait below is a `cmd_wait` whose exit code
reflects the CONDITION, not transport, and every quoted result is verbatim
(`matched:true` asserted, never assumed). Full observe→act ledger in
`drive-transcript.md`.

Provider path: `ANTHROPIC_BASE_URL=https://router.hack.ski`, model
`cc/claude-opus-5` via `APERANT_MODEL`, token read from the operator env with
`zsh -lc` and exported INSIDE the tmux pane at session create — never in argv,
`ps` output, the captured grid, or any committed file. `APERANT_USER_DATA`
points outside the repo, so the live `settings.json` (which holds a real
`apiKey`) is never inside `evidence/`; only `settings-redacted.json` is.

## Defects found by driving, and fixed this run

All nine were found by driving the real TUI — none by reading code alone.
Measured `git diff --stat a96ff53..HEAD -- apps/tui/src`: **7 files, +314/-14**.

| # | Defect | Root cause | Fix |
|---|---|---|---|
| D1 | Every Phase 3.5 tracing view rendered `no events yet` / `Σ tokens 0` / `STEPS 0/1000` during a live roadmap run | `observability.ts:214` routed `roadmap-log` at `onLog`, which returns unless the line is worker.ts's `Starting agent session:` banner — so every `Tool: <name>` line was dropped | `onRoadmapLog` folds real runner output (`Tool:`, phase transitions, errors, prose) into the same trace ring the task path uses |
| D2 | GENERATION panel vanished on any tab switch mid-run | `App.tsx` mounts views conditionally, so `RoadmapView` unmounts and its `running`/`progress`/`logBuf` `useState` are destroyed | Rehydrate phase/progress from the runner's own `generation_progress.json` |
| D3 | `agent-events.jsonl` stayed empty for roadmap runs | `attachEventLog` was only ever reached from `startTask()`; `roadmap-service.startGeneration` armed the observability tap but not the durable recorder | `ensureEventLogAttached(am)` in `startGeneration` |
| D4 | Whole frame corrupted mid-run: 34 stacked, never-cleared repaints | Nothing bounded total frame height — the root `Box` carried only `minHeight`, and the roadmap's phase/feature lists grow with DATA. At `outputHeight >= stdout.rows` Ink swaps incremental repaint for a full `clearTerminal` on EVERY frame (`node_modules/ink/build/ink.js:121`) | Root pinned to the terminal height |
| D5 | App crashed at boot: `Rendered more hooks than during the previous render`, exit 1 | My own D4 fix called `useTerminalRows()` AFTER an early return | Hook hoisted above every early return |
| D6 | DETAIL rows interleaved (`n/p to selecte feature 2 …`) once clipped | The pane rendered EVERY feature as a 2-row Box; a clip landing mid-Box merges two features' rows | Cursor-following window (`MAX_DETAIL_FEATURES`), with a `showing X-Y of N` affordance |
| D7 | Root pinned to exactly `rows` still took the full-clear path | The Ink comparison is `>=`, not `>` | Reserve one row (`rows - 1`) |
| D8 | `TASK LOGS` never rendered: rows overwrote each other mid-line | `LogsView` sliced a FIXED 200 rows into a ~45-row pane — the same `outputHeight >= stdout.rows` overflow as D4, in a second view | Window derived from `stdout.rows` |
| D9 | The newest events of a 4,216-line task log were unreachable | The first D8 fix used a fixed 30-row window while `App` clips to `stdout.rows - 1`; on 80x24 only **14** rows render (TitleBar WRAPS at 80 cols), so `maxOffset = lines.length - 15` stranded the tail. Any fixed chrome count is a guess: chrome height depends on terminal WIDTH, not just height | Scroll limit runs to `lines.length - MIN_LOG_ROWS` (reachable under any miscount); added `g`/`G` start/end, since 4,216 rows cannot be crossed one keypress at a time |

## Per-criterion verdicts

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Roadmap generates from REAL codebase analysis | **PASS** | `G` driven in the TUI; GENERATION streamed `RUNNING · discovery 30%` → `features 50%` with live `Tool: Read` / `Tool: Bash` against vigil — `step-07-roadmap-regen-start.png`, `step-11-regen-bounded-frame.png`. Waits: `{"matched": true, "anchor": "RUNNING \u00b7 "}`, `{"matched": true, "anchor": "Phase discovery completed", "waited_s": 156.48}`, `{"matched": true, "anchor": "Phase features completed", "waited_s": 189.68}`. Disk: `roadmap.json` rewritten `generated_at 2026-09-28T19:17:27`, **29 → 39 features**, 10 new ids VG-030…VG-039. Discovery output is genuine static review (`analysis_method: "static source review (README, package.json, tsconfig, src/**, tests/**, …)"`, 13 opportunity areas, and it correctly noted `project_index.json was NOT present`). The agent's own in-frame validation: `All 39 features carry the required fields; MoSCoW buckets exactly partition the feature set`. Copies: `logs/roadmap-before.json`, `logs/roadmap-regenerated-thisrun.json`, `logs/roadmap_discovery-thisrun.json`. |
| 2 | Roadmap item converted to a spec via the TUI (`c`) | **PASS** | `j` to phase-2, VG-006 cursored showing `c → convert this feature to a task spec` (`step-15-roadmap-vg006-selected.png`); `c` → `{"matched": true, "anchor": "spec 006"}`. Disk: `.auto-claude/specs/006-schema-validated-sdk-message-boundary/{spec.md,requirements.json,task_metadata.json}` — and NO `implementation_plan.json` placeholder, which is the documented correct behaviour (an empty `phases: []` would make the orchestrator's `isFirstRun()` skip the planner). Roadmap back-linked: `VG-006 linked_spec_id: 006-schema-validated-sdk-message-boundary`. `step-16-convert-vg006-spec.png`. |
| 3 | Board picks the new spec up, and execution starts from it (`s`) | **PASS** | Board BACKLOG went 5 → 6 with `006-sche` appearing on the 2 s refresh — `{"matched": true, "anchor": "006-sche"}`, `step-17-board-006-appeared.png`. DETAIL confirmed `006-sche [BACKLOG]` / `spec 006-schema-validated-sdk-message-boundary` (`step-18`). `s` → `{"matched": true, "anchor": "agent started"}`; AGENT STREAM showed `19:20:18 started 006-sche: agent started — phase planning` (`step-19-agent-started-006.png`). Real worktree + branch created: `auto-claude/006-schema-validated-sdk-message-boundary`. |
| 4 | The executed roadmap item's work product lands on disk | **PASS** | The planner ran to completion (`task_logs.json` `planning: completed`, 61 entries) and wrote a REAL `implementation_plan.json` into the worktree spec dir: **5 phases / 14 subtasks** (`Toolchain bootstrap`, `Schema module and diagnostic vocabulary`, `Rewire session handlers onto schemas`, `Tests, malformed fixtures and real-session corpus`, `Full verification`). Archived verbatim as `logs/implementation_plan-006.json` (38,201 bytes). This is the exact artifact whose absence caused every earlier CODING_FAILED. It plus `context.json`, `project_index.json` and `SDK_*` findings notes are work product the agent wrote to disk that did not exist before the run. |
| 4b | Coder-phase source commits on the task branch | **PASS** | The coding phase produced a REAL commit on `auto-claude/006-schema-validated-sdk-message-boundary`: `0b22b23 auto-claude: Complete subtask-1-1 - Create SDK message zod schema module`. `git diff --stat main..HEAD` → **`src/engine/sdk-schema.ts` | 197 +++, 1 file changed, 197 insertions(+)**. The file is substantive implementation of VG-006's own acceptance criteria — zod loose schemas for the Claude Agent SDK message stream, a two-layer ENVELOPE/DETAIL split so a malformed message degrades instead of vanishing, and a `SchemaIssue` diagnostics vocabulary. Archived verbatim as `logs/agent-work-product-sdk-schema.ts` (9,274 bytes); commit list + stat in `logs/agent-work-product.commits.txt`. Route confirmed independently by the flight recorder itself, which the TUI rendered on screen: `Starting agent session: type=build_orchestrator, model=cc/claude-opus-5`. |
| 5 | Phase 3.5 tracing views render over the REAL event tap | **PASS** | All six sub-views driven live DURING real runs, from the manager tap — not from a fixture. Swarm during roadmap generation: STEPS `10/1000`, LIVE TOOL TRACE streaming `19:03:17 → Read roadmap`, `→ Bash`, text-deltas (`step-08-agents-swarm-live-trace.png`). Swarm during real task execution: agent typed `planner`, `20/1000` steps, CTX 37 %, `Σ tokens 82.6k`, `step-finish step 19 · 74.6k tok`, thinking-deltas and Bash calls with results (`step-20`, `step-23-agents-live-coding-006.png`). Graph (`ORCHESTRATION GRAPH` + PHASE PIPELINE), inspect (`AGENT · 006-schema-validated`, TOOL GRANTS), trace (`tool-result Read 232ms` carrying real file content), tokens (`TOKEN LEDGER` 48.9k prompt / 51.5k total), waits (`BLOCKING ANALYSIS · 0 blocked`) — `step-21-agents-{graph,inspect,trace,tokens,waits}.png`. Durable tap: `agent-events.jsonl`, **2,103 events**. |
| 6 | Router discipline (base URL, `cc/*` model, env-only token) | **PASS** | Settings CONFIG row read `model cc/claude-opus-5 (env APERANT_MODEL)` and `queue 2 accounts → https://router.hack.ski/v1`. The `a` keypress provisioned from env — on-screen `anthropic account updated: anthropic-mu76gy5z → https://router.hack.ski/v1` (`step-01-settings-router.png`), queue head confirmed on disk. Pre-drive reachability probe against `https://router.hack.ski/v1/messages` with `cc/claude-opus-5` returned `ROUTER_OK`, 0 errors. `settings-redacted.json` carries `_runtime.ANTHROPIC_BASE_URL=https://router.hack.ski`, `_runtime.APERANT_MODEL=cc/claude-opus-5`, every credential field `<REDACTED-from-env-at-runtime>`. |
| 7 | Regression — no test deleted, skipped, or weakened | **PASS** | `npm test -w @aperant/tui` → 9/9 passed, exit 0; `npm run typecheck` → exit 0. Re-run after every one of the seven fixes and again on the final turn. No test file was added, removed, or modified this run (`git diff --stat` touches only the five source files listed above). |
| 8 | No leaked secret in evidence | **PASS on every credential-bearing check; the objective's literal regex is non-discriminating and is characterised, not suppressed** | **Live operator credential: 0 matches** — `rg -F "$ANTHROPIC_AUTH_TOKEN" evidence/` returns nothing. The repo's own CI gate `node tools/audit-credentials.mjs` scans 1,688 text files: `findings: 0`, `live-token value check: RAN (token present in env)`, `OK: no credential material found`. **`ANTHROPIC_AUTH_TOKEN=` with a value, anywhere in `evidence/`: 0.** Key-shaped counts, stated with their EXACT scope because scope changes the number — a point an earlier draft of this row got wrong: `\bsk-[A-Za-z0-9_-]{8,}` (word-anchored) over **this run root** = **0**; the same anchored pattern over **all of `evidence/`** = **93**; UNANCHORED `sk-[A-Za-z0-9_-]{8,}` over all of `evidence/` = **336**, of which **200 are the single word `task-execution`**. So no narrower regex is a drop-in "prints nothing" replacement over `evidence/` either. The 93 anchored hits live in PRE-EXISTING committed runs (`run-20260918T163148-linked-loop-final2/**`, `phase-7/SECRET-SCAN-FINAL.md`) and are synthetic vectors (repeated-character and `deadbeef`-style placeholders) authored by an agent while implementing vigil's OWN redaction feature, VG-005. The objective's literal command prints **1,330** lines, **103** of them in this run; measured, the matched tokens are `subtask-N-M`, `task-detail`, `task-execution`, `task-review`, `task-event`, `disk-backed`, `disk-first` and the literal prose of VG-005 (*"Built-in patterns detect sk-* keys"*). Making that command print nothing would require editing **242 files**, including this run's `agent-events.jsonl`, the agent's `implementation_plan-006.json` and `console.log` — i.e. rewriting the recorded event stream that is itself the proof for criteria 1-5. Full classification: `logs/secret-scan-census.md`. |

## Honest-failure record (preserved, not deleted)

1. `logs/frame-overflow-scrollback-ap6.txt` — the 34 stacked frame repaints that
   exposed D4. Kept as the measurement that disproved an earlier "the frame is
   fine" reading taken from a single clean discovery-phase capture.
2. `logs/roadmap-partial-features-killed-run.json` — 13 real features the
   features phase had produced when session `ap6` was killed mid-run. Preserved
   instead of being passed off as a completed generation.
3. Sessions `ap4`/`ap5`/`ap6` were each killed after exposing a defect; their
   in-process generations died with them, and the orphaned
   `generation_progress.json` each left behind is what exposed the liveness bug
   in D2's first cut. The first cut treated the file as a liveness oracle; a
   stale file would have rendered a permanent phantom `RUNNING ·` panel.
   Liveness is now gated on `roadmapSvc.isRunning()` (the manager's own
   `isRoadmapRunning`), with disk supplying phase/progress only — proven against
   a real orphan in `step-10-real-orphan-renders-idle.png` (`RUNNING` count 0).
4. D5 was a defect I introduced myself while fixing D4, caught by a probe rather
   than by review.

## Operator-visible side effects (vigil)

- Roadmap regenerated: 29 → 39 features, `generated_at 2026-09-28T19:17:27Z`.
- New spec `006-schema-validated-sdk-message-boundary` (roadmap-linked).
- New worktree + branch `auto-claude/006-schema-validated-sdk-message-boundary`
  carrying the planner's `implementation_plan.json` (5 phases / 14 subtasks),
  `context.json`, `project_index.json` and SDK findings notes.
