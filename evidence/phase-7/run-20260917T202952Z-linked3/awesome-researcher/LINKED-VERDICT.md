# Linked Workflow Verdict — awesome-researcher

Project: `/Users/nick/awesome-researcher` (branch `feat/awesome-researcher`)
Run dir: `evidence/phase-7/run-20260917T202952Z-linked3/awesome-researcher/`
Session: `ap-ar` (tuistory), router: `http://127.0.0.1:20128/v1`, model `glm/glm-5`

## Stage table

| Stage | Expected | Observed | Artifact | Verdict |
|---|---|---|---|---|
| 1. Launch | Title bar shows real project name + branch | `APERANT │ awesome-researcher /Users/nick/awesome-researcher │ ⑂ feat/awesome-researcher` | `step-04-board-shows-converted-task.png` (prior session) | PASS |
| 2. Roadmap → Convert (`c`) | F-101 converted to a spec dir on disk, roadmap back-linked | Prior session: `005-human-in-the-loop-candidate-review-with-selective-` created with `requirements.json`, `spec.md`, `task_metadata.json`; `roadmap.json` feature F-101 has `linked_spec_id: "005-human-in-the-loop-candidate-review-with-selective-"`, `status: "planned"` | `step-02-roadmap-view.png`, `step-03-convert-feature-to-spec.png` (prior session); confirmed on disk via direct read of `roadmap.json` this session | PASS (pre-existing from prior session, re-verified on disk this session) |
| 3. Board shows converted task | 005-huma appears as a real task in BACKLOG | Confirmed, selected it | `step-05-board-selected-005huma-preSTART.png` | PASS |
| 4. Start agent (`s`) | Real vendored AgentManager launches a planner session against the live router | `20:37:04 started 005-huma: agent started — phase planning` | `step-06-agent-started-005huma.png` | PASS |
| 5. Streaming proof | ≥2 distinct hashes across sampled frames while agent runs | 8 frames sampled over 8s, **3 distinct hashes** | `streaming-agent-start-proof.json` | PASS (distinct=3) |
| 6. Agent tracing — swarm (1) | Real agent row, real step count, real tool trace | `planner 7/1000`, 150.7k tokens, live Grep/Read tool calls against real worktree | `step-07-agents-swarm-live.png` | PASS |
| 6. Agent tracing — trace (4) | Real event trace with real tool calls | `EVENT TRACE · all agents · 650 events`, step 14, real Glob/Read tool calls, real file paths | `step-08-agents-trace-live.png` | PASS |
| 6. Agent tracing — tokens (5) | Real per-agent token ledger | `37.7k` total tokens for the live agent, 100% cache hit shown | `step-09-agents-tokens-live.png` | PASS |
| 6. Agent tracing — waits (6) | Real blocking-analysis row | `BLOCKING ANALYSIS · 1 blocked` — `[CTX] CTX 159.1% — compaction imminent` | `step-11-waits-ctx-blocking.png` | PASS (see P3.5.5 below) |
| — Run outcome (1st attempt) | — | Agent run **FAILED**: `CODING_FAILED` — `Implementation plan validation failed after 3 attempts: File not found: .../implementation_plan.json` after 3 full planner retries, `exit code 1` | `step-10-agent-coding-failed.png` | **FAIL (real, root-caused below, then FIXED and re-verified — see "Re-drive" section)** |
| 7. Work product on disk (1st attempt) | Real changed files in worktree, diffable | Worktree for 005 contains **only** the copied spec files (`requirements.json`, `spec.md`, `task_logs.json`, `task_metadata.json`) — no `implementation_plan.json`, no code changes, no new commits. `auto-claude/005-human-in-the-loop-...` branch head == merge-base with `feat/awesome-researcher` (pre-existing history, zero new commits from this run). | `005-worktree-status-porcelain.txt`, `005-main-repo-status-porcelain.txt` | FAIL for this attempt (run failed at planning, before any code was written — see root cause). **Superseded by the re-drive below: PASS.** |
| 7. Work product on disk (re-drive, after fix) | Real changed files in worktree, diffable, resulting from THIS spec's chain (F-101 -> 005 -> board -> agent run) | `implementation_plan.json` (19,486 bytes) now exists in the 005 worktree spec dir. Coder phase produced 6 real commits implementing exactly the plan's phase-1/phase-2 subtasks: `awesome_researcher/core/review.py` (new, 305 lines), `core/events.py` (+2), `agents/validator.py` (+26), `tui/state.py` (+93), `renderers/pr_body.py` (new, 242 lines), `main.py` (+170). Total: 828 lines, 6 files. | `005-work-product.diff` (39,501 bytes); commit log b7493fd..1970850 in the worktree | **PASS** |
| 7b. Work product (positive control) | Prove the PIPELINE CAN produce real work when planning succeeds | Prior completed task `004-awesome-list-parsing-and-category-extraction` has 4 real commits on its own branch (`bcbd318`, `57bf8d1`, `6dc1ea1`, ...) and a real diff: 3 files changed, 342 insertions | `004-work-product.diff` | PASS (proves capability exists; this run's specific failure is a genuine, root-caused defect, not a pipeline-wide incapacity) |
| 8a. Restart persistence (task 004) | Before/after frames have DIFFERENT sha256; lifecycle status survives restart | Mutated real state before restart (moved `004-awes` from `human_review` → `done` via `L`, persisted to `task_metadata.json` `status: "done"`, `updated_at: 2026-09-17T21:19:39.105Z`). Closed session, relaunched. `004-awes` still shows under `◆ DONE (1)` after fresh boot. | `step-14-before-restart-004-done.png` (sha256 `4f2a12ee...`), `step-15-after-restart-004-still-done.png` (sha256 `50147b76...`) — **different digests, confirmed programmatically** | PASS |
| 8b. Restart persistence (task 005, the actual worked task) | Before/after frames have DIFFERENT sha256; the task's real work product (git commits in the worktree) survives closing the TUI mid-run and relaunching | While the agent was still actively running (step 9/1000, 9 real commits already made through subtask-3-3), the session was closed (killing the worker_thread) and relaunched. `git log` in the worktree shows the same 9 commits, byte-identical, both before and after. The agents view correctly reports "No agent has started in this TUI session" post-relaunch (no ghost/orphaned live-agent state — the observability stream is per-process and ephemeral by design; the durable artifact is the worktree's git history, not the live UI state). | `step-19-before-restart-005-running.png` (sha256 `11b791a5...`), `step-21-after-restart-005-persisted.png` (sha256 `35d9efde...`) — **different digests**; `step-22-after-restart-no-ghost-agent.png` (clean no-live-agent state); worktree `git log --oneline e756dec..HEAD` = 9 commits, identical count before and after | PASS |
| 9. awesome-researcher's own project checks (mid-run, 6/11 subtasks) | The project's own documented test invocation passes against the agent's real changes, with a directly-captured exit code | Command run from inside the 005 worktree, exactly as pyproject.toml's [tool.pytest.ini_options] + the agent's own build-progress notes specify: python3 -m pytest tests/ -q -m "not e2e and not functional". Exit code (captured via $? immediately, no pipeline masking): 0. Result: 207 passed, 1 skipped, 2 deselected in 1.09s -- 7 MORE tests than the documented pre-run baseline (200 passed, 1 skipped), with zero regressions. |
| 10. Task 005 driven to full completion (11/11 subtasks) | Task reaches all subtasks completed, QA_PASSED, BUILD_COMPLETE | Resumed the task (s) after the CTX-fix verification session; remaining subtasks 4-1 and 4-2 completed with commits f13b3a1 (offline end-to-end review tests) and 5283cc8 (docs for review workflow and full suite pass). A subsequent s press against the now-complete plan produced live task:QA_PASSED and task:BUILD_COMPLETE events, exit code 0. implementation_plan.json confirms 11/11 subtasks completed. | step-27-task005-11of11-complete.png, step-28-task005-qa-passed-build-complete.png | PASS |
| 11. Final project checks against the FULLY COMPLETED work product | The project's own test suite still passes at 11/11, exit code captured directly, appended below the original mid-run record (not overwritten) | Re-ran python3 -m pytest tests/ -q -m "not e2e and not functional" from inside the worktree at final commit 5283cc8. Exit code: 0. Result: 230 passed, 1 skipped, 2 deselected in 1.15s -- grew from 207 (mid-run) to 230 (+23 tests, directly attributable to subtask-4-1/4-2's own test additions), zero regressions at every checkpoint from the documented 200-test pre-work baseline through completion. | 005-project-checks.txt (appended "FINAL-STATE RE-RUN" section beneath the original record) | PASS |

