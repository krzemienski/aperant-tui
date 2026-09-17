# VERDICT — Aperant TUI surface proof across three real codebases

Run: `evidence/phase-4/run-20260917T013131-tui-surface/`
Date: 2026-09-17 (UTC). Host: macOS 27.0.0 / arm64 (Apple M4 Max), node v22.22.3.
Driver: `tools/tui-capture.py` (tmux PTY + `capture-pane -e` → ANSI→HTML → headless
chromium PNG @ dpr 2). Runtime floor probed: node v22.22.3, tmux 3.7c, playwright
chromium OK.
Projects: `~/Desktop/vigil`, `~/awesome-researcher`, `~/proofpunk-agent`.
Artifacts: 55 PNG + 110 supporting files, hashed in `MANIFEST.json`.

## The blocker that blocked every prior run — root-caused and fixed

Phase 4 recorded the UI facet as **UNVERIFIED**, attributing it to
"agent-tty cannot hold this Ink app's frame on macOS — 10+ boot attempts across
every variant painted blank or transient" (`docs/plan/phases/phase-4-VALIDATION.md:11-19`).

That diagnosis was wrong, and the real cause is one environment variable:

> `node_modules/ink/build/ink.js:111-116` — when `is-in-ci` reports true, Ink's
> renderer stores the frame and **returns without writing a single byte**.

Agent harnesses export `CI=true`. The app was healthy the whole time; every
harness was simply told to render nothing. Proven by controlled arms, same app,
same PTY, same geometry, single variable:

| Arm | Env | `APERANT` painted |
|---|---|---|
| armA | `CI=true` | **0** (blank) |
| armB | `CI` unset | **1** (full TUI) |

Secondary trap, same file (`ink.js:121-125`): when `outputHeight >= stdout.rows`
Ink swaps incremental repaint for a full `clearTerminal` on every frame, so a
short PTY samples a wiped screen. The harness pins ≥50 rows.

`tools/tui-capture.py` now unsets `CI` and eleven sibling CI triggers inside the
pane before exec. Verified immune: with `CI=true` **and** `GITHUB_ACTIONS=true`
exported in the parent, the board still renders (`wait` matched `BACKLOG` in 1.05s).

## Criteria-proof table

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | TUI renders in a real terminal on macOS | **PASS** | `armB.png`; every PNG below. Root cause + fix above. |
| 2 | Runs against ≥3 real codebases | **PASS** | `vigil/step-01-board.png` (3 tasks, `⑂ main`), `ar/step-01-board.png` (`⑂ feat/awesome-researcher`), `pp/step-01-board.png` (`⑂ master`) — each shows its real project name, real git branch, real task counts. |
| 3 | Every tab renders | **PASS** | Tabs 1-7 captured per project: `step-01-board` … `step-07-agents`. Text anchors matched for all 5 probed tabs × 3 projects (15/15). |
| 4 | Logs view | **PASS** | `vigil/step-13-logs.png` — `TASK LOGS · 003-cont · 0 lines` reached via `l`. |
| 5 | Overlays open AND close | **PASS** | `step-08-help*.png` (`KEYBINDINGS`), `step-09-palette*.png`. Help closes with `?` (verified `KEYBINDINGS` absent after). |
| 6 | Keypress navigation | **PASS** | `vigil/step-12-nav-jj.png` — `j j` moved selection 001→002→003 (selection row read back each press). |
| 7 | Command palette executes a command | **PASS** | `vigil/step-11-theme-matrix.png`, `pp/step-11-theme-amber.png` — `:theme <name>` typed and applied, colour change visible in pixels. |
| 8 | Real shell in the terminal pane | **PASS** | `pp/step-02-term-live-shell.png` — `ls proofpunk_agent` run inside the pane returns the real package listing (`app.py bridge screens state theme.py widgets`). |
| 9 | Account provisioned through the UI | **PASS** | `vigil/step-15-settings-account.png` + `pp/step-06-set-accounts.png`; disk facet: `~/.aperant/settings.json` → `anthropic → http://127.0.0.1:20128/v1`. |
| 10 | Agent starts and streams live | **PASS** | `vigil/step-16-agent-start.png`, `step-17-agent-running.png`, `step-27-d19-agent-planning.png` — AGENT STREAM shows `start 001-neut → vendored AgentManager…` then `started 001-neut: agent started — phase planning`. Log facet: `vigil/logs/agent-events-d19-fixed.jsonl`. |
| 10b | Agent produces a real plan and a real work product | **PASS** | After D19: `implementation_plan.json` written to disk (copied to `vigil/logs/`) — 4 phases / 9 subtasks, genuinely about vigil's DEFAULT_RAILS task. The coder then edited vigil's real source: `vigil/logs/agent-work-product.diff` (4,147 bytes) changes `src/engine/rails.ts` and `tests/verdict-rails.test.ts`, replacing the author-specific `Desktop/OmniRoute` path with the portable `${planRoot}` token — exactly the spec's ask. This is the leg phase 4 recorded as UNVERIFIED. |
| 11 | Observability views over a real run | **PASS** | `step-18-agents-{1..6}-*.png` — all six sub-views. `step-29-d19-trace-clean.png` shows `EVENT TRACE · all agents · 588 events`: `task:CODING_STARTED`, real `tool-call Bash` rows reading vigil's own `src/engine/rails.ts` and `tests/verdict-rails.test.ts`, and per-step token counts (21.2k / 12.0k / 15.1k / 15.9k). |
| 12 | Roadmap generates with visible streaming | **PASS** | `pp/step-21-roadmap-generating.png` — progress advanced `discovery 30%` → `features 50%` → complete. Disk: `proofpunk-agent/.auto-claude/roadmap/roadmap.json` = 4 phases / 10 features about proofpunk-agent itself. |
| 13 | Insights answers with a correct file reference | **PASS** | `ar/step-24-insights-answer.png` — answer: CLI entry point is `awesome_researcher/main.py`, mapping `awesome-researcher → awesome_researcher.main:cli_main`. **Verified on disk**: `main.py:1608 def cli_main`, `pyproject.toml` mapping byte-matches. |
| 13b | Ideation returns real findings in ALL SIX categories | **PASS** | `i` driven live on awesome-researcher; all six `*_ideas.json` written to `.auto-claude/ideation/` (~90 s each, sequential), **5 findings each = 30 total**, every one codebase-specific (e.g. "Split monolithic main.py (1792 lines)" — the real line count; "Replace CLI `--api_key` flag with env/stdin"). All six render in the UI after D20: `ar/step-31-ideation-{1..6}-*.png`. Phase 4 recorded this as PARTIAL (1/6). |
| 14 | Regression | **PASS** | `npx tsc --noEmit` exit 0; `CI=1 npx vitest run` → 9/9 passed. |
| 15 | No secrets in evidence | **PASS** | Strict scan (`sk-[A-Za-z0-9_-]{16,}`, token literal) → 0 matches over all 202 artifacts. (A naive `sk-` substring scan false-positives on `"task-execution"`.) |

