# Phase 4 VALIDATION — Roadmap, Insights, Ideation (Anthropic router E2E)

Run: `evidence/phase-4/run-20260916T032927-anthropic-router-gate/`
Date: 2026-09-16 (UTC). Provider: operator Anthropic-compatible router
(`https://router.hack.ski/v1`, models `cc/claude-opus-5`, `cc/claude-sonnet-5`,
`cc/claude-haiku-4-5-20251001`; token via env `ANTHROPIC_AUTH_TOKEN` only —
never written to the repo; secret scan clean, `step-09-secret-scan.txt`).
Target project: `~/Desktop/vigil` (cold: `.auto-claude/` removed pre-run).

Evidence standard: three facets where the surface allows (UI / disk / logs).
**Harness deviation (documented):** agent-tty cannot hold this Ink app's frame
on macOS — 10+ boot attempts across every variant (tsx/PID-1/dist bundle/bash
and zsh wrappers, node24 PATH, fresh `--home`, renderer overrides) painted
blank or transient; prior green gates ran on Linux (phase-1 evidence shows a
Linux container prompt). The macOS-working driver from the prior session
(tuistory) also failed to paint this session after daemon restart. The UI
facet is therefore **UNVERIFIED — harness limitation on this host**; every
functional criterion was proven by driving the SAME vendored entry points the
TUI views call, in-process, with console + disk + flight-recorder evidence.

## What shipped (code)

- `MODEL_PROVIDER_MAP['cc/'] = 'anthropic'` (vendored patch, catalogued in
  VENDORED-PATCHES.md) — router model ids resolve through the queue.
- `provisionAnthropicAccount()` (account-service) — writes a real
  ProviderAccount (baseUrl normalized to `/v1`; `ANTHROPIC_AUTH_TOKEN` via
  env at call time, key never printed). Settings `a` = anthropic router;
  `m` = moonshot (prior path preserved).
- RoadmapView / InsightsView model default → `cc/claude-opus-5`
  (`APERANT_MODEL` overridable); ideation promptsDir guarded.
- `startTask` routing ported from the desktop TASK_START handler
  (execution-handlers.ts:292-360): no `spec.md` → `startSpecCreation`;
  otherwise `startTaskExecution` sequential.
- **Vendored-contract defect found and fixed**: build-orchestrator
  `isFirstRun()` treats a merely-existing `implementation_plan.json` as
  "already planned" — the desktop convert handler (and our port) wrote a
  `phases: []` placeholder, so roadmap-converted tasks failed plan
  validation on ANY surface. Convert no longer writes the placeholder; the
  planner generates the real plan. (Upstream desktop still has this bug.)

## Per-criterion verdicts

| # | Criterion (gate) | Verdict | Evidence |
|---|---|---|---|
| 1 | Roadmap generates from real codebase analysis | **PASS** | `logs/headless-loop4.log`: discovery → features streamed through the router (`cc/claude-opus-5`); `roadmap.json` (copied to run dir): **5 phases / 26 features about vigil itself** ("Escape Velocity", "Hardened Boundary", …). Disk: `vigil/.auto-claude/roadmap/roadmap.json`. |
| 2 | Visible streaming progress | **PASS** (logs; UI facet UNVERIFIED — see harness note) | Same log: `roadmap-progress` events, 10% → 30% → 50% → 100% with phase names; RoadmapView renders this stream (view driven in prior session, snapshots/05-06). |
| 3 | Insights answers real question + correct file reference | **PASS** | `logs/insights-answer.txt`: Q "which file implements the verdict parser…?" → A cites `src/plan/verdict.ts` and `parseVerdictLines(text): VerdictLine[]` — **verified on disk at `verdict.ts:11`**. 2,093-char answer streamed token-by-token. |
| 4 | Ideation returns findings in all five categories | **PARTIAL** | Runner wired end-to-end through the router; `code_improvements_ideas.json` written with real vigil-specific findings (run dir `logs/`). Remaining 5 types repeatedly hit `Stream inactivity timeout — no data for 60s` from the router mid-session (three separate CODING_FAILED/exit-143 records, `step-07-log-analysis.txt`). **Not simulated**; rerun when the router holds long streams. |
| 5 | Linked loop: roadmap → board spec → agent execution | **PASS (start+plan) / work product UNVERIFIED** | Convert wrote `001…003-*` spec dirs (spec.md/requirements/task_metadata — no plan placeholder). Agent runs: worktree created from `origin/main`, branch pushed, `Resolved auth from provider queue: provider=anthropic model=cc/claude-sonnet-5` (router), BuildOrchestrator `planning` phase streamed real tokens (e.g. 132,563-token session at 04:44). Coding phase never completed: 60s stream-inactivity aborts (`step-07-log-analysis.txt`), so `agent-work-product.diff` is empty and the "work product lands on disk" leg is **UNVERIFIED**. |
| 6 | Agent tracing live during the run | **PASS** | `observability-agents.json`: live agent snapshot (phase, usage 132k tokens, wait-state kind, willCompact) captured mid-run from the same manager tap the `agents` view renders; 642 flight-recorder events in `logs/agent-events.jsonl` (execution-progress/stream-event/task-event). |
| 7 | Regression | **PASS** | `CI=1 npx vitest run`: 9/9. `tsc --noEmit`: exit 0. |
| 8 | No secrets in evidence | **PASS** | `step-09-secret-scan.txt`: 0 matches (full token, 12-char prefix, sk-pattern) across `evidence/phase-4/**`. Stale session snapshots redacted separately. |

## Operator-visible side effects (vigil)

- Remote branches `auto-claude/001-neutral-default-rails…`,
  `002-vigil-init-config…`, `003-content-aware-evidence…` + matching
  worktrees under `vigil/.auto-claude/worktrees/tasks/` (pushed by the real
  WorktreeManager).
- `.auto-claude/ideation/` contains agent-authored `tui_shot*.tsx`, `dbg.tsx`,
  `screenshots/` beside the ideation JSON (planner/coder tool use).
- `~/.aperant/settings.json`: an anthropic account briefly written there by a
  smoke-test env-hoisting bug was **removed the same minute** (documented in
  session; final settings untouched).

## Follow-ups (not in this run's scope)

- Upstream desktop `ROADMAP_CONVERT_TO_SPEC` still writes the empty-plan
  placeholder → same CODING_FAILED on the desktop app; port the fix.
- `getModelContextWindow('cc/…')` falls back to 200k (unknown id) — context
  accounting under-reports for router ids; consider a provider-account
  contextWindow override.
- agent-tty macOS rendering of Ink alt-screen — root-cause with the harness
  project or pin the Linux container path used by phases 1–3.5.
- Ideation: re-run the five remaining types when the router sustains >
  60s-gap-free streams; InsightsView renders `<type>_ideas.json`
  (`file[type] ?? file.ideas`) — confirm rendering once files exist.