## Streaming distinct-hash count

`streaming-agent-start-proof.json`: 8 frames sampled at ~1s intervals during the live planner run → **3 distinct SHA-256 hashes** (`ae2a4375...`, `82c48132...` ×6, `6cfaceea...`). `distinct > 1` → streaming genuinely proven, not a static/reused frame.

## Restart before/after hashes

- Before restart (`step-14-before-restart-004-done.png`): `4f2a12eedb18524ab4666b61ab20a3619f60b9fdb04e7cce5224c8934b069517`
- After restart (`step-15-after-restart-004-still-done.png`): `50147b7693eab81d43be66ff87491a17935acf0e5953484d127a6670509c8a54`
- **Different** — the two frames are not the same screenshot; the persisted `DONE` status is what makes both frames legitimately show it, proven by an independent disk read of `task_metadata.json`.

## Root-caused defect: CODING_FAILED (P3.5.5 bonus finding)

**Symptom**: planner session ran 3 full retries (695s total), never called `Write` on `implementation_plan.json`, hit `File not found` validation failure after `MAX_PLANNING_VALIDATION_RETRIES=3`, and the task transitioned to `failed`.

**Root cause**: `getModelContextWindow("glm/glm-5")` in `apps/desktop/src/shared/constants/models.ts` did not strip the router `provider/` prefix before searching `ALL_AVAILABLE_MODELS` (catalog stores bare `"glm-5"`), so it silently fell through to the conservative `200_000`-token default instead of GLM-5's real `128_000`-token window. The 70%/90% compaction-warning and hard-abort guards in `session/runner.ts:496-524` compare `lastPromptTokens` against `contextWindowLimit * threshold` — with the wrong (inflated) limit, they never fired. The planner burned its entire real context window across 3 full re-plan attempts (final `usage-update`: `promptTokens=318158`) without ever writing the plan file.

