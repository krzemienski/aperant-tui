# Phase 2 PLAN — Board & Task Lifecycle

## Proof obligation

Board lists real tasks from a live project. `s` starts the real vendored agent
pipeline (real outcome surfaced). Task status changes persist to disk and
survive restart. Phase 1 gates re-run green.

## Work items

1. `services/task-lifecycle-service.ts` — H/L column moves via vendored
   `persistPlanStatusSync` (atomic disk write + cache invalidation).
2. `services/agent-start-service.ts` — lazy import of vendored
   `agent/agent-manager`; resolves with the pipeline's REAL first outcome
   event (`task-started` / `error` / rejection / honest 30s timeout).
3. BoardView wiring: H/L/s/x/l keys; AGENT STREAM renders real lifecycle
   events (moves, start outcomes) in place of the empty state.
4. Dependency alignment: mirror the upstream provider SDK set
   (`@ai-sdk/*`, `@anthropic-ai/sdk`, `ai`, `@libsql/client`,
   `@modelcontextprotocol/sdk`, `@tavily/core`, `@openrouter/ai-sdk-provider`)
   so the vendored closure really imports; zod ^4 and typescript ^5.9 /
   @types/node ^25 / DOM lib aligned to upstream's toolchain.
5. Gate run: move → disk proof → restart survival → real start outcome →
   Phase 1 regression.

## Credential constraint

No AI provider credentials exist in this environment. The gate criterion
"agent stream shows real spec/plan/code phase output and progress advances"
is therefore **UNVERIFIED — no credentials**; what IS proven is that `s`
executes the real vendored pipeline and surfaces its real outcome (the
pre-flight auth error), never a simulation.