Facet checklist: **screen** (66 PNGs) · **disk** (settings.json, roadmap.json,
`implementation_plan.json`, `agent-work-product.diff`, spec dirs, main.py) ·
**logs** (`agent-events-d19-fixed.jsonl`, 588 trace events) — no missing facet.

## Defects found by driving the real app, and fixed

| id | Defect | Fix | Proof |
|---|---|---|---|
| D14 | `agents`/`chat` were a one-way trap: AgentsView tells the user "esc then 1-7 to switch tabs", but `escape` only called `closeOverlays()`. Digits never restored tab navigation. | `escape` now ARMS tab-nav (1500 ms, `App.tsx`); the next digit consumes it. Digits stay owned by the views when unarmed — Ink's `useInput` has no consumption semantics, so sub-view selection is unaffected. | `vigil/step-25-d14-fixed-escape-digit.png`. Three-way check: digit w/o escape stays in agents ✓; escape shows the hint ✓; escape+`1` returns to board ✓. |
| D15 | `InsightsView`/`RoadmapView` hardcoded `cc/claude-opus-5` as the default model — a full router id passed verbatim to the queue, so when that route died upstream (503) there was no way to redirect it. | Default to the `sonnet` shorthand, which `resolveModelId` redirects via `ANTHROPIC_DEFAULT_SONNET_MODEL`. | 3 call sites; criterion 13 answer produced through the fixed path. |
| D16 | The queue never honoured the model-override env vars: `factory.ts` pre-flattened the shorthand before `buildDefaultQueueConfig`, so the queue saw a concrete id it could not match ("No available account in priority queue for model: glm/glm-5"); and queue resolution takes its id from `DEFAULT_MODEL_EQUIVALENCES`, which hardcodes vendor ids. | Pass the shorthand to the queue; re-apply the override **only** when that shorthand's env var is actually set **and** the queue picked an `anthropic` account. | Two arms, both on an Anthropic account: override set → `glm/glm-5` reaches the gateway and answers ✓; no override → `claude-sonnet-4-6` preserved ✓. **Non-Anthropic routing is NOT end-user proven** — no Ollama/OpenAI/Gemini account exists on this host. It is guarded by the `resolvedProvider === 'anthropic'` condition (`factory.ts:276`) and by code reading only; a provider-diverse queue would be required to prove it. |
| D17 | Advertised keys with no handler (`n`, `m`, `z`, `/ filter`, `⇥ cycle panes`, `z zoom`, `x kill pane`, `a add feature`, `⏎ send`, `/ history search`, `d/m/p/D` on tree); help said `L` for task logs when the binding is `l`; settings hint named `a` as Moonshot when `a` is Anthropic and `m` is Moonshot; logs hint promised `↑↓` when only `j/k` are bound. | `HelpOverlay.tsx` + `StatusLine.tsx` corrected against the real keymaps. | Visible in `pp/step-11-theme-amber.png` (`l logs`, no `/ filter`) and `pp/step-06-set-accounts.png` (`a Anthropic acct · m Moonshot acct`). |
| D18 | Typing a `?` into the insights ask box opened the **help overlay** instead of entering the character (and `:` would open the palette). Reproduced live: a typed question was swallowed mid-sentence. Ink's `useInput` has no consumption semantics, so the global keymap kept firing while a text input was focused. | Added `textInputActive` to the store; both global keymaps gate on it; `InsightsView` sets it while `asking` and clears it on blur/unmount. | `ar/step-26-d18-fixed-question-typed.png` — typing `what is the CLI entry point?` leaves the help overlay closed and the `?` lands in the input (asserted both ways). |
| D19 | **Every agent run failed.** The planner died three times with `anthropic api key is missing`, which surfaced as the misleading `Implementation plan validation failed after 3 attempts: File not found: implementation_plan.json` — the planner never ran, so it never wrote one. Cause: the agent Worker thread re-resolves auth from `process.env` using the SDK's standard names, but the TUI's credentials live in `settings.json` and the operator supplies `ANTHROPIC_AUTH_TOKEN`; `ANTHROPIC_API_KEY` was never set. | `applyAccountEnv()` in `agent-start-service.ts` mirrors the provisioned account's key/baseUrl into the standard SDK env names before start. Never overwrites an explicit value; never logs a key. | Before: 3× `api key is missing`, 0 plans. After: **0** key errors, plan written to disk (4 phases / 9 subtasks), 588 trace events, and a real 4,147-byte source diff against vigil. |
| D20 | The UI/UX ideation tab rendered `no findings for this type yet` even though the runner had written five real findings. The registry expected `ui_ux_improvements_ideas.json`, but the prompt that actually creates the file writes `ui_ux_ideas.json` (`apps/desktop/prompts/ideation_ui_ux.md:342`) while the type key stays `ui_ux_improvements`. Three labels also said "five types" for a six-type feature. | `IDEATION_TYPES` now carries a `files` list (most-specific first) and the loader accepts any known name; the labels derive from `IDEATION_TYPES.length`. | `ar/step-31-ideation-2-ui-ux.png` — five UI/UX findings render, header reads `IDEATION · 6 types`. All six tabs re-driven: 6/6 `RENDERS`, 0 `EMPTY`. |