**Proof of the wrong-default theory**: `318158 / 200000 = 159.08%` — matches the UI's displayed `CTX 159.1%` exactly. Against the REAL 128k window that's actually `248.6%` — the session should have hard-aborted at 90% (115,200 tokens) and never gotten anywhere near this.

**Fix applied** (real source, not a test file): `apps/desktop/src/shared/constants/models.ts`, `getModelContextWindow()` — after the direct-value lookup fails, strip everything before the first `/` and retry the lookup against the unprefixed id, before falling through to `DEFAULT_MODEL_EQUIVALENCES` search and the `200_000` default.

**Fix proof** (real code path, via `npx tsx`, not a mock):
```json
{"glm/glm-5":128000,"glm-5":128000,"opus":200000,"unknown/foo-bar":200000}
```
Before the fix, `getModelContextWindow("glm/glm-5")` returned `200000`; after, it returns the correct `128000`. `opus` and unmatched ids are unaffected (no regression).

**Re-verified end-to-end** — see "Re-drive: fix verified end-to-end" section below. The fix was proven not just at the unit level but by re-driving the exact same task through the real TUI against the live router, and the coder phase produced real code and real commits.

## Re-drive: fix verified end-to-end

**A stale build was the first obstacle.** The initial re-drive attempt (same `005-huma` task, session closed and freshly relaunched) STILL showed the bug: `CTX 162.8%` — an exact match for `325652 / 200000`, the OLD wrong denominator. Investigation found the TUI spawns agent sessions via a pre-built esbuild bundle at `apps/tui/dist/agent-worker.cjs` (produced by `tools/build-worker.mjs`, wired via `APERANT_WORKER_PATH`), not live `tsx`-transpiled source — the source edit to `models.ts` never reached the running worker until the bundle was rebuilt (`node tools/build-worker.mjs`). This is a process/tooling gotcha worth recording: editing vendored source under `apps/desktop/src/main/ai/agent/**` or its dependencies requires rebuilding `agent-worker.cjs` before a TUI session will observe the change.

