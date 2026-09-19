# Vendored Patch Manifest

`apps/desktop/` is vendored from upstream Aperant 2.8.0-beta.6 (see
`VENDORED.md`, `apps/DESKTOP-SHA256SUMS.txt`). The following intentional
downstream patches exist. Every one is marked inline with
`[APERANT-PATCH <name>]` and is additive-only: no upstream behavior changes
when the patch's trigger is absent.

## moonshot-provider (2026-08-12)

Adds Moonshot AI (Kimi) as a first-class provider via the workspace package
`@aperant/moonshot-provider` (`libs/moonshot-provider`).

| File | Change |
|---|---|
| `shared/types/provider-account.ts` | `BuiltinProvider` += `'moonshot'`; `ProviderAccount` += optional `headers`, `kimiChatId` |
| `main/ai/providers/types.ts` | `SupportedProvider.Moonshot = 'moonshot'` |
| `main/ai/providers/factory.ts` | `case Moonshot` → `createMoonshot({apiKey, baseURL, headers})` |
| `main/ai/providers/registry.ts` | same case for the registry path |
| `main/ai/auth/resolver.ts` | `BUILTIN_TO_SUPPORTED` += moonshot; API-key resolution passes account `headers`/`kimiChatId` through (e.g. `X-Kimi-Chat-Id` for agent-gw) |
| `main/ai/auth/types.ts` | `PROVIDER_ENV_VARS.moonshot = 'MOONSHOT_API_KEY'` |
| `main/ai/config/types.ts` | `MODEL_PROVIDER_MAP` += `kimi-`, `kimi/`, `kmc/` (2026-09-15: operator gateway kimi-model-credit ids), `moonshot-`, `moonshot/`, `cc/` (2026-09-16: operator Anthropic-compatible router ids, e.g. `cc/claude-opus-5`) |
| `shared/constants/models.ts` | moonshot entries in `DEFAULT_MODEL_EQUIVALENCES` (opus/sonnet tiers) + native `kimi-k2` / `kimi-k2-turbo` shorthands |

## worker-path (2026-08-12)

| File | Change |
|---|---|
| `main/ai/agent/worker-bridge.ts` | `resolveWorkerPath()` honors `APERANT_WORKER_PATH` when set — the TUI bundles the worker with esbuild (`tools/build-worker.mjs` → `apps/tui/dist/agent-worker.cjs`) because the electron-vite output tree the default path expects does not exist outside Electron. |

## queue-shorthand-resolution (D16, 2026-09-17)

| File | Change |
|---|---|
| `main/ai/client/factory.ts` | `buildDefaultQueueConfig()` receives the model SHORTHAND rather than the env-resolved id, and `ANTHROPIC_MODEL_ENV_OVERRIDES` re-applies an explicit `ANTHROPIC_DEFAULT_*_MODEL` override only after queue resolution. Pre-resolving handed the queue a concrete id (e.g. `glm/glm-5`) that matches no entry in `resolveModelEquivalent()`'s shorthand-keyed table, so every account was skipped with "No available account in priority queue". Anthropic-only by construction: these env vars name Anthropic defaults and must never rewrite an id the queue resolved for another provider. |

## sdk-v7-dependencies (2026-08-12)

Dependency half of the `sdk-v7-usage` patch. JSON carries no inline marker, so
it is recorded here for the `DESKTOP-SHA256SUMS.txt` drift audit.

| File | Change |
|---|---|
| `package.json` | AI SDK v6 → v7 major upgrade (`ai` ^6.0.116 → ^7.0.62 and every `@ai-sdk/*` provider major), `@anthropic-ai/sdk` ^0.78 → ^0.116, `@openrouter/ai-sdk-provider` ^2 → ^3, plus the `@aperant/moonshot-provider` workspace link. The usage-shape consequences are handled inline by `[APERANT-PATCH sdk-v7-usage]` in `main/ai/session/stream-handler.ts`. |

## observability-tap (2026-08-12)

