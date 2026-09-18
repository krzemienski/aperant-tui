# Subagent Execution Proof v2 — post `subagent-executor-stream` fix

Follows `evidence/phase-7/subagent-proof/SUBAGENT-PROOF.md`, which fixed
F-19 and diagnosed (but did not fix) the root cause of every `SpawnSubagent`
call failing: `subagent-executor.ts:181` called `generateText()` against a
router that always frames HTTP responses as SSE, the exact same defect
class already fixed once in this codebase (F-16, `merge-resolver.ts`).

This document is the fix and its live re-drive.

**Verdict: PASS. Six real subagent completions, disk-backed, across six
distinct agent types — `complexity_assessor`, `spec_gatherer`,
`spec_researcher`, `spec_writer`, `spec_critic`, `spec_validation` — every
one reaching `SUBAGENT_COMPLETED` with genuine, substantive work product.
Zero occurrences of `Invalid JSON response` anywhere in this run's
disk-backed logs. Structured output (`Output.object()`) is confirmed
preserved: `complexity_assessor`'s second attempt returned a schema-parsed
JSON object (`{"complexity":"complex","confidence":0.75,...}`), not raw
text. The single remaining failure (the very first `complexity_assessor`
attempt) is a genuinely new, correctly-diagnosed failure class — a
structured-output parse failure, not a transport error — proving the
fix's own distinguishing-error-message design worked as intended.**

**Basis for the PASS, stated precisely.** The execution-reading PASS above
rests on the disk-backed `SUBAGENT_COMPLETED` events in
`stream-log/stream-06.txt` and the six "completed successfully" entries in
`work-product/task_logs.json`, cross-checked against real work-product
files those subagents actually wrote — **not** on the swarm view's WAITING
ON column, which is a separate, unrelated, and permanently stale field for
any subagent row (see "New defect found" below). The swarm-view **glyph**
column (`✓`/`✗`) IS a grounded, source-verified signal — `STATE_GLYPH[a.state]`
at `AgentsView.tsx:207` reads `snap.state`, which the `SUBAGENT_COMPLETED`/
`SUBAGENT_FAILED` handler sets directly (`observability.ts:393-394`) — so
reading `✓` as "done" in the captures below is a verified claim, not an
inference. The WAITING ON column beside it is not similarly grounded; it
is addressed as its own finding, not folded into the execution verdict.

### New defect found: swarm-view WAITING ON column never reflects subagent terminal state

**Filed as F-20** (`audit-evidence/cycle-01/findings.json`, status `OPEN`,
not fixed this session per explicit operator instruction).

In `captures/step-03-final-swarm-six-completed.png`, every subagent row's
WAITING ON column reads the identical `'— executing'`, regardless of
whether that row's glyph shows `✓` (done) or `✗` (error). This is a
**display gap, not a capture-timing artifact** — verified from source, not
assumed:

- `waitText()` (`AgentsView.tsx:85-95`) has cases only for the six
  `WaitState.kind` blocking-reason variants; its `null` fallback is the
  unconditional literal `'— executing'`. It has no `done`/`error`
  representation at all.
- `WaitState` (`observability.ts:39-47`) was scoped, by design, to describe
  *why a running agent is blocked* — not to carry terminal status.
- The `SUBAGENT_SPAWNING`/`SUBAGENT_COMPLETED`/`SUBAGENT_FAILED` handler
  (`observability.ts:379-397`) sets `child.snap.state` correctly but never
  touches `child.snap.waiting`.
- `recomputeWait()` (`observability.ts:492`), the sole writer of
  `.waiting`, is called only from `onStreamEvent()`'s tool-call/
  tool-result/step-finish/usage-update handlers and `pollSentinels()` —
  never from `onTaskEvent()`, which is what handles `SUBAGENT_*`.
- A subagent's own internal tool-call/step-finish activity is never
  relayed to the parent process at all: exhaustive grep of `worker.ts` and
  `subagent-executor.ts` confirms the only `postMessage` carrying a
  `subagentId` is the single `task-event` `SUBAGENT_*` payload
  (`worker.ts:1052-1062`) — no `stream-event` for any child ever exists.

