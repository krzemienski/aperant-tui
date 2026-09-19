# Phase 4 VALIDATION — Linked loop (roadmap → board → agent execution → tracing), router E2E

Run: `evidence/phase-4/run-20260918T163148-linked-loop-final2/`
Drive window: 2026-09-18 16:31 → 2026-09-19 16:17 UTC (execution leg completed on
2026-09-19 after a ~5 h upstream rate-limit outage cleared).
Provider path: `ANTHROPIC_BASE_URL=https://router.hack.ski`, model `cc/claude-opus-5`
(`APERANT_MODEL`), token from env `ANTHROPIC_AUTH_TOKEN` only — sourced inside the
tmux pane via `zsh -lc`, never in argv, ps output, screenshots, or committed files
(`settings.json` / `settings-redacted.json` carry `<REDACTED-from-env-at-runtime>`).
Target project: `~/Desktop/vigil`, driven as the end user through the real TUI in a
real 200x50 tmux PTY (`tools/tui-capture.py`), every wait asserted on
`matched:true` — full observe→act ledger in `drive-transcript.md`.

## Code changes shipped this run

- **D22** `apps/tui/src/cli.tsx`: console interceptor routes vendored runtime
  `console.*` writes into the append-only flight recorder instead of painting over
  Ink's frame (`APERANT_RAW_CONSOLE` escape hatch; `patchConsole:false`).
- **LogsView** `apps/tui/src/views/LogsView.tsx`: task logs now read the REAL
  agent event log (`getAgentEventLogPath()`), filtered by taskId, with
  malformed-line accounting and refresh — previously a permanently empty
  `task.logs` array.
- **`[APERANT-PATCH env-model-default]`** `apps/desktop/src/main/agent/agent-manager.ts`
  (`resolveTaskModelId`): roadmap-converted specs carry no model, so the default
  resolved to raw `claude-sonnet-4-6`, which the operator router served through a
  credential-less `antigravity` backend (401 auth_failure). `APERANT_MODEL` now
  pins the default to a router-native id. Proven by before/after events:
  `model=claude-sonnet-4-6` (16:42 run, 401s) → `model=cc/claude-opus-5` (all
  later runs, incl. the completing one).
- `agent-queue.ts` `[APERANT-PATCH roadmap-tool-log]`, `roadmap-service.ts`
  observability tap for roadmap runs, AgentsView paused-phase banner +
  `PHASE_ORDER_INDEX`, BoardView selection-follows-move, TabBar logs-tab label fix.

## Per-criterion verdicts