D16's first form was caught before shipping: `resolveModelId` rewrites a shorthand
from `MODEL_ID_MAP` even with no env var set, so a "did it change?" test fires for
every shorthand and would have clobbered Ollama/OpenAI/Gemini routing with a Claude
id. The shipped form is gated on an explicitly-set env var **and** an Anthropic
provider, and the no-override arm was re-run to prove the vendored default survives.

## Known-limited (not defects in this app)

- **`cc/*` router models are OAuth-revoked upstream** (`401 OAuth access token has
  been revoked`, `503`). Live AI criteria were proven through `glm/glm-5` on the
  same gateway via the D16 override path. Not simulated.
- ~~Vendored planner bug: `Implementation plan validation failed after 3
  attempts: File not found …/worktrees/tasks/…`~~ — **not a planner bug and no
  longer a limitation.** That message was the downstream symptom of D19 (the
  worker had no API key, so the planner never ran and never wrote the file).
  Fixed; the planner now writes a real 4-phase plan and the coder produces a
  real diff. See criterion 10b.
- **`maxOutputTokens` compatibility warning** for unknown model ids is emitted by
  the AI SDK, not this app.

## Harness note

`tools/tui-capture.py` lives in the repo with the code it tests (tui-testing Iron
Rule 10). It never pipes the app (Rule 1 — tmux is the PTY), asserts the
condition-level `matched` field on every wait (Rule 2), types character-paced with
separate writes for overlay keys (Rule 3), pins ≥50 rows (Rule 5), proves visual
claims with rendered PNGs rather than text hashes (Rule 6), and passes credentials
by `--env` at session create only, never in argv (Rule 8).