So a `SUBAGENT_*`-driven child's `snap.waiting` is set to `null` once at
`ensureAgent()`'s init (`observability.ts:283`) and never written again for
the rest of that child's lifetime — under **no capture timing** would this
column ever read anything but `'— executing'` for a subagent row. The
glyph column beside it is correct and independently bound to real state;
the WAITING ON column is not. Recorded, not fixed — this session has
already made two display-layer changes (F-19) and the operator's
instruction was explicit: file, do not fix.

---

## The fix

`apps/desktop/src/main/ai/orchestration/subagent-executor.ts`'s
`SubagentExecutorImpl.spawn()` migrated from `generateText()` to
`streamText()` + `fullStream` consumption, mirroring
`merge-resolver.ts`'s proven `merge-resolver-stream` (F-16) pattern, with
two additions that pattern didn't need:

1. **Structured output preserved exactly.** This exact pinned AI SDK build
   (`ai@^7.0.62`, confirmed by reading `node_modules/ai/dist/index.d.ts`)
   exposes `StreamTextResult.output: PromiseLike<InferCompleteOutput<OUTPUT>>`
   and `StreamTextResult.steps: PromiseLike<Array<StepResult>>` — the
   identical `output: Output.object({ schema })` config shape and the same
   parsed-object contract `generateText()` used, just promise-wrapped
   because the stream must finish first. No degradation: `complexity_assessor`
   (the one agent type using `expectStructuredOutput`) still receives a
   schema-parsed `structuredOutput` object.

   Implementation detail: rather than build one loosely-typed options
   object with a conditional spread (which would require an `any`-typed
   cast for `streamText()`'s overloaded generic `OUTPUT` parameter to
   resolve), the call is branched into two statically-typed literals —
   one with `output: Output.object(...)`, one without — so TypeScript
   infers the correct `OUTPUT` generic in each branch without any cast.

2. **Event-ordering correctness.** `onSubagentEvent(..., 'completed', ...)`
   now fires only after: (a) `fullStream` has fully drained with no
   `error` part, AND (b) — when structured output was requested — `.output`
   has resolved without throwing. A transport-level `error` part routes to
   `'failed'` with the raw stream error message; a structured-output parse
   failure ALSO routes to `'failed'`, but with a distinguishing
   `Structured output parse failed: ...` prefix, so the two failure
   classes remain distinguishable in the graph and in logs — this is
   exactly what let this drive tell "the transport bug is gone" from "a
   new, different, legitimate failure occurred" without ambiguity.

`SubagentExecutor`, `SubagentSpawnParams`, `SubagentResult` (from
`spawn-subagent.ts`) and `SubagentExecutorConfig` are unchanged.
`SUBAGENT_MAX_STEPS = 100` and the `SpawnSubagent`-exclusion tool-set
filter (both pre-existing, cited in `agentic-orchestration-optin`) were
not touched.

### Verification

- `npm run typecheck`: **exit 0**, confirmed immediately after the edit.
- `apps/desktop`'s own `npx tsc --noEmit -p .`: zero hits for
  `subagent-executor.ts` among its 3675 pre-existing, unrelated errors
  (same whole-Electron-app debt documented in the prior report).