| # | Criterion (gate) | Verdict | Evidence |
|---|---|---|---|
| 1 | Roadmap generates from real codebase analysis | **PASS** | `G` refresh driven in the TUI; GENERATION panel streamed `RUNNING · discovery 30%` → `features 50%` with live `Tool: Read/Bash` lines and real analysis prose ("Project index is missing…", "I'll build the roadmap, preserving VG-001–VG-005 verbatim…"), then `Phase features completed` — `step-15-roadmap-regen-streaming.png`, `step-16-roadmap-regen-complete.png`. Disk: `vigil/.auto-claude/roadmap/roadmap.json` rewritten `generated_at 2026-09-19T00:23:56Z`, **29 features / 5 phases** (was 26), new VG-027 Event stream consumer API, VG-028 Hosted multi-user control plane, VG-029 First-class Windows support. Copy: `roadmap-regenerated.json`. |
| 2 | Roadmap item converted to spec via TUI (`c`) | **PASS** | `step-04-convert-005-spec.png`: VG-005 "Secret redaction in run artifacts" [backlog] → `c` → UI shows `spec 005-secret-redaction-in-run-artifacts [planned]`; disk: `vigil/.auto-claude/specs/005-…/{spec.md,requirements.json,task_metadata.json}` (no empty-plan placeholder — prior vendored defect stays fixed). |
| 3 | Board → agent execution started via TUI (`s`) | **PASS** | `step-06-agent-started.png`, `step-07`, `step-17`: AGENT STREAM `agent started — phase planning`; worktree `auto-claude/005-secret-redaction-in-run-artifacts`; BuildOrchestrator ran planning → coding. Completion run: **5,534 real events** (`logs/agent-events-005-completion-run.jsonl`), `model=cc/claude-opus-5`, phases `planning`/`coding`. |
| 4 | Executed roadmap item's work product lands on disk | **PASS** | Planner wrote a real `implementation_plan.json` (**4 phases**) into the worktree spec dir — the exact file whose absence caused every earlier CODING_FAILED. Coder then produced **5 subtask commits** on `auto-claude/005-secret-redaction-in-run-artifacts`: `a240dc7` redactor with built-in secret patterns, `e91400f` deep RunEvent redaction, `43f8d6a` unit tests, `cf220c1` validated `config.redact` patterns, `fd34d1d` auth-token literal resolution + redactor factory. Diff vs `main` at capture time: **+586 / -1 across 3 files** — `src/engine/redact.ts` (+257), `tests/redact.test.ts` (+268), `src/config.ts` (+62). Stat + commit list: `agent-work-product.stat.txt`, `agent-work-product.commits.txt`; full diff kept **outside** `evidence/` at `docs/plan/phases/work-product/005-secret-redaction.diff` because the feature under construction is a secret redactor whose tests legitimately contain synthetic `sk-…` fixtures (see criterion 8). The run was still producing further subtasks when evidence was frozen; the leg is proven by the commits already on disk. |
| 5 | Phase 3.5 tracing views over the real event tap | **PASS** | Agents view sub-views 1-6 rendered live DURING real runs from the manager tap: swarm + **LIVE TOOL TRACE** streaming `step-finish`, tool calls/results, token counters (`Σ tokens 46.8k`, 22% progress) mid-coding — `step-17-agents-live-coding.png`; earlier failure-state trace (`rate_limited → task:CODING_FAILED → exit code 1`) — `step-08`; inspect `step-09`, trace `step-10`, tokens `step-11`, waits `step-12`, graph `step-13`. Logs view (`l` from board): per-task REAL flight-recorder lines (`execution-progress`, `stream-event`, `task-event`, `error`) — `step-14-logs-view-005.png`. |
| 6 | Router discipline (base URL, cc/* model, env-only token) | **PASS** | `settings.json` (redacted): queue head `anthropic-mu76gy5z → https://router.hack.ski/v1`, provisioned by the TUI Settings `a` keypress (`step-01-settings-router.png`); runtime block records `ANTHROPIC_BASE_URL=https://router.hack.ski` + `APERANT_MODEL=cc/claude-opus-5`; apiKey redacted. Every agent session logged `model=cc/claude-opus-5`. Token entered the pane only via `zsh -lc` exec. |
| 7 | Regression | **PASS** | `npm test -w @aperant/tui` → 9/9, exit 0; `npm run typecheck` → exit 0. Re-run on the final turn; no test deleted, skipped, or weakened. |
| 8 | No leaked secret in evidence | **PASS (no real credential) / literal-regex sub-leg UNVERIFIED** | **Operator credentials: 0.** Final-turn scan for the live `ANTHROPIC_AUTH_TOKEN` value, its 12- and 8-char prefixes, the legacy `sk-b455`/`sk-9159` prefixes, and any `ANTHROPIC_AUTH_TOKEN=..` assignment returns **NONE** across all of `evidence/`. **Correction to an earlier draft of this row**, which wrongly claimed "0 matches" for `sk-[A-Za-z0-9_-]{16,}`: that pattern matches **106** times, ~90 of them in this run's `agent-events.jsonl`, `logs/*.jsonl`, and `screens/step-17-agents-live-coding.png.{txt,html}` (line 38 of the sidecar). Every one is a **synthetic test vector** — repeated-character and `deadbeef`-style placeholders authored by the agent as literal fixtures in `tests/redact.test.ts` while building VG-005's *secret redactor*, then echoed through the LIVE TOOL TRACE and recorded faithfully by the event tap. (The literal values are deliberately **not** reproduced here: this document stays in scope for `tools/audit-credentials.mjs`, so quoting them would make the verdict itself trip the gate. They are readable in the cited artifacts.) The trace is correct **because** it captured them; no operator credential is involved. Remaining hits are component/subtask names (`sk-1-1-bs4-…`, `sk-box-…`, `sk-lifecycle-service`). The goal's literal `rg -n 'sk-\|…' evidence/` therefore **cannot reach zero while criterion 3 is satisfied**: the class census over `evidence/` is 808 `task-*` + 414 `subtask-*` + 49 `disk-*` + 15 `ask-*` benign hits, and the mandated `agent-events.jsonl` (5,714 lines) itself contains 5 `"task-event"` records and 14 `task-execution` refs. Rewriting those strings would falsify the event tap, which the objective forbids ("never simulated"), so this sub-leg is recorded UNVERIFIED with cause rather than forced green. |

## Honest-failure record (preserved, not deleted)

1. `logs/roadmap-regen-429-screen.txt`, `roadmap-regen-429-retry.txt` — the two
   2026-09-18 refresh attempts that 429'd before the outage cleared.
2. `logs/console-401-antigravity-failover.txt` — first 005 run: router served raw
   `claude-sonnet-4-6` via a credential-less backend → 401. Root-caused and fixed.
3. `logs/agent-events-005-runs.jsonl` — three failed 005 runs (429 CODING_FAILED).
4. `logs/router-429-probe.txt` — upstream outage census: five reported reset
   windows (11m33s → 41m13s → 14m36s → 18m52s → 44m23s) that grew under zero
   local traffic; cleared ~5 h later, after which the execution leg completed.

## Operator-visible side effects (vigil)

- Roadmap regenerated (29 features); spec `005-secret-redaction-in-run-artifacts`;
  worktree + branch `auto-claude/005-…` carrying 5 agent commits (+586 / -1).
- `~/.aperant/settings.json`: router.hack.ski account at queue head (added via TUI).
