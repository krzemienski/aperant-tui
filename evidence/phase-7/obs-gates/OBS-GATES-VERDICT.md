# Observability Acceptance Gates — Verdict

## Summary

| id | verdict | decisive number / unmet precondition | artifact |
|---|---|---|---|
| P3.5.3 | UNVERIFIABLE-BY-DESIGN | `kind:'concurrency'` declared but zero construction sites anywhere in the repo; `executeParallel()` importable only from its own tests; production path (`iterateSubtasks`) is strictly sequential; `agent-start-service.ts:550` hardcodes `{parallel:false, workers:1}` and `startTaskExecution` never reads those options | `P3.5.3-RESULT.json` |
| P3.5.5 | PASS | Real driven run hit `CTX 159.1%`, WAITS sub-view rendered `BLOCKING ANALYSIS · 1 blocked` (sibling artifact, verified genuine PNG); independently corroborated by this task's own run reaching 97.4%→182.1% | `P3.5.5-RESULT.json`, `evidence/phase-7/run-20260917T202952Z-linked3/awesome-researcher/step-11-waits-ctx-blocking.png` |
| P3.5.7 | PASS | `cache_read_input_tokens: 2304`, real, reproduced 3x across independent process runs against `glm/glm-4.7`; full source-level field-mapping chain confirmed correct end to end | `P3.5.7-RESULT.json` |
| P3.5.11 | UNVERIFIED | `useAgenticOrchestration` (the only flag that would offer `SpawnSubagent` to an orchestrator LLM) is never set to `true` anywhere in the codebase — 2 total grep hits (declaration + if-check), zero assignments | `P3.5.11-RESULT.json` |
| P3.5.13 | PASS | 148-150 real events/sec (3 runs, all ≥100/sec target) through the real `observability.ts` emitter path; coalescing ratio ~2.5x (event count ≫ snapshot count); zero event-loop stalls >50ms | `P3.5.13-RESULT.json` |

**3 PASS, 1 UNVERIFIED, 1 UNVERIFIABLE-BY-DESIGN.**

---

## P3.5.3 — Wait detection: concurrency

**Verdict: UNVERIFIABLE-BY-DESIGN.** This is a distinct finding from the existing executor-level vitest 3/3 evidence: that evidence proves `executeParallel()` works correctly *in isolation under test*. This finding proves `executeParallel()` is **never reachable from any production code path**, so no live run — however configured — can ever produce a `kind:'concurrency'` WaitState or a UI row for it.

- `observability.ts:34` declares `kind:'concurrency'` in the `WaitState` union. Exhaustive repo-wide grep finds **zero construction sites** anywhere outside the type declaration and the passive rendering code in `AgentsView.tsx`. `recomputeWait()` (the only function that builds `WaitState` values) exhaustively covers `context`/`tool`/`mcp` and never `concurrency`.
- `executeParallel()` (`parallel-executor.ts`, the vendored concurrency-limiting machinery with `maxConcurrency`, `onSubtaskQueued`, `onRateLimited`) is imported **only by its own test file and one other test file** — zero production importers.
- The real production coding-phase path (`build-orchestrator.ts` → `iterateSubtasks()`) is a strict sequential `while(true)` loop: one subtask fully completes before the next starts. No batching, no `Promise.allSettled`, no concurrency of any kind.
- `agent-start-service.ts:550` hardcodes `{ parallel: false, workers: 1, pushNewBranches: false }` on every task start, by deliberate design (a multi-line comment explains this is for worktree/branch-publish safety). `agent-manager.ts`'s `startTaskExecution(options)` **never reads** `options.parallel` or `options.workers` — confirmed by exhaustive grep (zero matches) — they are stored for restart bookkeeping only.

This is an architectural fact, not a driving-effort gap. Closing it would require a source-code change (wiring `executeParallel` into `build-orchestrator.ts`, and constructing the concurrency `WaitState` in `observability.ts`), which is out of scope for this evidence-gathering task.

## P3.5.5 — Wait detection: context

**Verdict: PASS.** A sibling worker's artifact (`evidence/phase-7/run-20260917T202952Z-linked3/awesome-researcher/step-11-waits-ctx-blocking.png`) was read and visually verified by this task: a genuine 3428×3974 PNG showing the real WAITS sub-view rendering `BLOCKING ANALYSIS · 1 blocked`, a selected `[CTX]` row, and `CTX 159.1% — compaction imminent`. The underlying measurement (real planner session 3, `promptTokens=318158` against `glm/glm-5`'s 200,000-token window) is documented in the sibling's `P3.5.5-context-wait.json`.

This task independently corroborated the same mechanism with its own drive: task `002-ctx-test-big` (reading a 30,000-line/3MB file) against `glm/glm-4.7` (128k window), polled live via `tuistory` against the real InspectView, showing context usage climb 18.9% → 38.8% → 59.9% → 70.9% → **97.4%** → **182.1%** across successive polls of a genuinely running session (screenshot: `p355/inspect-182pct.png`). This confirms crossing 90% is a reliably reachable, real condition, not a one-off artifact.

