# Phase 8 — Coverage Matrix (session 2026-09-18)

Router: **omniroute only** — `http://127.0.0.1:20219/v1`, account `anthropic-mu6zlcfu`.
The forbidden 9router account (`:20128`) was **removed** from `~/.aperant/settings.json`
this session; `globalPriorityOrder` contains exactly one id, so there is no fallback.
Credential supplied via env (`ANTHROPIC_AUTH_TOKEN`), never written to the repo.

Driver: **tuistory 0.11.0** (native PNG `screenshot`). Geometry 200x50.
`CI` and 13 sibling CI vars unset inside the pane (Ink `is-in-ci` blanks the
renderer otherwise — `node_modules/ink/build/ink.js:111-116`).

Launch shape that works (cwd must be `apps/tui` so tsconfig paths resolve `@main/*`):

    tuistory launch -s <name> --cols 200 --rows 50 --background \
      --cwd /Users/nick/dev/aperant-tui/apps/tui \
      --env ANTHROPIC_BASE_URL=http://127.0.0.1:20219/v1 \
      --env ANTHROPIC_AUTH_TOKEN=$OMNIROUTE_API_KEY \
      --env APERANT_MODEL=cc/claude-opus-5 \
      --env ANTHROPIC_DEFAULT_SONNET_MODEL=cc/claude-sonnet-5 \
      -- env -u CI -u CONTINUOUS_INTEGRATION ... npx tsx src/cli.tsx <project>

## Three distinct real codebases

| | Project | Root | Branch | Stack |
|---|---|---|---|---|
| A | awesome-researcher | `/Users/nick/awesome-researcher` | `feat/awesome-researcher` | Python / Poetry |
| B | proofpunk-agent | `/Users/nick/proofpunk-agent` | `master` | Python / Textual |
| C | hunter-seed | `/Users/nick/dev/hunter-seed` | `main` | Python / setuptools |

Rejected as non-distinct: `hunter-seed-wt-hunter-v1-build` (a git *worktree* of C,
`git worktree list` → `5457c47 [feat/hunter-v1-build]`), and `/Users/nick/dev/proofpunk`
(content/prose repo, no `.auto-claude/`).

