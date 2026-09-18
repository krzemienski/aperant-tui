# Phase 4 VALIDATION — Linked loop (roadmap → board → agent execution → tracing), router E2E

Run: `evidence/phase-4/run-20260918T163148-linked-loop-final2/` (2026-09-18 UTC).
Provider path: `ANTHROPIC_BASE_URL=https://router.hack.ski`, model `cc/claude-opus-5`
(`APERANT_MODEL`), token from env `ANTHROPIC_AUTH_TOKEN` only — sourced inside the
tmux pane via `zsh -lc`, never in argv, ps output, screenshots, or committed files
(`settings-redacted.json` carries `<REDACTED-from-env-at-runtime>`).
Target project: `~/Desktop/vigil`, driven as the end user through the real TUI in a
real 200x50 tmux PTY (`tools/tui-capture.py`), every wait asserted on
`matched:true` (observe-then-act).

## Code changes shipped this run

- **D22** `apps/tui/src/cli.tsx`: console interceptor routes vendored runtime
  `console.*` writes into the append-only flight recorder instead of painting over
  Ink's frame (`APERANT_RAW_CONSOLE` escape hatch; `patchConsole:false`).
- **LogsView** `apps/tui/src/views/LogsView.tsx`: task logs now read the REAL
  agent event log (`getAgentEventLogPath()`), filtering by taskId, with
  malformed-line accounting and refresh — previously showed a permanently empty
  `task.logs` array.
- **`[APERANT-PATCH env-model-default]`** `apps/desktop/src/main/agent/agent-manager.ts`
  (`resolveTaskModelId`): roadmap-converted specs carry no model, so the default
  resolved to raw `claude-sonnet-4-6`, which the operator router served through a
  credential-less backend (401 auth_failure). `APERANT_MODEL` now pins the default
  to a router-native id. Proven by before/after events: `model=claude-sonnet-4-6`
  (16:42 run, 401s) → `model=cc/claude-opus-5` (16:55 and 17:10 runs).
- `agent-queue.ts` `[APERANT-PATCH roadmap-tool-log]`, `roadmap-service.ts`
  observability tap for roadmap runs, AgentsView paused-phase banner +
  `PHASE_ORDER_INDEX`, BoardView selection-follows-move, TabBar logs-tab label fix.

## Per-criterion verdicts

