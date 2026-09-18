# Spec 999 — Subagent Proof Live Drive

**Status:** ready for implementation
**Category:** feature (roadmap-sourced verification drive)
**Complexity:** complex (self-assessed; complexity_assessor subagent unavailable — see `complexity_assessment.json`)

---

## 1. Problem

proofpunk-agent's agent tree has never been proven against a live subagent
spawn. The bridge derives `AGENT_SPAWNED`/`AGENT_FINISHED` from a
`ToolUseBlock`/`ToolResultBlock` pair named by
`_SPAWN_TOOL_NAMES = frozenset({"Agent", "Task"})`
(`proofpunk_agent/bridge/sdk.py:274-288`). The gate historically read only
`"Task"` while live traces on 2026-09-17 emitted `"Agent"` — six occurrences,
zero `"Task"` — so **no subagent was ever drawn and obligation C5 (live-proven
nested tree) could not be met no matter how long a driver polled**. The gate
was widened on 2026-09-17, but every tree proof since P5
(`e2e-evidence/run-20260909T000144-p5-screen1/step-14-single-tree-drive-fixed.py`)
has been **offline**: synthetic events folded through the reducer inside
Textual's headless test harness. The claim "the tree renders subagents a real
session actually spawns" is still unproven.

## 2. Goal

One budgeted live Claude Agent SDK session, driven as an end user in one real
PTY, whose prompt induces the model to spawn at least one subagent, proving
the whole chain end-to-end:

```
SDK stream (ToolUseBlock "Agent"/"Task")
  -> bridge AGENT_SPAWNED (subject = tool_use_id, tier 3 linkage)
  -> reduce_tree attach under orchestrator
  -> Session Screen 1 rail: glyph row at depth >= 1, "Depth: N >= 1"
```

Every assertion reads a captured frame or a disk artifact. Nothing reads an
SDK object directly, nothing is estimated, and unattributed fallbacks are
reported, never hidden.

## 3. Requirements

See `requirements.json` for the full FR/NFR table. Summary:

| ID | Requirement | Verdict arm |
| --- | --- | --- |
| FR-01 | Single live session, real PTY >= 100x28, `--max-budget` ceiling | scaffold |
| FR-02 | Spawn-inducing PROMPT, archived verbatim; nesting as stretch ask | scaffold |
| FR-03 | Frame shows non-root glyph row at depth >= 1 + `Depth: N >= 1` | **Arm A (PASS-critical)** |
| FR-04 | Screen 2 ledger frame shows an observed `Agent`/`Task` tool row | Arm A corroboration |
| FR-05 | Optional PYTHONPATH observation shim exports EventLog to JSON at shutdown; offline `reduce_tree` fold must match the live frame's depth/count | corroboration |
| FR-06 | Depth >= 2 glyph row observed | **Arm B (stretch, NOT-OBSERVED fallback)** |
| FR-07 | Attribution tier distribution + `(unattributed)` rows recorded verbatim | **Arm C (record-only)** |
| FR-08 | Permission-modal watch loop (`PERMISSION REQUEST` title), keys logged | robustness |
| FR-09 | Evidence archive under `e2e-evidence/run-<ts>-999-subagent-proof-live-drive/`, step-NN convention, verdict markdown | scaffold |
| FR-10 | Explicit ABANDONED / BLOCKED / defect-finding criteria | robustness |

## 4. Design

### 4.1 Run directory layout

```
e2e-evidence/run-<YYYYMMDDTHHMMSSZ>-999-subagent-proof-live-drive/
  step-01-preflight.py / .log      # --check plugin root, PTY size, budget echo,
                                   # shim dump dry-run against quit path (Q5)
  step-02-live-tree-drive.py / .log # the drive itself (FR-01..FR-04, FR-06..08)
  step-03-log-fold-corroboration.py / .log  # if FR-05 dump exists
  step-04-verdict.md               # per-arm PASS/FAIL/NOT-OBSERVED/ABANDONED
  frames/                          # text scrapes per observation point
  step-NN-*.svg / .png             # F12 captures (renamed between shots)
  events-dump.json                 # FR-05 artifact, when used
  PROMPT.txt                       # verbatim prompt (FR-02)
```

### 4.2 The drive (step-02)

Reuse the established live-drive machinery, not new abstractions:

- **PTY + argv**: `validation/e2e/scenario_session.py` `PtySession` (or
  `pty_backend.py` contract) at **120x34**; argv built `perf/driver._app_argv`
  style — `python3 -m proofpunk_agent "<PROMPT>" --max-budget 15` plus
  `--evidence-slug` if the run wants a plugin evidence run pinned.
- **Boot marker**: wait for `PROOFPUNK AGENT` before any key (precedent:
  `screen23_live.py` `BOOT_MARKER`).