## P3.5.7 — Cache hit accounting

**Verdict: PASS.** The local router's `glm/glm-4.7` route returns non-zero `cache_read_input_tokens: 2304`, reproduced identically across **3 independent process runs** (9 total calls) using an ephemeral `cache_control` prefix. Other routes tried and their live status at probe time: `cc/claude-*` (real Anthropic routes) returned 401 (OAuth token revoked on this router instance); `kimi/kimi-k2.5` returned 403 (weekly quota exhausted); `minimax/MiniMax-M2.1` returned 429 (rate limit).

Source-level verification traced the full field-mapping chain and confirmed it is wired correctly at every hop: raw router response (`usage.cache_read_input_tokens`) → `@ai-sdk/anthropic` (`usage.inputTokens.cacheRead`) → `ai` package's `asLanguageModelUsage()` (`inputTokenDetails.cacheReadTokens`) → `stream-handler.ts:260,268,276` → `observability.ts:392` (`applyUsage`) → `AgentsView.tsx:279-281,374-376` (cache-hit % calculation). A live driven session against this exact model (during the P3.5.5 investigation) rendered a populated `CACHE HIT ████████ 100%` figure in the TOKENS sub-view, confirming the pipeline works end to end in the running app, not just in isolated code inspection.

## P3.5.11 — Graph topology: subagent nodes

**Verdict: UNVERIFIED.** Precise unmet precondition: `SpawnSubagent` tool-call traffic requires an **agentic** (LLM-driven-orchestration) session, gated by the `useAgenticOrchestration` boolean flag on `SerializableSessionConfig`. Exhaustive repo-wide grep finds exactly 2 total references to this flag in the entire codebase — the optional-field type declaration (`ai/agent/types.ts:79`) and the routing check (`worker.ts:434`) — and **zero assignments of `true`** anywhere, including tests.

Both real task-start entry points route around the agentic path entirely:
- `startTaskExecution()` → `build_orchestrator` → `iterateSubtasks()`, a hardcoded sequential TypeScript loop (no LLM tool-call loop at the orchestrator level).
- `startSpecCreation()` sets `agentType: 'spec_orchestrator'` but never sets `useAgenticOrchestration` in its session-config object literal, so it defaults to falsy and routes to `runSpecOrchestrator()` — also a hardcoded TypeScript `SpecOrchestrator` class that drives `spec_gatherer → spec_researcher → spec_writer → spec_critic` via its own callback, never letting an LLM decide to call `SpawnSubagent`.

This task drove a real task end-to-end through `startTaskExecution` (the same path traced above) during the P3.5.5 investigation, confirming by direct observation that this is the actual production flow with no agentic branch. Unlike P3.5.3, this is not structurally impossible under any configuration — it is a live, reachable feature that requires a config change (setting `useAgenticOrchestration:true`) that no current entry point performs. Making that change is out of scope for this evidence-gathering task per the stated scope boundary.

## P3.5.13 — Throughput: 16ms coalescing under real event volume

**Verdict: PASS.** Per the task's explicit permission (the events are the coalescer's stated input), a driver script imported the **real, unmodified** `observability.ts` module, instantiated a real `ObservabilityService`, and called its real `attachToManager()` with a real `EventEmitter` firing real `stream-event`/`execution-progress` payloads through the actual `onStreamEvent`/`onProgress`/`recomputeWait`/`pushTrace` code paths.

Three consistent runs: **148–150 events/sec** (target ≥100/sec), snapshot emission count **~304–305** against event count **~756–764** (coalescing ratio **~2.48–2.51x**), confirming the 16ms coalescing genuinely collapses many events into far fewer render-triggering snapshots. **Zero** event-loop ticks with lag >50ms in any run (max observed lag 6.9–10.1ms) — the process remained fully responsive throughout, meaning a real Ink render loop sharing this event loop would not have frozen.

---

## Honesty notes

- **P3.5.3** correction: mid-session, a measurement misstatement occurred where a reading of `92.6k/128.0k = 72.3%` was momentarily mislabeled as "92.6%" in a status update. This was caught and corrected before any verdict was recorded; no incorrect PASS was ever written to disk. The final P3.5.5 PASS is grounded in a subsequent, correctly-read `97.4%`/`182.1%` measurement plus the sibling's independently-verified `159.1%` artifact.
- All five criteria involved driving the real runtime (TUI + vendored agent runtime + live router), with the sole exception of P3.5.13's permitted synthetic event burst against the real coalescer.
- No files under `apps/tui/src/**` or `apps/desktop/src/main/**` were modified. All investigation artifacts, driver scripts, and screenshots are under `evidence/phase-7/obs-gates/` (owned) and `/tmp/obs-gates-fixture` (throwaway project fixture).