Spec: `aperant-agent-observability-spec.md` §7.1–7.2 ("needs no new
instrumentation… except queued-subtask visibility").

| File | Change |
|---|---|
| `main/ai/agent/worker-bridge.ts` | re-emits the raw `StreamEvent` as `stream-event` alongside the existing tracker feed (tool-call/tool-result/step-finish/usage-update visibility) |
| `main/agent/types.ts` | `AgentManagerEvents` += `'stream-event'` (payload `unknown`; subscribers narrow to `StreamEvent`) |
| `main/ai/orchestration/parallel-executor.ts` | `ParallelExecutorConfig.onSubtaskQueued` (optional) — fired for subtasks in batches beyond the first, before execution begins; behavioral proof in `apps/tui/src/services/__tests__/parallel-executor-queued.test.ts` |

## stream-ping (2026-09-17)

D-STREAM-PING investigation (Defect 1: "Stream inactivity timeout — no data
for 60s" killing ideation/coding sessions). Root cause: `@ai-sdk/anthropic`'s
SSE-to-part transform (`dist/index.js`, `case "ping": { return; }`) discards
server ping/keepalive frames before they ever become a `fullStream` part,
unless `includeRawChunks` is set on the `streamText()` call. The stream
consumption loop already resets the inactivity watchdog unconditionally on
every part type it receives (text-delta, reasoning-delta, tool-call,
tool-result, step-finish, usage-update, …) — the gap was purely upstream
ping visibility, not the reset mechanism itself. Additive: the option is
scoped to one `streamText()` call in `runner.ts`; the other five
`streamText()` calls in this vendored tree (`ideation.ts`, `insights.ts`,
`roadmap.ts` ×2, `github/parallel-orchestrator.ts` ×3) do not pass
`includeRawChunks` and are unaffected. `stream-handler.ts`'s `processPart()`
switch has no `default` clause and already documents `raw` as an
intentionally-ignored part type in its fallthrough comment; the
`FullStreamPart` union carries a `{ type: string; [key: string]: unknown }`
fallback member, so the new `'raw'` part type-checks without modification.

| File | Change |
|---|---|
| `main/ai/session/runner.ts` | New `readTimeoutMsEnv()` helper (NaN-safe env parsing). `STREAM_INACTIVITY_TIMEOUT_MS` / `TOOL_EXECUTION_INACTIVITY_TIMEOUT_MS` now read `APERANT_STREAM_INACTIVITY_TIMEOUT_MS` / `APERANT_TOOL_INACTIVITY_TIMEOUT_MS`, falling back to the pre-existing `180_000` / `660_000` literals when unset (no default-value change — env-configurability only). The `executeStream()` `streamText()` call passes `includeRawChunks: true`, closing the ping-visibility gap. |

## merge-resolver-stream (2026-09-17)

F-16: AI conflict resolution (`WorktreeView` `R` key) failed every real
attempt against the operator's Anthropic-compatible router with
`APICallError: Invalid JSON response`, while the SAME router/model
succeeded for every other AI entry point (roadmap, insights, ideation —
all of which stream). Reproduced directly: `generateText()`'s non-streaming
`doGenerate()` requires the whole HTTP body to be exactly one JSON
document (`@ai-sdk/provider-utils` `createJsonResponseHandler` /
`safeParseJSON`); this router replies `Content-Type: text/event-stream`
with a single well-formed, schema-conforming Anthropic Messages JSON
object followed by 14 trailing bytes — the literal SSE terminator
`data: [DONE]\n\n` — even for a request that never set `stream: true`.
`doStream()`'s SSE parser expects and discards that terminator normally;
`doGenerate()`'s single-shot JSON parser rejects the whole response over
it. Not a router bug this codebase can fix, and not an SDK bug — it is a
call-path mismatch: `merge-resolver.ts` was the only AI runner using
`generateText()` against a router that always frames responses as SSE.
Fix: switch to `streamText()` + `fullStream` text-delta accumulation, the
call pattern every other runner already uses successfully against this
router. Additive to the vendored contract: `MergeResolverConfig` and
`MergeResolverResult` are unchanged; only the internal SDK call primitive
differs. Verified against the live router with the real merge-conflict
prompt shape before and after: pre-fix reproduced the exact reported
error; post-fix returned the correct resolved text with 0 errors.

| File | Change |
|---|---|
| `main/ai/runners/merge-resolver.ts` | `resolveMergeConflict()` calls `streamText()` instead of `generateText()`, accumulates `text-delta` parts from `result.fullStream`, and surfaces any `error` part as the returned failure — same `MergeResolverConfig`/`MergeResolverResult` shapes, same system/user prompt construction, no tools, no output schema. |

## token-accounting-fix (2026-09-17)

Two independent token/context-accounting correctness bugs, found in the same
live-observability investigation (CTX climbing past 1000% in the swarm/tokens
view) and fixed together this session.

**Prompt-token mis-accumulation** (`stream-handler.ts`): `cumulativeUsage.promptTokens`
(and `cacheReadTokens`/`cacheCreationTokens`) was accumulated with `+=` on
every `step-finish` event. `promptTokens` at each finish-step already
represents the whole conversation-so-far sent to the model on that turn
(standard chat-completion usage semantics), not a per-step delta —
accumulating it produced roughly O(N²) inflation over a multi-step agentic
session. `completionTokens` (and `totalTokens`, which sums the two) genuinely
IS a per-step delta and correctly stays accumulated. Verified against a live
run: the swarm view showed CTX 1088.2% (Σ tokens 2206.6k) on a session whose
real prompt size, per each `step-finish`'s own per-step usage, never exceeded
5-figure token counts. The session-level context-window abort guard
(`session/runner.ts:401-403, 499-506`) was unaffected because it reads
`event.usage.promptTokens` from the per-step `step-finish` event directly,
not from `state.cumulativeUsage` — this was a display-accuracy bug, not a
safety-mechanism failure. Fix: track `promptTokens` (and the two cache
fields) as the latest value (`=`) instead of accumulating (`+=`).

**Context-window denominator bug** (`models.ts`): `getModelContextWindow()`
did not strip a router-style `provider/` id prefix (e.g. `glm/glm-5`, as
seen via `ANTHROPIC_DEFAULT_*_MODEL`/`APERANT_MODEL` when
`ANTHROPIC_BASE_URL` points at a local router) before its catalog lookup —
every such id silently fell through to the conservative 200,000 fallback
instead of the model's real window, disabling the 70%/90% compaction-warning
and hard-abort guards for any model with a smaller real window. Verified
against a live run: `glm/glm-5` (real window 128,000) reached 318,158 prompt
tokens — 159.1% of the 200k fallback — before any compaction warning or hard
abort fired. Fix: `getModelContextWindow()` now strips everything up to and
including the first `/` and retries the direct catalog lookup against the
unprefixed id, guarded by `slashIdx !== -1` so bare shorthands and full
Claude ids (no slash) are unaffected; the 200,000 fallback is preserved for
genuinely unmatched ids. This is functionally distinct from the
`moonshot-provider` entry's changes to this same file (that entry adds new
`DEFAULT_MODEL_EQUIVALENCES` provider rows; this fix changes the lookup
function's matching strategy) — recorded here rather than as a second row
under `moonshot-provider` to avoid conflating two unrelated changes to one
file.

| File | Change |
|---|---|
| `main/ai/session/stream-handler.ts` | `handleFinishStep()`: `cumulativeUsage.promptTokens`/`cacheReadTokens`/`cacheCreationTokens` changed from `+=` to `=` (latest-value tracking, not accumulation); `totalTokens` now derived as `promptTokens + completionTokens` after the reassignment. `completionTokens` accumulation (`+=`) is unchanged — it is correctly a per-step delta. |
| `shared/constants/models.ts` | `getModelContextWindow()`: new router-prefix-strip branch between the direct-shorthand lookup and the `DEFAULT_MODEL_EQUIVALENCES` search — retries the catalog lookup against the substring after the first `/` when the input id contains one. |

## agentic-orchestration-optin (2026-09-17)

P3.5.11 scoping (`evidence/phase-7/p3511-scope/P3.5.11-SCOPE.md`) found the
agentic `SpawnSubagent` tool-call loop fully implemented (tool declaration,
registration, `SubagentExecutorImpl.spawn()` handler, wiring into
`runAgenticSpecOrchestrator()`) but unreachable: `useAgenticOrchestration`
(`ai/agent/types.ts:79`) had zero call sites setting it to `true`, and
`GraphView` (`apps/tui/src/views/AgentsView.tsx`) had no mechanism to
construct a child `AgentSnapshot` for a spawned subagent — `parentId` was
set to `null` exactly once in `ensureAgent()` and never written again
anywhere in the repo. Two coordinated changes close both gaps, live-driven
and screenshotted end-to-end
(`evidence/phase-7/p3511-live/P3.5.11-LIVE.md`): (1) thread the existing
flag through `SpecCreationMetadata` and `startSpecCreation()`'s
`sessionConfig` literal with a strict `=== true` check (every existing
caller omits the field, so this is a provable no-op for all current
behavior — verified by inspection of every real `startSpecCreation()` call
site); (2) post a structured `task-event` (not just a free-text log line)
from `SubagentExecutorImpl`'s `onSubagentEvent` callback, carrying a stable
per-spawn `subagentId` and the parent's `taskId`, so the TUI's
`onTaskEvent()` can construct a distinct child snapshot with the correct
`parentId`/`depth`/`type`. Both changes are additive and opt-in: the
`spec_orchestrator`-only fork (`worker.ts:432-438`) already existed
unmodified — `build_orchestrator` sessions never consult this flag at all,
so the blast radius is strictly the spec-creation phase of tasks that
explicitly opt in. Recursion is bounded by the pre-existing, unmodified
`SUBAGENT_MAX_STEPS = 100` cap (`orchestration/subagent-executor.ts:32`)
and the tool-set filter that excludes `SpawnSubagent` from every spawned
subagent's own tool list (`orchestration/subagent-executor.ts:149`,
comment: "No recursion") — neither guard was touched by this patch.
Also added: `apps/tui/src/services/agent-start-service.ts` — the board's
`s`-key `startTask()` (first-party file) never threaded any spec-creation
metadata through at all; added an env-gated
`useAgenticOrchestration: process.env.APERANT_AGENTIC_SPEC_ORCHESTRATION === '1'`
field to the previously-hardcoded `startSpecCreation()` call and the
matching type on `AgentManagerLike['startSpecCreation']`'s `metadata`
param — this is the narrowest reachability path used for the P3.5.11
live-drive proof and defaults to `undefined` (unset env var) for every
normal run.

| File | Change |
|---|---|
| `main/agent/types.ts` | `SpecCreationMetadata` += `useAgenticOrchestration?: boolean` (optional, absent on every existing caller) |
| `main/agent/agent-manager.ts` | `startSpecCreation()`'s `sessionConfig` literal += `useAgenticOrchestration: metadata?.useAgenticOrchestration === true` (strict equality; `undefined` metadata field → `false`, today's exact behavior) |
| `main/ai/orchestration/subagent-executor.ts` | `SubagentExecutorConfig.onSubagentEvent` signature += third `subagentId: string` param (existing 2-arg callback shapes remain compatible — nothing reads a 3rd param); `spawn()` computes one `subagentId` per call (`${agentType}-${startTime}-${random}`) and passes it to all three `onSubagentEvent` call sites (spawning/completed/failed) |
| `main/ai/agent/worker.ts` | `runAgenticSpecOrchestrator()`'s `onSubagentEvent` callback now also `postMessage`s a `task-event` (`type: 'SUBAGENT_' + event.toUpperCase()`, `data: { subagentId, agentType, parentId: config.taskId }`) alongside the pre-existing `postLog` call, which is unchanged |
| `apps/tui/src/services/agent-start-service.ts` (first-party, no marker) | `AgentManagerLike['startSpecCreation']`'s `metadata` param type += `useAgenticOrchestration?: boolean`; `startTask()`'s `am.startSpecCreation(...)` call += `useAgenticOrchestration: process.env.APERANT_AGENTIC_SPEC_ORCHESTRATION === '1'` alongside the pre-existing `requireReviewBeforeCoding: false` |