- **Prompt shape** (FR-02): explicit delegation instruction, e.g.

  > Use the Agent tool (also called Task on some hosts) to delegate two small
  > independent lookups to subagents. Ask the first subagent to itself
  > delegate one smaller lookup to its own subagent. Do not use Bash. When all
  > delegated work has returned, stop and summarise what each subagent found
  > in one sentence each.

  The prompt names both known spawn-tool names so the model is not blocked on
  vocabulary; the driver still **records** which name actually appeared (Q2).
  Bash is disallowed for the same reason `screen23_live.py` disallowed it:
  compound shell answers collapse distinct-tool behavior.
- **Poll loop**: scrape frames; on each, extract the AGENT TREE pane text and
  log `(timestamp, Depth line, Active line, glyph-row count)` transitions. A
  transition log IS the evidence of live rendering, not just the final frame.
  Assert the scraped pane carries exactly one `AGENT TREE` header
  (precedent: step-14's single-header assertion). **Turn-end detection**: the
  HUD footer marker (`i interrupt`) disappears when the turn completes — the
  final capture waits on that, not a fixed sleep.
- **Modal watch** (FR-08): poll for the literal `PERMISSION REQUEST` title;
  answer `a` (allow) for spawn calls — the drive wants the spawn to proceed;
  log every appearance/response/glyph transition.
- **Captures**: F12 SVG at (a) first observed depth >= 1, (b) turn end;
  rename the first artifact out of the way before the second capture (the app
  refuses to overwrite — `app.py` `PROOFPUNK_AGENT_SHOT_NAME` handling).
  Convert to PNG with `rsvg-convert` when available.
- **Shutdown**: quit via the app's quit path; the shim (4.3) dumps the log.

### 4.3 Observation shim (FR-05, optional arm)

A `sitecustomize.py` on the driven process's `PYTHONPATH` — the exact pattern
`screen23_live.py` uses to pin `max_turns`, with the same constraints:

- **Instrument, not a mock**: it may not alter `ClaudeAgentOptions`, event
  payloads, or reducer inputs. Mechanism: hook `EventLog.__init__`
  (`proofpunk_agent/state/events.py:100`) at interpreter startup so the live
  instance registers itself, then serialize `list(instance)` to
  `events-dump.json` via `atexit`. The shim never touches the app object,
  the bridge, or any reducer.
- The dump enables `step-03`: fold it through `reduce_tree` offline and assert
  `max_depth` and node count match what the live frames showed. If the shim
  cannot hook the exit path cleanly in preflight (Q5), FR-05 is skipped and
  the verdict notes frames-only evidence — the drive still stands.

### 4.4 Verdict semantics (step-04)

| Verdict | Meaning |
| --- | --- |
| Arm A PASS | FR-03 + FR-04 both observed in captured artifacts |
| Arm B PASS / NOT-OBSERVED | depth >= 2 row seen, or recorded absence with full transition log |
| Arm C REPORTED | tier distribution + `(unattributed)` counts, verbatim |
| ABANDONED | budget hit, zero spawns; raw tool-name distribution attached |
| BLOCKED | preflight failure (CLI unreachable, plugin root rejected) |

Defects found mid-run (wrong glyph, missing pane, renderer crash) become
`step-NN-<slug>-finding.md` first; any fix is a later step-NN with its own
re-drive evidence, never an in-place edit of an already-run step (FR-10).

## 5. Acceptance (the spec is done when)

1. `spec.md` + `implementation_plan.json` + `requirements.json` +
   `complexity_assessment.json` exist and validate (see §7).
2. Implementation phase produces the run directory with at minimum
   `step-01`, `step-02`, and `step-04` executed, and either Arm A PASS or an
   ABANDONED/BLOCKED verdict with the required raw distributions.
3. No citable artifact contains pytest, mocks, stubs, or fakes; no product
   file is modified unless a documented finding justifies it.

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Model refuses to spawn subagents | Explicit prompt naming the tool; single in-session re-prompt allowed; ABANDONED path is a valid outcome (FR-10) |
| Host emits an unrecognized third spawn-tool name | Recorded distribution makes the gap visible; widening `_SPAWN_TOOL_NAMES` would be a finding + follow-up, not a silent fix |
| Modal storm during spawns | FR-08 watch loop; answer allow for spawn calls; deny-log everything else |
| Shim interferes with app exit | Preflight dry-run (step-01, Q5); shim is skippable |
| Budget overrun | `--max-budget 15` on argv; driver wall-clock watchdog as second fence |

## 7. Validation checklist (spec-level)

- [x] `spec.md` non-empty, references real files/lines
- [x] `implementation_plan.json` parses as JSON with `phases[].subtasks[]`
- [x] `requirements.json` present with FR/NFR ids
- [x] `complexity_assessment.json` present
- [x] Every assertion source is a frame or disk artifact (honesty doctrine)