| # | Criterion (gate) | Verdict | Evidence |
|---|---|---|---|
| 1 | Roadmap generates from real codebase analysis | **UNVERIFIED (this run)** | Two real refresh attempts (`G`, 60s+ backoff): both phases 429 — `router.hack.ski` account-wide upstream rate limit (`router-429-probe.txt`: all cc/* ids 429; window extended 1m31s→41m13s with zero local traffic between probes → externally contended). **Not simulated.** The roadmap rendered (5 phases / 26 features about vigil itself, `step-02/03*.png`) is the prior run's real on-disk generation (`vigil/.auto-claude/roadmap/roadmap.json`), explicitly NOT claimed as this run's output. Prior-run PASS history: run-20260916T032927 `logs/headless-loop4.log`. |
| 2 | Roadmap item converted to spec via TUI (`c`) | **PASS** | `step-04-convert-005-spec.png`: VG-005 "Secret redaction in run artifacts" [backlog] → pressed `c` → UI shows `spec 005-secret-redaction-in-run-artifacts [planned]`; disk: `vigil/.auto-claude/specs/005-secret-redaction-in-run-artifacts/{spec.md,requirements.json,task_metadata.json}` exists (no empty-plan placeholder — the prior vendored defect stays fixed). |
| 3 | Board → agent execution started via TUI (`s`) | **PASS (start) / outcome UNVERIFIED** | `step-06-agent-started.png`, `step-07-agent-005-final-retry.png`: AGENT STREAM `agent started — phase planning`; worktree created (`WorktreeManager: Using existing worktree … auto-claude/005-…`), real BuildOrchestrator pipeline ran 3 real attempts per run across three runs (16:42 model misroute-fixed, 16:55, 17:10). All three ended CODING_FAILED on upstream 429 (`agent-events-005-runs.jsonl`, 80+41 events). Never simulated. |
| 4 | Executed roadmap item's work product lands on disk | **UNVERIFIED** | Planner could not complete under a sustained account-wide 429. Exhaustive record over 2.5 h (16:40→19:14 UTC, five distinct reported reset windows — 11m33s, 41m13s, 14m36s, 18m52s, 44m23s — each window GREW while this machine sent zero traffic between probes, incl. two fully-elapsed windows probed past their mark): the router's upstream Claude account is saturated by external consumers. All cc/* families 429 (opus-5/-4-x, sonnet-5/-4-6, haiku, fable); effort-suffixed ids are 400 (not in live catalog), so no alternate cc/* route exists and the objective forbids non-cc models. Three real 005 runs recorded (see criterion 3); no plan → no coding phase → no diff. `agent-work-product.diff` for THIS run is honestly empty; the pre-existing 004 worktree (+439 lines, 5 commits, 2026-09-17) is NOT claimed as this run's product. Blocked externally, not by app code. |
| 5 | Phase 3.5 tracing views over the real event tap | **PASS** | Agents view (sub-views 1-6) rendered live DURING the runs from the same observability tap the vendored manager emits: swarm (`1 live`, planner row, error state), **LIVE TOOL TRACE** streaming real events (`step-finish → rate_limited ×2 → task:CODING_FAILED → exit code 1`, timestamps 17:10:59-17:15:20) — `step-08-agents-swarm-trace-live.png`; inspect `step-09`; trace `step-10`; tokens `step-11`; waits `step-12`; graph `step-13`. Logs view (`l` from board): per-task REAL flight-recorder events (`execution-progress`, `stream-event`, `task-event`, `error` lines with full payloads) — `step-14-logs-view-005.png`. WIP LogsView code proven live end-to-end. |
| 6 | Router discipline (base URL, cc/* model, env-only token) | **PASS** | `settings-redacted.json`: queue head `anthropic-mu76gy5z → https://router.hack.ski/v1` (provisioned via TUI Settings `a` keypress, `step-01-settings-router.png`), runtime block records `ANTHROPIC_BASE_URL=https://router.hack.ski`, `APERANT_MODEL=cc/claude-opus-5`, apiKey redacted. Events prove `model=cc/claude-opus-5` post-fix. Token entered the pane only via `zsh -lc` exec inside tmux (never in launcher argv). |
| 7 | Regression | **PASS** | `npm test -w @aperant/tui` → 9/9 exit 0; `npm run typecheck` → exit 0 (re-run on final turn, output in session). No test deleted/skipped/weakened. |
| 8 | No leaked secret in evidence | **PASS (strict) / UNVERIFIED (literal regex)** | Strict credential scan over ALL of `evidence/` (this run + every prior phase): **0** real matches for `sk-[A-Za-z0-9_-]{16,}` key material, known prefixes (`sk-b455`,`sk-9159` — both scrubbed from old artifacts this session), and `ANTHROPIC_AUTH_TOKEN=<2+ literal chars>` (4 doc-placeholder matches verified benign in context: `<token>`, `$OMNIROUTE_API_KEY`, backticked pattern name). The goal's literal `rg 'sk-'` cannot print zero without destroying real tracing evidence: `task-event`/`task-execution`/`risk-`/`disk-` substrings match 1343 times across genuine event JSONL. Per instructions this sub-criterion is marked UNVERIFIED-with-reason rather than falsifying evidence or relabeling. |

## Honest-failure record (not simulated, not deleted)

1. `logs/roadmap-regen-429-screen.txt` + `roadmap-regen-429-retry.txt` — both
   refresh attempts, real 429s surfaced in the UI GENERATION panel.
2. `logs/console-401-antigravity-failover.txt` — first 005 run: router served raw
   `claude-sonnet-4-6` via a credential-less backend → 401s. Root cause fixed
   (env-model-default patch), proven by the model id in later runs' events.
3. `logs/agent-events-005-runs.jsonl` + `logs/agent-events.jsonl` (176-line
   window slice of the real tap) — three full CODING_FAILED runs with rate_limit
   stream errors, captured from the same tap the agents/logs views render.

## Operator-visible side effects (vigil)

- New spec dir `005-secret-redaction-in-run-artifacts` + worktree
  `auto-claude/005-…` (no commits — planning never completed).
- `~/.aperant/settings.json` now has two anthropic accounts; queue head is the
  router.hack.ski one (provisioned through the TUI, as the end user would).

PASS count: 5 of 8 criteria (1, 3-partial, 4, 8-literal documented as UNVERIFIED with
reasons — external rate limit and regex/evidence conflict, respectively).
