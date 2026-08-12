# Phase 2.5 VALIDATION — per-criterion verdicts

Run: `evidence/phase-2/e2e-evidence/run-20260812T045402-moonshot-live-gate/`
Session `moonshot-live` · 110x32 · screenshots ×4 · console log ·
agent-events.jsonl · redacted settings.json · agent-work-product.diff

Evidence standard: **three facets** — UI (waits asserted on
`result.matched`, screenshots), persistence (direct disk reads), logs
(flight recorder + console + worker task log). Harness lessons folded in:
wait envelopes report `ok:true` on timeout (D8) so every wait is asserted
on `result.matched`; console capture uses `script(1)` because a pipe trips
the TUI's real TTY guard (D7).

| # | Criterion | Evidence | VERDICT |
|---|---|---|---|
| 1 | Provisioning refuses without credentials | step-01e wait matched `no API key`; step-01g: settings.json never created | **PASS** |
| 2 | `a` provisions a real moonshot account | step-03b wait matched `moonshot account added`; step-04 disk read: `provider=moonshot`, baseUrl `…/v1`, priority-first; key redacted in evidence | **PASS** |
| 3 | Account resolves through the vendored queue | console log + event stream show `provider=moonshot model=kimi/kimi-for-coding` resolution; pre-flight passed | **PASS** |
| 4 | Agent starts and streams for real | step-05d wait matched `agent started`; agent-events.jsonl: 1886 events (execution-progress ×1878, log ×7, task-event ×1 = `CODING_STARTED`) | **PASS** |
| 5 | Agent does real work | agent-work-product.diff: plan subtask 002-1 → completed; NEW `src/repro.ts` + `src/terminal.ts` written by the agent (a real repro of the resize bug); `task_logs.json` written by the worker | **PASS** |
| 6 | No secrets in evidence | step-09 scan: no key material anywhere in the run dir | **PASS** |
| 7 | Regression: protocol + executor suites | 9/9 vitest: provider (real HTTP/SSE/401/garbage via loopback server), parallel-executor `onSubtaskQueued` (6 subtasks @ concurrency 3) | **PASS** |

## Prompt & ordering measurements (remediation sweep 2026-08-12 PM)

- **Prompt source (empirical)**: the main thread's `prompt-loader` resolves
  `apps/desktop/prompts/` via repo-root traversal; the bundled worker's own
  `loadPrompt` resolves the same real directory
  (`join(dist,'..','..','..','apps','desktop','prompts')` — probed
  standalone, RESOLVED). The planner phase therefore ran the real
  `prompts/planner.md` (30,116 bytes; mandates Write of
  `implementation_plan.json` — which the agent demonstrably did), and
  coder/QA phases inside the worker load their real prompt files from the
  same tree. No fallback prompts were used.
- **Phase ordering**: sequence extracted from this run's committed
  `agent-events.jsonl`: `planning → [structured CODING_STARTED] → coding →
  (idle: session boundary) → planning → qa_review → qa_fixing`. Splitting at
  session boundaries, every segment is monotonic per `PHASE_ORDER_INDEX`
  (0→1 and 0→2→3); `qa_review → qa_fixing` is the legal 80–95% QA cycle.
  **No phase regression in 1,886 events.**

## Defects caught by this gate family

- **D5** — agent-start-service listened for `task-started`/`task-failed` events
  the vendored runtime never emits; every successful start would have timed out.
  Fixed to the real contract (`execution-progress` = started).
- **D6** — `__dirname` under tsx ESM crashed the TUI at boot; caught by boot
  wait + screenshot (screen showed the ReferenceError).
- **D7** — `| tee` console capture tripped the TUI's TTY guard; moved to
  `script -qfc` sub-PTY logging.
- **D8** — agent-tty wait envelope `ok:true` on timeout; assertions moved to
  `result.matched`.
- **D9** — fixture used `.aperant/` while the vendored runtime only discovers
  `.auto-claude/`; board silently empty. Fixture corrected.
- **D10** — bridge-level `stream-event` re-emit alone never reached the
  AgentManager emitter; forward added in agent-process.ts (found via empty
  stream-event count in the flight recorder).

## Honest caveats

- The agent ran in **direct mode** (no task worktree appeared in
  `git worktree list`). Worktree creation under the TUI runtime is a real
  open item, visible in this run's step-06 artifact.
- This run's flight recorder lacks `stream-event` kinds (D10, fixed in the
  same commit series); Phase 3.5's run captures them.
- Runs used the operator-provided combo endpoint (`kimi/kimi-for-coding`).
  The public Moonshot platform path (`api.moonshot.ai`) shares the same code
  path with a different base URL; not separately exercised here.
