# Phase 2 SUMMARY — Board & Task Lifecycle

## What was built

- `task-lifecycle-service`: H/L moves write the real
  `implementation_plan.json` through the vendored `persistPlanStatusSync`
  (the same function the desktop's IPC handlers call) — no TUI-side shadow.
- `agent-start-service`: `s` runs the vendored `AgentManager.
  startTaskExecution` in-process; the AGENT STREAM panel shows the pipeline's
  real outcome. Provider SDK set mirrored from upstream's package.json so the
  vendored import closure (157 files) really resolves.
- Toolchain aligned to upstream (TS 5.9, @types/node 25, DOM lib) — vendored
  sources now typecheck unmodified alongside TUI sources.

## Defect found by the gate and fixed

**D4 (real product bug): stale keybinding closures.** `useKeymap` memoized
bindings by key names only, freezing first-render closures. Handlers using
functional setState (`j`/`k`) worked; handlers closing over state acted on
boot-time state — the gate caught `L` moving task 001 while the cursor sat on
002. Fixed by dispatching through a `useRef` that always holds the latest
bindings. Re-verified: supplementary probe moved the correct task both ways
(step-10/11 in the run dir).

**Harness note:** the `(persisted)` stream line is truncated at 110 cols; wait
strings must target visible text (`queue → in_progress`). Two monolithic-run
waits failed on this — disk reads provided the authoritative proof.

**Cosmetic:** vendored `console.log` (e.g. ClaudeProfileManager init) escapes
above the Ink frame. Logged for Phase 7 (redirect vendored stdout to the log
service).

## Verdict

- Move + persistence + restart survival: **PASS**
- `s` real pipeline outcome: **PASS** (real auth error surfaced)
- Agent actually runs + streams phases: **UNVERIFIED — no credentials**
- Phase 1 regression: **PASS** (all 8 waits green on session B)

See phase-2-VALIDATION.md for the per-criterion table.
