# Phase 3.5 PLAN — Agent Coordination & Observability

Spec: `aperant-agent-observability-spec.md` (uploaded 2026-08-12).
Inserted after terminal emulation per spec Part 8, executed early by
operator directive (`implement --auto --parallel`).

## Scope delivered

1. **Event tap** — `apps/tui/src/services/observability.ts`:
   subscribes to the real AgentManager event stream (`execution-progress`,
   `task-event`, `stream-event`, `log`, `error`, `exit`), polls spec-dir
   sentinel files (`RATE_LIMIT_PAUSE` / `AUTH_PAUSE` / `RESUME`), imports
   `AGENT_CONFIGS` from the vendored config for tool grants (byte-match —
   nothing retyped), 10k-event ring buffer, 16ms snapshot coalescing,
   wait-state recomputation only on tool-call/tool-result/step-finish.
2. **Six views** — `apps/tui/src/views/AgentsView.tsx` (tab `7`):
   SWARM / GRAPH / INSPECT / TRACE / TOKENS / WAITS, sub-view keys 1-6
   inside the tab, `j/k` select, `⏎` inspect, `f` trace filter,
   `r` writes a real RESUME sentinel.
3. **Upstream additions** (spec §7.2, additive-only):
   `onSubtaskQueued` in parallel-executor; raw `stream-event` relay through
   worker-bridge → agent-process → AgentManager. Marked
   `[APERANT-PATCH observability-tap]`, catalogued in VENDORED-PATCHES.md.

## Gate mapping (spec Part 8)

| Spec gate | How proven here |
|---|---|
| Swarm accuracy | live agent row with real type/phase during a real run (step-03) |
| Wait detection — tool | stream-event tool-call without matching tool-result → ⚙ TOOL row |
| Wait detection — concurrency | executor-level behavioral proof (vitest 3/3); live multi-coder swarm needs a ≥4-subtask task — reported honestly |
| Wait detection — ratelimit | real `RATE_LIMIT_PAUSE` sentinel written to the spec dir → ⏱ 429 row; `r` writes real RESUME (disk proof) |
| Wait detection — context | needs a session driven past 90% context — long-horizon; UNVERIFIED unless the gate run crosses it |
| Token accuracy | TOKENS ledger from real step-finish/usage-update events |
| Cache hit | computed from real usage fields when present |
| Tool grants | rendered from the imported AGENT_CONFIGS; planner byte-match dump (step-05e) |
| Trace completeness | flight-recorder event counts + stream-kind census (step-09) |
| Graph topology | subagent nodes appear when SpawnSubagent traffic exists; otherwise honest empty state |
| Phase provenance | ▪ structured (task-event) vs ~ inferred (tracker) rendered in INSPECT |
| Throughput | 16ms coalescing + ring buffer by construction; 1886-event live run ingested without UI stalls in Phase 2.5 |