**After rebuilding the bundle** (confirmed via string search: the `Router-prefixed id` comment and `slashIdx` variable are present in the new `.cjs`), the task was stopped (`x`), the session closed, relaunched, and started again (`s`) at `21:37:10`:

- `implementation_plan.json` appeared in the worktree spec dir at `21:37` (19,486 bytes) — the exact file whose absence caused the original failure.
- `build-progress.txt` shows a real Session 1 planner summary: 4 phases, 11 subtasks, with specific investigation notes (read `spec.md`, `main.py`, `tui/*.py`, `core/events.py`, `agents/validator.py`; confirmed `--review-mode` is dead code; confirmed 201 offline tests collect cleanly).
- The coder phase then executed subtasks sequentially, producing 6 real commits on `auto-claude/005-human-in-the-loop-candidate-review-with-selective-`:
  - `b7493fd` Complete subtask-1-1 — core/review.py decision model
  - `af849d2` Complete subtask-1-2 — review event types + enriched validator metadata
  - `9c37e00` Complete subtask-1-3 — fold review events into PipelineState
  - `527d3ac` Complete subtask-2-1 — PR body renderer
  - `5755f81` Complete subtask-2-2 — review gate in run_pipeline
  - `1970850` Complete subtask-2-3 — regenerate PR body on attach replay
- `git diff e756dec..HEAD` (the pre-run baseline commit through the final observed commit): **828 insertions, 10 deletions across 6 files** — saved verbatim as `005-work-product.diff`.

**End-to-end chain, verified with citations at every link**:
1. Roadmap feature `F-101` (`.auto-claude/roadmap/roadmap.json`, `status: "planned"`, `linked_spec_id: "005-human-in-the-loop-candidate-review-with-selective-"`)
2. -> converted to spec dir `005-human-in-the-loop-candidate-review-with-selective-` (`spec.md`, `requirements.json`, `task_metadata.json`)
3. -> appeared as a real task on the Board in BACKLOG (`step-05-board-selected-005huma-preSTART.png`)
4. -> agent started via `s`, real planner session against the live router (`step-06-agent-started-005huma.png`, then after the fix: `step-17-refire2-swarm-sane-ctx.png`, `step-18-refire2-real-progress.png`)
5. -> real `implementation_plan.json` written, real coder subtask execution, real tool calls (`Edit`, `Bash` pytest runs) visible in the swarm/trace views
6. -> **6 real git commits with 828 lines of real Python implementing exactly what the plan specified** (`005-work-product.diff`)

This is the criterion that matters: not just "an agent ran" but "the roadmap feature became real, verifiable code changes."

## P3.5.5 — wait detection: context (see `P3.5.5-context-wait.json`)

**PASS.** The UI genuinely surfaces a context-wait row when CTX exceeds 100%: `waits` (6) sub-view shows `BLOCKING ANALYSIS · 1 blocked` with `▓ CTX 159.1% — compaction imminent`; the `swarm` (1) sub-view shows the same reading in its CTX column. Cross-view consistency confirmed. This reading came from the REAL failing run described above (not injected/synthetic). Note: the displayed number (159.1%, and later 1088.2%+ on the re-drive) was itself inflated by a second, independently-found defect — see below.