## subagent-executor-stream (2026-09-18)

Live-drove `agentic-orchestration-optin` end-to-end
(`evidence/phase-7/subagent-proof/SUBAGENT-PROOF.md`) to prove subagent
*execution*, not just graph topology. Every `SpawnSubagent` call failed
identically with `APICallError: Invalid JSON response` (4/4 attempts, both
`complexity_assessor` and `spec_gatherer`) — the exact same defect class
already diagnosed and fixed once in this codebase under `merge-resolver-stream`
(F-16, above): the operator's Anthropic-compatible router always frames HTTP
responses as SSE (`Content-Type: text/event-stream`), terminating an
otherwise well-formed, schema-conforming JSON body with the literal 14-byte
SSE terminator `data: [DONE]\n\n`, even for requests that never set
`stream: true`. `generateText()`'s non-streaming `doGenerate()` path
(`@ai-sdk/provider-utils/src/response-handler.ts:createJsonResponseHandler`
→ `safeParseJSON`) requires the ENTIRE HTTP body to parse as one JSON
document and rejects the whole response over those trailing bytes.
`doStream()`'s SSE event parser expects and discards that terminator
normally. `subagent-executor.ts` was the one remaining AI runner in this
codebase still using `generateText()` against this router — `orchestration/
subagent-executor.ts:181` (pre-fix) — every other runner (roadmap, insights,
ideation, and now `merge-resolver.ts`) already streams. Fix: migrate
`SubagentExecutorImpl.spawn()` to `streamText()` + `fullStream` `text-delta`
accumulation, mirroring `merge-resolver-stream`'s proven pattern, with two
additions that pattern didn't need: (1) **structured output preserved
exactly** — this exact pinned AI SDK build (`ai@^7.0.62`, confirmed by
reading `node_modules/ai/dist/index.d.ts`) exposes
`StreamTextResult.output: PromiseLike<InferCompleteOutput<OUTPUT>>` and
`StreamTextResult.steps: PromiseLike<Array<StepResult>>` with the identical
`output: Output.object({ schema })` config `generateText()` took; subagents
with `expectStructuredOutput` (currently only `complexity_assessor`) still
receive a schema-parsed `structuredOutput` object, not raw text — no
contract degradation. (2) **event-ordering correctness** — `onSubagentEvent`'s
`'completed'` now fires only after `fullStream` has genuinely drained with
no `error` part AND (when structured output was requested) `.output` has
resolved without throwing; a transport-level `error` part or a schema-parse
failure both route to `'failed'` instead, reported with a distinguishing
error-message prefix (`Structured output parse failed: ...`) so the two
failure classes remain distinguishable in the graph. Getting this ordering
wrong is precisely the failure mode `agentic-orchestration-optin`'s
`SUBAGENT_*` event wiring exists to make observable — a `'completed'` fired
before the stream actually finished would make the graph lie about
terminal state. `SubagentExecutor`, `SubagentSpawnParams`, `SubagentResult`
(all from `spawn-subagent.ts`) and `SubagentExecutorConfig` are unchanged;
purely internal to `spawn()`'s SDK call primitive and result extraction.
`SUBAGENT_MAX_STEPS = 100` and the `SpawnSubagent`-exclusion tool-set
filter (both pre-existing, cited in `agentic-orchestration-optin` above)
were not touched.