- Worker bundle rebuilt (`node tools/build-worker.mjs`). Confirmed the
  migrated code shipped, not just source-edited: byte-searched the 4.7MB
  `dist/agent-worker.cjs` (not `grep`'s 4MB match-display window) for the
  compiled function body around the distinctive runtime string
  `'Structured output parse failed'` (found at offset 4384610) — the
  surrounding 3000-byte window contains `streamText(` and does NOT contain
  `generateText(`, confirming the actual call primitive shipped changed.

### `VENDORED-PATCHES.md`

New `subagent-executor-stream (2026-09-18)` entry added, following
`agentic-orchestration-optin`, with the full root-cause paragraph and a
`| File | Change |` table, matching the existing ledger format exactly.
The edit itself carries an inline `[APERANT-PATCH subagent-executor-stream]`
marker in the file header, satisfying the ledger's stated contract that
every vendored patch is marked inline.

---

## Re-drive

Same discipline as the prior drive: session `subagent-proof-v2` (did not
touch `progress-live`, `ap-ar`, or `p53gate` — confirmed via `tuistory
sessions --json` before launch and after close), same router config, same
`APERANT_AGENTIC_SPEC_ORCHESTRATION=1` opt-in, new throwaway spec
directory `999-subagent-proof-v2` (no `spec.md`), resize round-trip
(`resize 200 15` → `resize 200 50`, ≥1.5s settle) before every decisive
shutter, exactly one `APERANT` boundary confirmed in every sidecar before
trusting the paired PNG.

### Sequence

| Time | Event |
|---|---|
| 05:32:08 | Task started, phase planning |
| 05:33:45.311 | 1st `SpawnSubagent`: `complexity_assessor` |
| 05:34:03.669 | **FAILED**: `Structured output parse failed: No object generated: could not parse the response.` — a genuine, new failure class (model didn't emit valid JSON), not the old transport bug |
| 05:34:09 | Orchestrator retries |
| ~05:34:20 | 2nd `SpawnSubagent`: `complexity_assessor` — **COMPLETED**, structured output `{"complexity":"complex","confidence":0.75,"reasoning":"..."}` |
| 05:34:50.311 | `SpawnSubagent`: `spec_gatherer` — **COMPLETED** 05:35:25 (35147ms), real requirements gathered |
| 05:35:47.700 | `SpawnSubagent`: `spec_researcher` — **COMPLETED**, real `research.json` written |
| 05:40:04.512 | `SpawnSubagent`: `spec_writer` — **COMPLETED**, real `spec.md`/`implementation_plan.json` written |
| ~05:41:xx | `SpawnSubagent`: `spec_critic` — **COMPLETED**, real critique with a MAJOR finding |
| ~05:43:xx | `SpawnSubagent`: `spec_validation` — **COMPLETED**, verdict VALID, `validation_report.json` written |
| 05:43:34 | Orchestrator `step-finish step 20`, `exit code 0` |

**6 of 7 total `SpawnSubagent` calls succeeded** (the only failure was the
very first attempt, a distinct and correctly-diagnosed new failure class).

### Decisive captures

All three below have sidecar `.txt` confirmed to contain **exactly one**
`APERANT` boundary (clean single-frame, not scrollback-contaminated).

**`captures/step-01-graph-two-completed-children.png`**
(sha256 `dcd4b7846791a1874c3b1abd8c240ba1aeb315c0ba349c631f4fd171eda83d96`) —
first decisive frame, captured moments after the `spec_gatherer`
`SUBAGENT_COMPLETED` payload:
```
◈ planner 999-subagent-pro · idle · 0%
├─✗ complexity_assessor ⚠ — executing
├─✓ complexity_assessor ⚠ — executing
├─✓ spec_gatherer — executing
└─● spec_researcher — executing
```

**`captures/step-02-graph-five-completed-children.png`**
(sha256 `3c58764906237f5e74d0533190fad263c8d58aad0950fd15fb59e10881544fe6`):
```
◈ planner 999-subagent-pro · planning · 0%
├─✗ complexity_assessor ⚠ — executing
├─✓ complexity_assessor ⚠ — executing
├─✓ spec_gatherer — executing
├─✓ spec_researcher — executing
├─✓ spec_writer — executing
├─✓ spec_critic — executing
└─● spec_validation — executing
```

**`captures/step-03-final-swarm-six-completed.png`**
(sha256 `285136610df286569e0aed22f7b95795d44615221e3f5f562b923232cd821a55`) —
final state, root exited `code 0`:
```
AGENT SWARM · 8 live
   AGENT              TYPE               STEPS      CTX      WAITING ON
 ❯ ✓ 999-subagent-pro   planner            20/1000    ██░░░ 35% — executing
   ✗ │ complexity_asses complexity_assess… 0/1000     ░░░░░ 0% — executing
   ✓ │ complexity_asses complexity_assess… 0/1000     ░░░░░ 0% — executing
   ✓ │ spec_gatherer-17 spec_gatherer      0/1000     ░░░░░ 0% — executing
   ✓ │ spec_researcher- spec_researcher    0/1000     ░░░░░ 0% — executing
   ✓ │ spec_writer-1789 spec_writer        0/1000     ░░░░░ 0% — executing
   ✓ │ spec_critic-1789 spec_critic        0/1000     ░░░░░ 0% — executing
   ✓ │ spec_validation- spec_validation    0/1000     ░░░░░ 0% — executing
```

## `SUBAGENT_COMPLETED` payloads — verbatim

Captured live (terminal-truncated, field names/values legible):

```
05:35:25 spec_gathere task:SUBAGENT_COMPLETED spec_gatherer
05:35:25 999-subagent task:SUBAGENT_COMPLETED {"type":"SUBAGENT_COMPLETED","subagentId":"spec_gatherer-178970…
05:35:25 999-subagent ← 35147ms Subagent (spec_gatherer) completed successfully.

Output:
Task is fully speci…
```
(`stream-log/stream-06.txt`)

The full, untruncated, disk-backed record of every `SpawnSubagent` outcome
this run — the durable source of truth, since terminal capture truncates
by column width — is in `work-product/task_logs.json`. Six
`tool_end`/`SpawnSubagent` entries with `detail` fields beginning
`"Subagent (<type>) completed successfully."`:

```json
{"detail": "Subagent (complexity_assessor) completed successfully.\n\nStructured output:\n```json\n{\n  \"complexity\": \"complex\",\n  \"confidence\": 0.75,\n  \"reasoning\": \"Task drives live SDK sessions, requires depth>=2 / concurrent-child tree rendering proof...\"\n}\n```..."}
{"detail": "Subagent (spec_gatherer) completed successfully.\n\nOutput:\nTask is fully specified by the kickoff context. Writing requirements.json directly.=== REQUIREMENTS GATHERED ===..."}
{"detail": "Subagent (spec_researcher) completed successfully.\n\nOutput:\nSufficient evidence gathered. Writing research.json...=== RESEARCH COMPLETE ===..."}
{"detail": "Subagent (spec_writer) completed successfully.\n\nOutput:\nFiles written:\n- `.../spec.md` (70 lines)\n- `.../implementation_plan.json` (valid JSON, schema-conformant)..."}
{"detail": "Subagent (spec_critic) completed successfully.\n\nOutput:\nRead complete. Analysis:\n\n## Critique\n\n**BLOCKER: none.**\n\n**MAJOR 1 — Missing prompt text (gap)**..."}
{"detail": "Subagent (spec_validation) completed successfully.\n\nOutput:\nAll checks pass. Writing report.**Verdict: VALID** — report written to `.../validation_report.json`..."}
```

The one failure entry, for direct contrast:
```json
{"detail": "Subagent (complexity_assessor) failed: Structured output parse failed: No object generated: could not parse the response."}
```

**No `Invalid JSON response` string occurs anywhere in `task_logs.json`
for this run** (mechanically confirmed via the `grep` tool over the full
file — zero matches).

## Work product — real files six subagents produced

Copied to `work-product/` before deleting the throwaway spec directory:

| File | Bytes | SHA-256 | Produced by |
|---|---|---|---|
| `complexity_assessment.json` | 751 | `fdf3e2eb3d53599c3db10a52b16e0191ef01eef51fe76273b5625d35f20c436a` | `complexity_assessor` (structured output) |
| `requirements.json` | 5378 | `1878d3002f39536d465c5743e494e8b8fbde9faf45971adb9145b468c2500172` | `spec_gatherer` |
| `research.json` | 12634 | `1dd0fa199571c78f8d811b8c95735c2cef64cf384f60c28f9ed1203d09280047` | `spec_researcher` |
| `spec.md` | 8564 | `0136552fba3e1729b737f52914255fa8552661106b11d69204f8cfe489b7282a` | `spec_writer` |
| `implementation_plan.json` | 5887 | `73c22e0ac9f7ed404ee9ec05b9fb0363f132b4a3a32c7ec697147ef344dbbffb` | `spec_writer` |
| `critique_report.json` | 3493 | `e5e14ddff176f81f30acf0490bc9e13858583a6bbb45ac93900358adb8f2fa8d` | `spec_critic` |
| `validation_report.json` | 2729 | `a00280c3b7c9f16db8b0688a9700b5474bf4d02db0d620a6dce363d859fd1e84` | `spec_validation` |
| `task_metadata.json` | 95 | `568d8be4e811b58f311dfdbcfbbc78e54413ab52514a7f77b665e63946b24b2d` | (input, unchanged) |
| `project_index.json` | 316 | `c72fc4fbb66c0b9792c7c63cf50ea709e8ab164b5378783a884bde289d4670a6` | (orchestrator, pre-spawn) |
| `task_logs.json` | 125508 | `c19d385ef38222bf84f1fbfd5f9308536339403ad4ff17f4e489eac3acbe2229` | (full session log) |

Unlike the pre-fix run, this work product is genuinely attributable to
individual completed subagents — every file above is named in its
producing subagent's own `task_logs.json` completion detail (e.g.
`spec_writer`'s entry literally states "Files written: `.../spec.md`
(70 lines)... `.../implementation_plan.json`"), not the orchestrator's
self-fallback text.

`spec_critic`'s output demonstrates the fix produced usable, substantive
subagent reasoning, not boilerplate: it found a real "MAJOR 1 — Missing
prompt text (gap)" issue in the plan and cited specific research keys
(`spawn_prompting.proven_single_child.prompt`) to support it.
`spec_validation`'s output confirms the whole artifact set is internally
consistent: "Files — spec.md, implementation_plan.json,
complexity_assessment.json, requirements.json, research.json all present,
non-empty. ✓ ... Verdict: VALID."

## `.auto-claude` isolation

Confirmed zero tracked diff scoped to `.auto-claude`, before and after
(directory is gitignored). `master` unchanged at `656fd1a`. `git worktree
list` shows the same three pre-existing task worktrees before and after —
`006-tool-allow-deny-lists`'s HEAD did advance (`57ebeae` → `38e8b81`)
between the two drives, but that is the sibling `progress-live` session's
own independent activity on a different task, confirmed by reading that
worktree's own commit log (`auto-claude: Complete subtask-4-2 - Document
policy in README`) — unrelated to and untouched by this drive, which only
ever created/removed `999-subagent-proof-v2`.

## Gates (unpiped, `subprocess.run().returncode`)

| Gate | EXIT_CODE | Log | SHA-256 |
|---|---|---|---|
| typecheck | 0 | `gates/typecheck.txt` | `070eb030919127224a78fab5705ac3ceec59e381a80358531ecb076281172632` |
| test (`CI=1`) | 0 | `gates/test.txt` | `fe20e5aafb404f8e8a966268130a674f5cccd429e35c6c79aea9f5fa11a1c252` |
| build | 0 | `gates/build.txt` | `f0c0d705847acc1ccac4622815d79049b04b5af58e31e141389b1b33e59bf7e6` |

`test.txt` confirms `2 passed (2)` files, `9 passed (9)` tests — identical
to the pre-fix baseline, no regressions from the `streamText()` migration.
`build.txt`'s bundles: `dist/agent-worker.cjs` sha256
`dfe9e46ac69bb3f4a184f2ccaf4aa41b374914ebffbdfb5e01529eaa8aed2184`,
`dist/cli.mjs` sha256 `b95b8e3cd5df2412fc5a91eeccf4c84be2019242cb569820c6b7f71a30d0d979`.

## Honesty disclosures

- The one failure this run (first `complexity_assessor` attempt) is
  real and reported, not hidden — it is a materially different, smaller
  failure surface than before (a model occasionally failing to emit
  schema-conformant JSON on a structured-output call, vs. every single
  call unconditionally failing at the transport layer) and it self-healed
  on retry, matching the orchestrator's own pre-existing one-retry policy.
- Not claiming 100% subagent reliability going forward — this is one
  drive, six real completions across six agent types, one distinguishable
  non-transport failure. A structured-output parse failure is a legitimate
  occasional model behavior, not a code defect this session found reason
  to fix further.
- No tokens, secrets, or credentials appear in any evidence artifact in
  this directory (scanned programmatically; router env vars passed via
  `tuistory launch --env`, never echoed to a saved file).
- **The execution-reading PASS is grounded in `task_logs.json`'s six
  disk-backed "completed successfully" entries and their corresponding
  work-product files — not in the swarm view's WAITING ON column**, which
  F-20 (above) establishes never reflects subagent terminal state for any
  capture, at any timing. The swarm-view glyph column, separately, IS
  verified bound to `snap.state` and its `✓`/`✗` readings in this
  document's captures are grounded claims. F-20 is filed OPEN, not fixed,
  per explicit operator instruction to record rather than resolve it this
  session.