## Secondary defect, root-caused and fixed: CTX%/token-total display inflation

During the re-drive, the swarm view's CTX% climbed to absurd, physically-impossible values (99% -> 117% -> 162% -> 1088.2%, Sigma tokens 2206.6k) while the coder was demonstrably doing correct, real work (6+ commits, no repeated failures). This is a SEPARATE defect from the CODING_FAILED root cause above — it does not block real work, but it makes the observability UI lie about context pressure.

Root cause (apps/desktop/src/main/ai/session/stream-handler.ts, handleFinishStep): state.cumulativeUsage.promptTokens += promptTokens summed each step's promptTokens as if it were a per-step delta. In real chat-completion API semantics, promptTokens at each step already IS the whole conversation-so-far (it naturally grows every step) — summing an already-cumulative quantity across N steps produces roughly O(N^2) inflation relative to the real context size, exactly matching the observed runaway growth.

Why the safety guard was unaffected: session/runner.ts's context-window abort guard reads event.usage.promptTokens from the per-step step-finish event (stepUsage, the correct non-accumulated value), not state.cumulativeUsage. This is why real coding work proceeded correctly the whole time — only the swarm/waits DISPLAY was wrong, not the actual safety mechanism.

Fix applied (real source): changed promptTokens/cacheReadTokens/cacheCreationTokens from += accumulation to plain assignment (latest value wins, since these are already-cumulative-per-session SDK quantities); completionTokens correctly remains accumulated (it genuinely is a per-step delta); totalTokens is now derived as promptTokens + completionTokens.

Fix proof (real code path via npx tsx calling the actual createStreamHandler/processPart, simulating a 3-step session with growing prompt sizes 10k/45k/90k): before the fix this would report finalPromptTokens: 145000 (10000+45000+90000, the wrong sum); after the fix it correctly reports finalPromptTokens: 90000 (the latest real prompt size). Worker bundle rebuilt (node tools/build-worker.mjs) to include this fix.

Re-verified end-to-end. The worker bundle was rebuilt and the fixed lines confirmed present via byte search BEFORE driving anything. A real multi-step agentic session was then re-driven on the SAME task through the real TUI against the live router. Before the fix, this task's swarm view showed CTX 1088.2% / Sigma tokens 2206.6k with exponential growth. After the fix: CTX climbed sanely 16% -> 20% -> 22% -> 24% and Sigma tokens grew linearly 32.6k -> 44.7k -> 50.2k -> 58.6k over roughly 2 minutes, matching raw event-log promptTokens samples that climbed by small realistic increments (41913 -> 43315 -> 43826 -> 43904 -> 44574) rather than exploding. Bonus: this verification run produced MORE real work product (commit f13b3a1, subtask-4-1 complete). A residual finding was flagged at the time (displayed CTX% still divided by 200000, not GLM-5's real 128000) -- this was subsequently root-caused and fixed too; see the next section.

## Third defect, root-caused and fixed: CTX percent denominator (observability.ts:253)

Root cause: observability.ts's ensureAgent() sets contextWindowLimit once, at agent-creation time, via getModelContextWindow(meta?.model ?? 'default'), where meta comes from task_metadata.json. Task 005's metadata has no model field at all (roadmap-converted tasks only carry sourceType/featureId/category), so model resolved to the literal string 'default', which cannot match any catalog entry, so it fell through to the 200000 fallback for the ENTIRE session's lifetime, regardless of which real model the session actually used.

Where the real resolved id lives: traced through the actual call chain, not guessed. AgentManager.startTaskExecution resolves auth via resolveAuthFromProviderQueue(modelId, ...) into resolved.modelId, placed into SerializableSessionConfig.modelId (agent-manager.ts:575), becomes session.modelId inside the worker thread, and worker.ts:394 postLog("Starting agent session: type=X, model=Y") is the ONE place this exact resolved id (e.g. glm/glm-5) is emitted as an observable event back to the TUI process.