| File | Change |
|---|---|
| `main/ai/orchestration/subagent-executor.ts` | `SubagentExecutorImpl.spawn()`: `streamText()` instead of `generateText()`, branched into two statically-typed call shapes (with/without `output: Output.object(...)`) rather than a loosely-typed conditional-spread options object; consumes `result.fullStream` accumulating `text-delta` parts and catching any `error` part before it can surface as a rejected `.output`/`.steps` promise; awaits `result.output` (when structured output was requested) and `result.steps` only after the stream has fully drained with no transport error; `onSubagentEvent(..., 'completed', ...)` moved to fire only after both the stream-error check and the structured-output-parse check pass. Same `SubagentExecutorConfig`, `SubagentSpawnParams`, `SubagentResult` shapes throughout. |

## Upgrade note: AI SDK v7 (2026-08-12)

The workspace runs `ai@^7`, `@ai-sdk/anthropic@^4`, `@ai-sdk/openai-compatible@^3`,
`@anthropic-ai/sdk@^0.116`, `@openrouter/ai-sdk-provider@^3` (full set in
root `package.json`, anchored there so vendored sources resolve the hoisted
copy). Vendored call sites required zero changes for v7 — the used surface
(`streamText`, `generateText`, `tool`, `stepCountIs`, `Output`,
`createProviderRegistry`, `embed`, `embedMany`, `LanguageModel`, `ProviderV3`)
is stable across the major.
