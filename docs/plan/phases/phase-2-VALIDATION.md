# Phase 2 VALIDATION — per-criterion verdicts

Run: `evidence/phase-2/e2e-evidence/run-20260812T011904-phase2-gate/`
Sessions A 01K…(phase2-gate-a) / B (phase2-gate-b) · 110x32 · asciicast
step-04-record.cast + step-08-record.cast · screenshots step-02/03/07 PNG

Gate criteria (spec Part 6, Phase 2):

| # | Criterion | Evidence | VERDICT |
|---|---|---|---|
| 1 | Board lists real tasks from a live project | step-01-snap-board: 4 real tasks in 4 columns, real titles/priority/subtasks | **PASS** |
| 2 | Status change persists to disk | step-02-disk-status.txt: `queued` → `in_progress` after `L`; step-06: `in_progress` → `queue` after `H` (direct reads of implementation_plan.json) | **PASS** |
| 3 | Change survives restart | session A quit (step-04); session B launch: step-05-wait-building matched `BUILDING (2)` — state re-read from disk | **PASS** |
| 4 | Move acts on the selected task | supplementary step-10/11 waits matched `queue → in_progress` / `in_progress → queue` for 002 (after D4 stale-closure fix) | **PASS** |
| 5 | `s` starts the real agent pipeline | step-03-wait-auth matched `Authentication required…` — the vendored AgentManager's real pre-flight event, rendered in AGENT STREAM (step-03-shot-stream.png) | **PASS** (real outcome) |
| 6 | Agent stream shows real spec/plan/code output; progress advances | requires provider credentials; none in this environment | **UNVERIFIED — no credentials** (not simulated) |
| 7 | Regression: Phase 1 gates re-run | step-07: term `live PTY`, road `Foundation`, insights `entries`, tree snapshot (⑂ develop), settings `THEME`, palette placeholder, help `KEYBINDINGS` — all matched; screenshot step-07 | **PASS** |

Defects: D4 stale keybinding closures → fixed in `useKeymap` (useRef dispatch),
re-verified by this run's step-02/05/06 and supplementary step-10/11.

Blocking note for Phase 4/5 gates: same credential constraint applies.