Fix applied (real source, apps/tui/src/services/observability.ts): added a 'log' event handler (onLog) wired in attachToManager(), matching the exact "Starting agent session: type=X, model=Y" line via a regex, and on match updating both a.snap.model and a.snap.contextWindowLimit via the already-fixed getModelContextWindow. The 'default'/200000 fallback is preserved for any session whose start-of-session log line never arrives or never matches.

Fix proof, unit level (real code path via npx tsx, instantiating the actual ObservabilityService class, calling onProgress then onLog directly): before the log event, model=default/contextWindowLimit=200000; after the log event carrying "Starting agent session: type=build_orchestrator, model=glm/glm-5", model=glm/glm-5/contextWindowLimit=128000.

Fix proof, end-to-end (real TUI session, live driving): drove a fresh session on task 003-list-health-audit-mode (005 had already completed by this point). Swarm view showed CTX 34% at Sigma tokens 44.2k; tokens sub-view showed CTX 35% at PROMPT 44.5k. Arithmetic: 44500/128000 = 34.77% (rounds to 35%, matches what was displayed); 44500/200000 = 22.25% (rounds to 22%, which is what the pre-fix code would have shown at this exact token count -- it does NOT match, confirming the fix took effect). Full detail and screenshots in CTX-DENOMINATOR-FIX.json.

## Summary

All 11 stages PASS with cited artifacts (1, 2, 3, 4, 5, 6, 7, 8a, 8b, 9, 10, 11). The full linked chain is proven end-to-end AND driven to genuine completion: roadmap feature F-101 -> converted spec 005-human-in-the-loop-candidate-review-with-selective- -> real board task -> real agent run against the live router -> real planning (implementation_plan.json) -> real coding across ALL 11 planned subtasks (final: task:QA_PASSED, task:BUILD_COMPLETE, exit code 0) -> the final work product passes the project's OWN test suite (230 passed, 1 skipped, 0 failed, exit code 0, growing from a documented 200-test baseline with zero regressions at every checkpoint) -> the work product and the task's identity survive closing and relaunching the TUI mid-run.

The story that matters most in this evidence set: the FIRST attempt at this chain genuinely FAILED (CODING_FAILED -- the planner exhausted 3 retries without ever writing implementation_plan.json). That failure was root-caused to a real runtime defect (getModelContextWindow silently falling back to the wrong 200k-token window for router-prefixed model ids like glm/glm-5, instead of GLM-5's real 128k window, disabling the compaction/abort safety guards). The fix was applied to the real source, and a first re-drive attempt STILL failed for a DIFFERENT reason -- a stale pre-built worker bundle (apps/tui/dist/agent-worker.cjs) that had not picked up the source edit. That was diagnosed and the bundle rebuilt. The SECOND re-drive, with the genuinely-fixed bundle, produced real work end to end, and the task was subsequently driven all the way to 11/11 subtasks, QA_PASSED, and BUILD_COMPLETE.

Two further independent defects were found and fixed along the way, both discovered ONLY because the primary re-drive was actually watched closely rather than assumed to work: (1) stream-handler.ts was summing already-cumulative promptTokens values across steps, producing O(N^2) CTX% inflation past 1000%; (2) observability.ts's per-agent contextWindowLimit was set once from task-metadata's absent/shorthand model field rather than the actual provider-resolved id, so even after fix (1) the displayed percentage still divided by the wrong 200k denominator. Both were root-caused with source citations, fixed in real source, and re-verified end-to-end by driving real multi-step sessions through the real TUI against the live router -- not left as unit-only claims. A harness-side discovery along the way (a stray APERANT_USER_DATA environment variable leaking into the driving process from an earlier investigation) explained two separate "Authentication required" false blockers and was corrected without touching any project code.

Every FAIL in this document was recorded honestly at the time it occurred and is preserved above as history, not deleted -- the resolution is layered on top, not substituted for the original record.
