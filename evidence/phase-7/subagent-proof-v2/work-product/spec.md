# Subagent Proof v2

Produce a real, validator-clean evidence run demonstrating subagent fan-out in proofpunk-agent beyond the v1 depth-1/single-child proof: live-rendered spawn with attribution, lifecycle COMPLETE (ERRORED if cheaply drivable), fan-out (depth >= 2 or >= 2 concurrent children), sealed by `fresh_evidence.py` rc=0.

## Rationale

V1 lifecycle runs are empty (three 0-byte-inventory runs on 2026-09-17); the only real proof is C5's depth-1 single-child capture. Fan-out, COMPLETE/ERRORED lifecycle, and a live events chain with attribution are unproven at current HEAD (007-runaway-loop-detector landed after C5).

## User Stories

- As a maintainer, I want a sealed evidence run proving subagents render live in the Agent Tree with correct attribution
- As a maintainer, I want the tree to show fan-out beyond depth-1 (nested grandchild or concurrent children)
- As a maintainer, I want node lifecycle COMPLETE (and ERRORED) observed in a live session, cross-checked against the events chain

## Scope

- Live SDK session driven via pty.fork() probe (`python3 -m proofpunk_agent --max-budget 10 PROMPT`), PROOFPUNK_AGENT_SHOT_DIR/SHOT_NAME SVG export, events export
- Evidence run `e2e-evidence/run-YYYYMMDDTHHMMSS-subagent-proof-v2/` per repo conventions, sealed via fresh_evidence.py validate rc=0
- Minimal source fix only if a silent-failure gap is found (see FR7 trigger definition below)

## Non-goals

- Not re-opening release-gate rows R1-R5 or any RELEASE.md rows
- No performance claims beyond budget-guard output
- Not renaming/re-validating v1 empty runs or the C5 depth-1 run
- No UI changes beyond a minimal defect fix

## Evidence Plan

- Run slug `subagent-proof-v2` (distinct from v1 empty runs; no deletions, §16.4(a)). Before `init-run`, verify the timestamped run dir does not already exist (ER3 collision check).
- Steps (numbering owned by `fresh_evidence.py next-step`; expect step-01..step-08 per implementation plan):
  1. step-NN-head-source-facts: spawn gate (`sdk.py:288` `_SPAWN_TOOL_NAMES`), `_agent_spawned_event` (761-779), `_agent_finished_event` (781-791), tree reducers (spawn/finish/figures) read at current HEAD; note any drift vs C5
  2. step-NN-probe-source: the probe script (pty.fork + argv prompt + Depth/Active regex + permission auto-approve 'a' + SHOT_DIR export)
  3. step-NN-live-spawn-frame: live frame with spawn rendered (Depth/Active), node label from subagent_type
  4. step-NN-lifecycle-frame: post-AGENT_FINISHED frame showing COMPLETE glyph (and ERRORED node if driven)
  5. step-NN-events-export: events chain AGENT_SPAWNED(subject, parent, tier) → AGENT_FINISHED(subject, error)
  6. step-NN-fanout-live-frame: live frame showing Depth >= 2 or Active >= 3 (FR4)
  7. step-NN-fanout-events-export: event chain proving nesting (grandchild .parent == child .subject) or >= 2 children under one parent
  8. step-NN-errored-frame (conditional): ERRORED node + AGENT_FINISHED error=true
  9. evidence-inventory.txt listing all steps; all artifacts >1024 bytes with real context (argv, rc, stdout tail), never padding

### Events capture method (required reading)

The app does not persist its event log (C5 step-02 caveat): a tree frame and an attribution record cannot come from the same session unless the probe captures both live or adds an export step. The implementer must, before Phase 3:
- Verify at HEAD whether an in-app export exists that emits AGENT_SPAWNED/AGENT_FINISHED events (e.g. Screen 4 tools export — note the C5-era tools-export jsonl line shape carries `tier`/`agent_id`/`subject 'toolu_*'` but had zero Agent/Task calls, and it is a tools export, not a lifecycle-events export); and
- If no lifecycle-events export exists, add one to the probe: tee the live SDK message stream (or instrument via the existing state/events.py projection) to a jsonl file written directly into the step artifact, redacted per capture.py conventions.
This decision and its source evidence belong in the step-NN-head-source-facts artifact. The AGENT_SPAWNED/AGENT_FINISHED rows must come from the same session as the captured frames (ER6 cross-check).

### Prompts (verbatim; do not paraphrase)

