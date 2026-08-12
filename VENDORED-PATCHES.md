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
| `main/ai/config/types.ts` | `MODEL_PROVIDER_MAP` += `kimi-`, `kimi/`, `moonshot-`, `moonshot/` |
| `shared/constants/models.ts` | moonshot entries in `DEFAULT_MODEL_EQUIVALENCES` (opus/sonnet tiers) + native `kimi-k2` / `kimi-k2-turbo` shorthands |

## worker-path (2026-08-12)

| File | Change |
|---|---|
| `main/ai/agent/worker-bridge.ts` | `resolveWorkerPath()` honors `APERANT_WORKER_PATH` when set — the TUI bundles the worker with esbuild (`tools/build-worker.mjs` → `apps/tui/dist/agent-worker.cjs`) because the electron-vite output tree the default path expects does not exist outside Electron. |

## observability-tap (2026-08-12)

Spec: `aperant-agent-observability-spec.md` §7.1–7.2 ("needs no new
instrumentation… except queued-subtask visibility").

| File | Change |
|---|---|
| `main/ai/agent/worker-bridge.ts` | re-emits the raw `StreamEvent` as `stream-event` alongside the existing tracker feed (tool-call/tool-result/step-finish/usage-update visibility) |
| `main/agent/types.ts` | `AgentManagerEvents` += `'stream-event'` (payload `unknown`; subscribers narrow to `StreamEvent`) |
| `main/ai/orchestration/parallel-executor.ts` | `ParallelExecutorConfig.onSubtaskQueued` (optional) — fired for subtasks in batches beyond the first, before execution begins; behavioral proof in `apps/tui/src/services/__tests__/parallel-executor-queued.test.ts` |

## Upgrade note: AI SDK v7 (2026-08-12)

The workspace runs `ai@^7`, `@ai-sdk/anthropic@^4`, `@ai-sdk/openai-compatible@^3`,
`@anthropic-ai/sdk@^0.116`, `@openrouter/ai-sdk-provider@^3` (full set in
root `package.json`, anchored there so vendored sources resolve the hoisted
copy). Vendored call sites required zero changes for v7 — the used surface
(`streamText`, `generateText`, `tool`, `stepCountIs`, `Output`,
`createProviderRegistry`, `embed`, `embedMany`, `LanguageModel`, `ProviderV3`)
is stable across the major.