## Criteria proven this session

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| R1 | Router is omniroute, not 9router | **PASS** | `settings.json` single account → `:20219`; `FORBIDDEN_9ROUTER_PRESENT: False` |
| R2 | Live AI call reaches omniroute | **PASS** | `POST /v1/messages {"model":"cc/claude-opus-5"}` → 200 `ROUTE_OK` |
| R3 | TUI resolves the omniroute account | **PASS** | `Resolved auth from provider queue: account=anthropic-mu6zlcfu provider=anthropic model=cc/claude-sonnet-5` |
| T1 | TUI boots and paints under tuistory | **PASS** | `step-01-boot-awesome-researcher-board.png` (3428x866) — real project name, branch, task counts |
| T2 | All 7 tabs reachable | **PASS** | board/term/road/chat/tree/set/agents captured |
| T3 | Help overlay | **PASS** | `step-10-help-overlay.png` |
| T4 | Command palette | **PASS** | `step-11-command-palette.png` |
| P5.1 | Worktree list matches `git worktree list` | **PASS** | UI list vs `step-09-git-worktree-list-authoritative.txt` — 4 entries identical |
| P6.1a | Theme change applies + persists | **PASS** | amber→synth in UI; `~/.aperant/tui.json` → `"theme": "synth"` |
| P4.3 | Insights answers with correct file reference | **PASS** | cites `awesome_researcher/agents/validator.py`; verified on disk, and `_HTTP_ERROR_FLOOR = 400` (:64), `403/405/501` HEAD retry (:123), `bounded_gather` (:266) all match source exactly |
| L1 | Roadmap → spec conversion (3/3 projects) | **PASS** | A: spec `006-…`; B: spec `008-…`; C: spec `003-…` — all on disk |
| L2 | Spec → board task (3/3) | **PASS** | A BACKLOG 2→3; B 6→7; C new `003-patc` |
| L3 | Task → agent + worktree (3/3) | **PASS** | 3 worktrees created on `auto-claude/*` branches, each via omniroute |
| L4 | Agent produces real plan | **PASS (A)** | `implementation_plan.json`, 4 phases: GitHub API Client / PR Draft Composer / PR Draft Orchestration + CLI / End-to-End Verification |
| L5 | Agent produces real source work product | **PARTIAL (A only)** | `github_client.py` (247 lines, valid Python, mirrors repo's own httpx-injection pattern); `pr_composer.py` added in phase 2. Stopped mid-`coding` at subtask 2-1 of 4 plan phases; `validation` never ran, project checks never executed. B and C stopped during `planning` with no work product. |
| G1 | Commit/push gate honored | **FAILED — see `GATE-CONFLICT-auto-commit.md`** | The vendored BuildOrchestrator auto-committed 4 times on A's task branch before the gate. Unpushed, isolated to `.auto-claude/worktrees/`, aperant-tui `HEAD` still `f9599f2`. Instruction §7 required inspecting this behavior *before* starting agent workflows; I did not. Aperant-tui commit and push are **withheld**. |

## Defects found and fixed this session

| ID | Defect | Fix | Proof |
|---|---|---|---|
| N1 | Roadmap `tool-use` stream events silently dropped → generation looked frozen | `agent-queue.ts:444-448` `[APERANT-PATCH roadmap-tool-log]` | `Tool: Read` / `Tool: Bash` lines streaming live on screen |
| N2 | LogsView read `task.logs`, a field nothing ever writes → always empty | `LogsView.tsx` now reads real `agent-events.jsonl`, 1s polling | `TASK LOGS · 006-auto · 356 lines` → grew to 445 live |
| N3 | Roadmap runs never armed the observability tap → agents view dead during generation | `roadmap-service.ts:51-53` | `attachToManager` confirmed idempotent (`private attached`) |
| N4 | TabBar advertised dead `L logs` tab (wrong key, never rendered); logs view highlighted *board* | `TabBar.tsx:6,14` | dead entry removed; highlight honest |
| N5 | AgentsView omitted `rate_limit_paused`/`auth_failure_paused` → paused agent invisible; duplicated `PHASE_ORDER_INDEX`; wrong `qa=high` claim | `AgentsView.tsx:22,297-301,322,462` | imported index; pause banner; `qa_fixer=medium` corrected |
| N6 | **Board `j`/`k` skipped tasks** — selection walked raw disk order while render used grouped order, so `006` was unreachable and `j j s` started the *wrong task* | `BoardView.tsx:145-146` (`flat` now derived from `groups`), `:192-197` (H/L follows moved task) | Before: `j j` → `003-list`. After: `j j` → `006-auto` with matching spec |
| N7 | **Vendored `console.log` destroyed the Ink frame on every task start** — `[AgentManager]`/`[WorktreeManager]` lines painted over the alt-screen and persisted through forced SIGWINCH repaints, making the TUI unobservable for the rest of the session | `cli.tsx` D22 interceptor: routes `log/info/warn/debug/error` into the flight recorder via `util.format`, disables Ink's conflicting `patchConsole`, restores originals on exit, `APERANT_RAW_CONSOLE` escape hatch | `run-…-final-console-fix-proof/step-01-PASS-frame-intact-after-task-start.png` — frame fully intact after `s`, toast `agent started: 003-patc` rendered in-frame, phase advanced to `planning`, **zero** console lines on screen. All 7 lines preserved in `step-02-console-records-in-flight-recorder.txt` |

## Final gates (all 7 fixes in tree)

| Gate | Command | Exit |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | **0** |
| Tests | `npm test` (`vitest run`) — 2 files, 9 tests | **0** |
| Build | `npm run build` — worker 4.52 MB, cli 6.34 MB | **0** |
| Secret scan | 44 evidence files, full token + 12-char prefix + `sk-`/`Bearer` patterns | **0 hits** |

## Open / unresolved

| ID | Item | Status |
|---|---|---|
| O1 | Vendored `[AgentManager]`/`[WorktreeManager]` `console.log` paints over the Ink alt-screen on task start, destroying the frame for the rest of the session | **fix in flight** (`cli.tsx` interceptor). Confirmed persistent: survives forced SIGWINCH repaint |
| O2 | Logs-view escape/digit "trap" | **RE-CONFIRMED AS A REAL DEFECT — still open.** Re-driven after the D22 console fix on a pristine frame (session `navq`, no agent started): `l` opens `TASK LOGS · 003-patc · 565 lines`, then `escape` → no change, digit `1` → no change. The frame was live and repainting, so this is input handling, not display corruption. Source says it *should* work, so the real cause is an unidentified runtime guard (`isActive` / `globalKeysActive` / `textInputActive`). **No speculative patch shipped.** `run-…-final-console-fix-proof/step-03-DEFECT-logs-view-dead-end.md` |
| O3 | `APERANT_MODEL` alone does not reach the task-execution planner; the router needs its family prefix or the planner 401s | **config-documented, not patched.** Root cause proven by probe: `{"model":"cc/claude-sonnet-5"}` → 200 vs `{"model":"claude-sonnet-4-6"}` → 401 `No active credentials for provider: antigravity`. Setting `ANTHROPIC_DEFAULT_SONNET_MODEL=cc/claude-sonnet-5` fixes it live (planner authenticated and ran). A manager-side patch was investigated and **declined** — no clean single insertion point preserves the shorthand provenance needed for correct precedence (`agent-manager.ts:499-506`, `:1023-1058`) |
| O4 | B and C work products | planners still running at time of writing |
| O5 | Lifecycle persistence across restart (3/3) | not yet re-driven |

## Honest notes

- The first roadmap regeneration on A (`G`) was still mid-features at ~50% when its
  session was closed; it is preserved as **pre-fix** evidence only
  (`run-…-harness-proof/step-07-A-PREFIX-run-final-state.*`), not counted as a pass.
- `step-03-board-001-selected-006-visible.png` was renamed from an earlier misleading
  name — it shows 006 *visible*, with selection still on 001.
- An accidental start of task `003-list` (caused by N6 before it was fixed) is **not**
  counted toward any criterion.
