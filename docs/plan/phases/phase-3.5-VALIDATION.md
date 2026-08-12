# Phase 3.5 VALIDATION — per-criterion verdicts

Run: `evidence/phase-3.5/e2e-evidence/run-20260812T084209-phase35-gate/`
Session `phase35` · 110x32 · screenshots ×7 · console log ·
agent-events.jsonl (275 events) · real sentinel intervention.
Verdict: **GATE FAILS: 0** · SECRET-SCAN-OK.

| Spec Part 8 gate | Evidence | VERDICT |
|---|---|---|
| Swarm accuracy | step-03 waits matched `AGENT SWARM` + `planner` (phase→agent-type mapping); screenshot 62: live row `002-fix-terminal planner 0/1000` | **PASS** |
| Wait detection — tool | flight recorder: 4 tool-call / 4 tool-result pairs — wait derivation exercises the open-call path on every pair | **PASS** |
| Wait detection — concurrency | vitest 3/3: 6 subtasks @ concurrency 3 → exactly batch-1 positions announced; allSettled failure semantics preserved | **PASS (executor-level)**; live multi-coder swarm needs a ≥4-subtask task — not claimed |
| Wait detection — ratelimit | real `RATE_LIMIT_PAUSE` written into the spec dir → ⏱ 429 row with parsed `resetTimestamp` (screenshot); `r` wrote real `RESUME` (step-08d RESUME-ON-DISK-OK) | **PASS** |
| Wait detection — context | requires a session driven past 90% context — this run's planner peaked at ~21% (43,216 / 200,000) | **UNVERIFIED — threshold not reached** (mechanism implemented; not claimed proven) |
| Token accuracy | D11 fix verified: step-finish usage 14,035/147 → cumulative 43,216 tokens from the real endpoint (pre-fix runs recorded 0) | **PASS** |
| Cache hit | usage carries `cacheReadTokens: 0` from this endpoint — arithmetic runs, no cache traffic to measure | **UNVERIFIED — no cache traffic** |
| Tool grants | step-04e GRANTS-BYTEMATCH-OK: planner (`thinkingDefault: high`) and coder (`low`) dumped from the imported vendored AGENT_CONFIGS | **PASS** |
| Trace completeness | step-09 census: 132 stream-events (thinking-delta ×118, tool-call ×4, tool-result ×4, step-finish ×3, usage-update ×3) — every tool-call paired | **PASS** |
| Graph topology | phase pipeline + regression guard rendered (step-05 waits); subagent nodes require SpawnSubagent traffic — none in this run | **PASS (pipeline)** / subagent nodes **UNVERIFIED — no spawn traffic** |
| Phase provenance | step-04c wait matched `~ inferred` during planning (honest — no structured planning event exists); `▪ structured` path verified via task-event census (CODING_STARTED) | **PASS** |
| Throughput | 275-event live stream ingested with 16ms coalescing; no UI stalls observed across 7 screenshots | **PASS (observational)**; 100 events/sec synthetic burst not performed |

## Defects caught by this gate family

- **D10** — bridge-level `stream-event` re-emit never reached the manager
  emitter (forward added in agent-process.ts).
- **D11** — AI SDK v7 renamed usage fields (`inputTokens`/`outputTokens` +
  `inputTokenDetails.cache*`); the vendored stream-handler read v6 names and
  silently recorded 0 tokens. Dual-shape read; verified by this run's real
  token counts. **This is exactly the class of break the live gate exists to
  catch** — typecheck passed, the numbers were wrong.

## Environment notes

- Node 24 must be the agent-tty runtime (`Promise.withResolvers`, Node ≥22);
  installed to `~/.cache/node24` after `/tmp` and `~/node24` proved volatile.
- agent-tty daemon inherits the PATH of its first invocation — a stale
  daemon must be killed after runtime changes.
- Cold-cache TUI boots exceed 120s; boot waits run 300s.

## Supplementary run — real upstream failure path (2026-08-12 PM)

Run `run-20260812T172300-phase35-gate` executed while the endpoint was
unreachable (`EHOSTUNREACH 100.33.238.199:20128`). It is kept deliberately:
it proves the error path end-to-end — the worker retried 3 times, surfaced
`ai_apicallerror: cannot connect to api` as structured stream `error`
events in the flight recorder, and the TUI stayed alive and navigable.
The two wait-failures in that run (thinking/provenance) are the agent's
absence, not view defects. Happy-path proof remains run-20260812T084209
(0 fails) and the canonical set run-20260812T172051 (moonshot, 0 fails).