- Single child (proven, C5 step-04 lines 37-41, 13.32s Depth 1/Active 2):
  "Use the Task tool to spawn exactly one subagent with subagent_type general-purpose. Tell that subagent to reply with the single word DEEPEST. Then report what it replied."
- Grandchild depth-2 (unproven; ~2 attempts then fall back per OQ2):
  "Spawn a subagent (subagent_type general-purpose). Tell it to itself spawn one sub-subagent (subagent_type general-purpose) whose reply is the word DEEPEST, return it to you, and you report it to me."
- Two concurrent children (unproven; OQ2 fallback):
  "Spawn TWO subagents at the same time (both in one message, do not wait for the first to finish), subagent_type general-purpose; each replies with a distinct word; then report both."
- ERRORED (conditional, OQ1):
  "Spawn a subagent and tell it to run the Bash command 'exit 7' (guaranteed to fail) and report only its failure."

## Acceptance Criteria

Functional:
- [ ] FR1: Live subagent spawn appears in §7 Screen 1 Agent Tree panel during the live SDK session (live frame captured), not only in replay
- [ ] FR2: Child node attribution resolves to parent_agent_id or parent_tool_use_id (tier-3 PARENT_TOOL_USE_ID counts as correct on SDK 0.2.144; tiers 1/2 absent); any UNATTRIBUTED fallback occurrence is explained in the run narrative with its mechanism, not assumed away
- [ ] FR3: Node enters RUNNING on spawn and reaches COMPLETE; if cheaply drivable, also capture ERRORED
- [ ] FR4: Fan-out beyond v1: Depth >= 2 nesting OR Active >= 3 (concurrent children) in the live frame
- [ ] FR5: Tree figures render from measured state only; unavailable values render '--'
- [ ] FR6: Glyph/state rendering consistent with NodeState per tree.py reducers
- [ ] FR7: If a new silent-failure gap is found, fix minimally in source and re-earn evidence with a fresh run

  FR7 trigger definition (decisive, no judgment call): a silent-failure gap exists iff the events export shows an AGENT_SPAWNED whose child node landed UNATTRIBUTED in the tree (tree.py:240-245 path) for a child whose parent tool_use_id IS present in the session's message chain. In that case: explain in narrative AND apply the minimal fix + re-earn (Phase 5). An UNATTRIBUTED row whose parent tool_use_id is genuinely absent from the SDK stream is an SDK-side limitation — explain in narrative, ship, and note in recommendations; no source fix.

Evidence:
- [ ] ER1: Artifacts under `e2e-evidence/run-<ts>-subagent-proof-v2/` follow step-NN-slug + evidence-inventory.txt conventions
- [ ] ER2: Each step captures its specific artifact: live frame, rendered replay/post-transition frame, probe source, events chain (jsonl or documented export form) with parent_tool_use_id/parent_agent_id from the same session as the frames
- [ ] ER3: Distinct slug; collision pre-checked before init-run (dir must not pre-exist; no overlap with the three v1 empty runs)
- [ ] ER4: `fresh_evidence.py --run <dir>` validate rc=0
- [ ] ER5: Inventory lists every step file; no 0-byte artifacts
- [ ] ER6: Depth/Active figures and attribution labels in frames match the events chain; cross-checked, not asserted

Process:
- [ ] PR1: Live-session-first; replay frames supplement only
- [ ] PR2: Probes use `--max-budget 10` (C5 pattern); any perf/driver.py use gets explicit raised --max-budget (default $3.00 refuses); flag documented in artifacts. (Deliberate refinement of the requirements' generic budget rule.)
- [ ] PR3: Minimal-fix rule on any defect
- [ ] PR4: v1 empty runs untouched
- [ ] PR5: Spawn-gate and reducer behavior re-verified at HEAD before proof runs (source facts step)

## Open Questions (fallbacks pre-baked)

- OQ1 ERRORED drivability: attempt fail-on-purpose subagent (Bash `exit 7` → is_error → ERRORED). If not cheaply drivable, note it and ship COMPLETE-only evidence (FR3 permits).
- OQ2 Depth-2 reliability: try grandchild prompt first (~2 attempts); if flaky, fall back to >= 2 concurrent children as the fan-out proof (both satisfy FR4).
- OQ3 AGENT_SPAWNED label resolution: if subagent_type/description yields empty label, attribution still holds; capture label rendering as-is.
- OQ4 Events export path: no confirmed in-app exporter for AGENT_SPAWNED/AGENT_FINISHED lifecycle events at current HEAD (see "Events capture method"). Resolve during the source-facts step; probe-side tee/instrumentation is the expected fallback.
