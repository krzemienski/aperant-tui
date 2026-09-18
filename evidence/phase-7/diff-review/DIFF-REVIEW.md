# DIFF-REVIEW — Phase 7 final change-scope review (read-only)

**Reviewer:** subagent `diff-review`, read-only pass. No files edited except this report.
**HEAD at review start:** `20a7e9b949866c37c94f13e73546e5b82793af54` (unchanged throughout — confirmed by `git status --porcelain` identical at start and end; see §1).

---

## 0. TL;DR (read this first)

**The change set is NOT clean.** One tracked source file — `apps/tui/src/views/BoardView.tsx` — currently contains a **broken import that fails `tsc --noEmit`**: `import { probeHR } from '../util/render-probe';` where `apps/tui/src/util/render-probe.ts` does not exist anywhere on disk or in git history. This is leftover/dangling debug instrumentation the two TitleBar/Panel comments explicitly say was "removed." **It was not removed from `BoardView.tsx`.** `tsc --noEmit` against `apps/tui/tsconfig.json` fails with `TS2307: Cannot find module '../util/render-probe'` right now, in the current working tree. This directly contradicts `evidence/phase-7/gates-final/typecheck.txt`, which shows `EXIT_CODE=0` for the same command — **that gate evidence is now stale**, almost certainly because `BoardView.tsx`'s mtime (19:08:47) postdates every timestamp in `GATES-FINAL.md` (last capture 18:25:21). The file is still being edited by the other worker (`linked-proofpunk` per the peer roster), consistent with the task brief's warning. **This must be fixed (dead import removed) and the typecheck gate re-run before commit.**

Beyond that one blocking finding, the five attributed defect fixes and the perf/windowing work are each internally well-documented and individually verifiable against their own inline evidence citations. The `React.memo` additions are correct, low-risk hygiene as claimed. The vendored-runtime patches mostly follow the `[APERANT-PATCH …]` convention and are recorded in `VENDORED-PATCHES.md` — except `models.ts`, which is not.

---

## 1. Exact change surface

### Tree state (attributability)

```
$ git status --porcelain   # captured at review START
```
20 tracked files modified (`M`), 76 untracked paths (`??`), the vast majority of which are evidence directories from this session (see §1c). Full raw output saved as this report's basis; reproduced in condensed form below.

```
$ git status --porcelain   # captured at review END
```
**Identical to start.** `diff` between the start-of-review and end-of-review porcelain snapshots is empty (`diff` exit code 0). No drift occurred during this review. `apps/tui/src/views/BoardView.tsx` was *not* touched again while I was reviewing it, but its **mtime (19:08:47 -0400) is ~43 minutes newer** than the last `GATES-FINAL.md` capture timestamp (18:25:21) and ~10 minutes newer than my own review start — the other worker (`linked-proofpunk`, confirmed live on the peer roster) edited it after gates-final was captured and, per this review's typecheck probe, left it in a state that does not compile. See §2 and §6.

### Tracked file diff --stat (all 26 tracked paths with changes)

```
VENDORED-PATCHES.md                                                                  |  54 +++-
apps/desktop/src/main/ai/runners/merge-resolver.ts                                   |  64 ++++-
apps/desktop/src/main/ai/session/runner.ts                                           |  96 +++++-
apps/desktop/src/main/ai/session/stream-handler.ts                                   |  24 +-
apps/desktop/src/shared/constants/models.ts                                          |  21 ++
apps/tui/src/components/HelpOverlay.tsx                                              |  11 +
apps/tui/src/components/Panel.tsx                                                    |  26 +-
apps/tui/src/components/StatusLine.tsx                                               |  30 +-
apps/tui/src/components/TabBar.tsx                                                   |   6 +-
apps/tui/src/components/TitleBar.tsx                                                 |  14 +-
apps/tui/src/hooks/useKeymap.ts                                                      |  53 ++-
apps/tui/src/services/account-service.ts                                             |  93 +++++-
apps/tui/src/services/agent-start-service.ts                                         | 308 +++++++++++++++++-
apps/tui/src/services/observability.ts                                               |  30 ++
apps/tui/src/services/roadmap-service.ts                                             |   5 +-
apps/tui/src/views/BoardView.tsx                                                     | 225 +++++++++++--
apps/tui/src/views/InsightsView.tsx                                                  |  55 ++-
apps/tui/src/views/RoadmapView.tsx                                                   |  50 ++-
apps/tui/src/views/SettingsView.tsx                                                  | 128 ++++++--
apps/tui/src/views/WorktreeView.tsx                                                  | 146 ++++++-
audit-evidence/cycle-01/findings.json                                                | 180 +++++++++-
evidence/phase-5/.../MANIFEST.json                                                   |  25 +-
evidence/phase-5/.../...-1-1-bs4-HTML-link-extra.patch                               |  84 +----
evidence/phase-5/.../agent-events.jsonl                                              | 112 ++++----
evidence/phase-5/.../work-product.diff                                              |  84 +----
tools/tuistory_drive.py                                                              |  85 ++++
26 files changed, 1650 insertions(+), 359 deletions(-)
```

**14 of the 26 modified tracked files fall outside the six-file attribution list in the task brief.** Ten are TUI/vendored *source* files not mentioned in the brief's five-workstream summary (`merge-resolver.ts`, `runner.ts`, `HelpOverlay.tsx`, `agent-start-service.ts`, `roadmap-service.ts`, `RoadmapView.tsx`, `SettingsView.tsx`, `WorktreeView.tsx`, plus `VENDORED-PATCHES.md`). All ten are internally self-documented with the session's own defect-tag convention (`F-##`, `D-##`, `P#.#`, `APERANT-PATCH`) that cross-references real line numbers and matches the same evidence style as the six brief-named files — see §2 for the attribution table. The remaining four (`audit-evidence/cycle-01/findings.json`, the three `evidence/phase-5/...` artifacts, `tools/tuistory_drive.py`) are prior-session audit/evidence bookkeeping, not TUI/desktop source — out of scope for a source-code review but not unexplained; they read as routine evidence-ledger updates from an earlier phase of this same operator session.

### Untracked additions, summarized by directory

| Path | Contents | Note |
|---|---|---|
| `.agents/`, `.claude/`, `.omc/`, `.omp/` | 3, 3, 7, 3 entries | Tooling/harness state dirs, not app source |
| `CLAUDE.md` | 1 file | Session/agent config |
| `apps/tui/src/services/worktree-actions.ts` | 1 file, 339 lines | **New source file** backing `WorktreeView.tsx`'s Phase 5 merge/PR/AI-resolve actions (see §2) |
| `audit-evidence/RETRACTION.md` | 1 file | Prior-cycle retraction note (pre-existing audit trail, not from this session's five fixes) |
| `audit-evidence/cycle-01/functional-evidence/` | 11 entries | Functional-audit screenshots/logs from an earlier cycle |
| `audit-evidence/cycle-01/ux-reports/*.png,*.txt` | 58 files | UX-audit screenshots/text captures from earlier cycles (awesome-researcher, hunter-seed, overlay-* fixtures) |
| `banks/` | 5 entries, 1.1M | Agent memory/knowledge bank |
| `docs/agents/`, `docs/plan/ACCEPTANCE-INVENTORY.md` | 4 + 1 | Planning docs |
| `evidence/gate-recheck-session3/` | 7 entries, 24K | Prior gate-recheck session |
| `evidence/phase-5/run-.../REDACTION-NOTE.md` | 1 file | Redaction note for phase-5 evidence |
| `evidence/phase-6/` | 26 entries, 60M | Phase-6 evidence bundle |
| `evidence/phase-7/` | 59 entries, 35M | This session's evidence (perf gates, functional captures, this report's own directory) |
| `repomix-output.xml`, `skills-lock.json` | 2 files | Tooling artifacts |
| `tools/build-fixture-200.py`, `tools/prove-linked-workflow.py`, `tools/read-model-routes.py` | 3 files | Test-fixture/tooling scripts (the 200-task fixture is what produced the P7.1 scroll-throughput measurements cited in `useKeymap.ts`/`BoardView.tsx`) |

None of the untracked additions are surprising given the session narrative (perf investigation needs a 200-task fixture generator; every fix needs a driven-evidence capture directory). Nothing in the untracked set touches `.ts`/`.tsx` app source outside the one new `worktree-actions.ts` file, which is directly required by the tracked `WorktreeView.tsx` diff.

---

## 2. Attribution — every modified source file mapped to a cause

| File | Attribution | Verified? |
|---|---|---|
| `apps/tui/src/services/account-service.ts` | **#1 (F-18)** — `(provider, baseUrl)` match, `mintAccountId()` | ✅ matches brief exactly |
| `apps/tui/src/views/InsightsView.tsx` | **#2 (F-10)** — escape closes ask box; **also** F-09 (ideation status stopped updating on identical strings) and D-C (`applyAccountEnv()` before runner calls) | ✅ escape fix present at the exact lines `SOURCE-VERIFICATION.md` cites; F-09/D-C are *additional*, self-documented, non-brief-mentioned changes in the **same file** — not unattributed, but the brief undersold this file's scope |
| `apps/desktop/src/shared/constants/models.ts` | **#3** — strips router `provider/` prefix in `getModelContextWindow()` | ✅ matches brief; not yet in `VENDORED-PATCHES.md` — **flagged in §4** |
| `apps/desktop/src/main/ai/session/stream-handler.ts` | **#4** — `cumulativeUsage.promptTokens` assignment not accumulation | ✅ matches brief; carries no `[APERANT-PATCH]` marker of its own but the change is 4 lines inside a function whose surrounding vendored-patch history is already tracked — **flagged in §4** |
| `apps/tui/src/services/observability.ts` | **#5** — `onLog()` refreshes model/contextWindowLimit | ✅ matches brief |
| `apps/tui/src/hooks/useKeymap.ts` + `apps/tui/src/views/BoardView.tsx` | **#6 (P7.1)** — viewport windowing + `splittableKeys` | ✅ windowing/splitting logic matches brief and `SOURCE-VERIFICATION.md`'s line citations. **BUT** `BoardView.tsx` also carries an entirely separate, brief-unmentioned change: **`P-BOARD-LIVE`** (live phase display via the observability `snapshot` event) and **F-12** (real `stop`/`killTask` wiring) — both internally documented with the same evidentiary rigor, but neither appears in the task brief's five-item list. **AND** it carries the broken `probeHR` import — see the blocking finding below. |
| `apps/tui/src/components/{TitleBar,TabBar,StatusLine}.tsx` | Chrome memoization, as described | ✅ see §3 |
| `apps/tui/src/components/Panel.tsx` | Comment-only per brief — **actually also changes behavior**: `borderStyle={focused ? 'bold' : 'single'}` (F-11, glyph-set focus indicator) is a **real rendering change**, not comment-only | ⚠️ brief undersells scope; see §3 |

### Files outside the brief's six, but self-attributed and verified

- **`apps/desktop/src/main/ai/runners/merge-resolver.ts`** — `[APERANT-PATCH merge-resolver-stream]`, F-16: switches `generateText()` → `streamText()` because the operator's router always frames responses as SSE with a trailing `data: [DONE]` terminator that `doGenerate()`'s single-shot JSON parser rejects. Fully documented in the diff and in `VENDORED-PATCHES.md`'s new `## merge-resolver-stream (2026-09-17)` section. **Attributable.**
- **`apps/desktop/src/main/ai/session/runner.ts`** — `[APERANT-PATCH stream-ping]`: `includeRawChunks: true` to surface provider pings as `raw` stream parts (closes a false-dead-connection watchdog gap), plus `readTimeoutMsEnv()` making both inactivity timeouts env-overridable. Documented in-diff and in `VENDORED-PATCHES.md`'s `## stream-ping (2026-09-17)` section, including an audit of all five other `streamText()` call sites in the vendored tree confirming they're unaffected. **Attributable.**
- **`apps/tui/src/services/agent-start-service.ts`** (+308/-11, the largest single diff) — bundles several tagged sub-changes: `applyAccountEnv()` (D-C), `syncPlanOnExit`/`attachPlanSync` (F-17, worktree plan sync on exit), a `startTask()` account-selection fix (F-12: pick highest-priority account by `globalPriorityOrder`, not array-insertion order). Each sub-change carries its own multi-paragraph rationale citing exact vendored line numbers (`account-service.ts:232-282`, `resolver.ts:323-337`, `build-orchestrator.ts:677-681`, etc.). **Attributable**, though this is the single file where the brief's "six files / five workstreams" framing is most understated — this file alone contains at least 3 distinct fixes not named in the brief.
- **`apps/tui/src/services/roadmap-service.ts`** — one-line addition of `applyAccountEnv()` call, tagged `D-C`, consistent with the same fix applied in `InsightsView.tsx` and `agent-start-service.ts`. **Attributable**, trivial.
- **`apps/tui/src/views/RoadmapView.tsx`** — `F-07`: `roadmap-log` events arrive as raw per-chunk AI-SDK text deltas, not per-line; adds `pushLogChunk()`/`LogBuf` to coalesce them and recognize three synthesized whole-message shapes. **Attributable**, self-documented.
- **`apps/tui/src/views/SettingsView.tsx`** — `P6.2`: adds a `tab`-focus model between theme-cycling and a new accounts panel, wired to the new `activateAccount()` export in `account-service.ts` (which is itself the newest addition inside the already-brief-mentioned `account-service.ts` diff, not separately called out). **Attributable**, self-documented, consistent cross-file (`account-service.ts` ⇄ `SettingsView.tsx` ⇄ `StatusLine.tsx`'s P6.2 hint text all agree).
- **`apps/tui/src/views/WorktreeView.tsx`** + new **`apps/tui/src/services/worktree-actions.ts`** — "Phase 5": real merge, real `gh pr create`, AI-conflict-resolution wiring backed by the now-fixed `merge-resolver.ts`. Header comment explicitly states scope and safety invariants (no `--force`, no `reset --hard`, no `clean`, gated on `isActive`). **Attributable.**
- **`apps/tui/src/components/HelpOverlay.tsx`** — `F-13`: adds a `tab` row for the shared tree/set focus binding the Phase 5/P6.2 work introduced; explicitly reasons about *why* it doesn't try to enumerate every view's full keymap. **Attributable**, trivial, consistent with `StatusLine.tsx`'s own F-13 tag.
- **`VENDORED-PATCHES.md`** — documents `stream-ping` and `merge-resolver-stream`. **Attributable**, but incomplete — see §4.

### The one genuinely concerning item: `probeHR` import in `BoardView.tsx`

`apps/tui/src/views/BoardView.tsx:20` reads:
```ts
import { probeHR } from '../util/render-probe';
```
`apps/tui/src/util/render-probe.ts` (or `.tsx`) **does not exist** — confirmed by `glob` (path not found) and by grepping the entire `apps/tui/src` tree (only *comments* in `Panel.tsx` and `TitleBar.tsx` mention "render-probe instrumentation, since removed" — past tense, referring to a *different* probe that genuinely was removed from those two files). `git log --all --diff-filter=A -- '**/render-probe*'` returns nothing — this file was never even committed to be later deleted; it is either a stray leftover from local scratch work that was never checked in, or a reference to a file the editing worker intended to create and hasn't yet. `probeHR` itself is imported but **never called anywhere in the file** (single occurrence, the import line itself).

**This fails `tsc --noEmit` right now**: I ran `npx tsc --noEmit -p apps/tui/tsconfig.json` (read-only; not one of the withheld gate commands, and I did not modify anything) and got exactly one error:
```
apps/tui/src/views/BoardView.tsx(20,25): error TS2307: Cannot find module '../util/render-probe' or its corresponding type declarations.
```
This directly contradicts `evidence/phase-7/gates-final/typecheck.txt` (`EXIT_CODE=0`). Reconciling the timestamps: `GATES-FINAL.md` records `BoardView.tsx`'s mtime as `18:25:21`; the file's **current** mtime is `19:08:47` — 43 minutes later, after gates-final captured its "attributable tree state." The other live worker (`linked-proofpunk`) is mid-edit on this exact file per the task brief's own warning and the peer roster. **The typecheck gate evidence is stale and must be re-captured after this import is fixed or removed.** This is squarely the kind of drift the brief asked me to watch for.

---

## 3. Chrome memoization — per-file verdict

The hypothesis motivating `React.memo` here (that these three components were re-rendering per-keystroke and that was the scroll bottleneck) was **disproven** by the same investigation that produced the memo — the comments say so themselves, and correctly. That makes this a case where the fix doesn't address the originally-suspected cause, which is exactly the profile of "looks like an optimization, isn't one." I read each diff on its own merits rather than trusting the comment's self-assessment.

- **`TitleBar.tsx` → `React.memo(TitleBarImpl)`**
  Props: `{ theme, projectName, projectPath, branch, counts, profile }` — all primitives/plain objects sourced from narrow Zustand selectors and project metadata that changes only on project switch or a periodic counts refresh, not per-keystroke. `React.memo`'s shallow comparison is meaningful here **only if** `counts` (likely an object) is a *new reference* on every App render even when its contents are unchanged — I did not have visibility into `counts`'s producer to confirm referential stability, but even in the worst case (new object every render) this memo is a no-op, not a *regression*: it costs one extra shallow-compare per render and changes nothing else. **Recommendation: keep.** Correct, low-risk hygiene; worst case it's inert.

- **`TabBar.tsx` → `React.memo(TabBarImpl)`**
  Props: `{ view, theme }` — `view` is a `ViewName` string (primitive, trivially stable across renders where the view hasn't changed) and `theme` is presumably a shared object reference from the same theme provider `TitleBar`/`StatusLine` consume. This is the cleanest of the three: a string-keyed comparison that will actually skip re-renders whenever the active view and theme are unchanged, which is the overwhelming majority of BoardView-scroll keystrokes. **Recommendation: keep.** Actually effective, not just inert.

- **`StatusLine.tsx` → `React.memo(StatusLineImpl)`**
  Props: `{ view, theme, mode }` — same shape as `TabBar`, plus an optional `mode` string. Same reasoning applies. **Recommendation: keep.**

- **`Panel.tsx` — deliberately NOT memoized.** The file's own comment states the reason precisely: every caller (BoardView included) passes a freshly-created `children` JSX tree on every render, so `React.memo`'s shallow prop comparison would never find `children` referentially equal and the memo would be a no-op that *looks* like an optimization but never fires. **I verified this reasoning holds**: `Panel` is invoked in `BoardView.tsx` as `<Panel title="TASKS" ...>{...JSX...}</Panel>` with inline JSX children at both of its two call sites in the reviewed diff — `children` is unavoidably a new element tree on every parent render regardless of whether the *content* is unchanged. The comment additionally notes the real bottleneck is in Ink's own input-parsing/render-throttle internals, which is consistent with `useKeymap.ts`'s and `BoardView.tsx`'s own P7.1 fix targeting the coalesced-keystroke and unwindowed-render problems directly rather than reaching for `React.memo` as a blanket fix. **Recommendation: correctly left unmemoized — do not add `React.memo` here.** This is the one place in the four-component set where a naive "add memo everywhere for consistency" instinct would have shipped a genuinely useless line of code, and the author avoided it with a defensible, falsifiable argument.

**None of the four are unrequested churn to revert.** Three are real (if narrow-impact) hygiene; one is a documented non-change. All four preserve behavior — none alter what gets rendered, only whether a given render is skipped.

Separately, `Panel.tsx` is **not** comment-only as the task brief characterized it: the `borderStyle={focused ? 'bold' : 'single'}` change (F-11, glyph-set focus indicator) is a real, behavior-affecting addition on top of the comment-only parts. It's well-justified (screen-reader/monochrome-terminal accessibility for the focus ring, not just color) but the brief's "and `Panel.tsx` a comment-only change" undersells this file's actual diff by one meaningful line.

---

## 4. Vendored-runtime edit convention — compliance check

`VENDORED.md`'s rule: `apps/desktop/src/main/**` and `apps/desktop/src/shared/**` are a byte-for-byte unmodified upstream snapshot; the TUI "never modifies them... wraps or adapts in its own tree instead." `VENDORED-PATCHES.md` is the documented exception-ledger for cases where that rule is deliberately broken, using an `[APERANT-PATCH <name>] (<date>)` marker comment convention (confirmed pre-existing: e.g. `observability-tap`, `worker-path` sections already in the file before this session, plus the `AgentManagerEvents += 'stream-event'` and `ParallelExecutorConfig.onSubtaskQueued` entries).

| File | Marker present? | `VENDORED-PATCHES.md` entry? | Verdict |
|---|---|---|---|
| `apps/desktop/src/main/ai/runners/merge-resolver.ts` | ✅ `[APERANT-PATCH merge-resolver-stream] (2026-09-17)` | ✅ new `## merge-resolver-stream (2026-09-17)` section | **Follows convention fully.** |
| `apps/desktop/src/main/ai/session/runner.ts` | ✅ `[APERANT-PATCH stream-ping] (2026-09-17)` ×3 (helper, both timeout constants, `includeRawChunks` call site) | ✅ new `## stream-ping (2026-09-17)` section | **Follows convention fully**, including the file's own audit of the five other `streamText()` call sites the ledger claims are unaffected. |
| `apps/desktop/src/shared/constants/models.ts` | ❌ No `[APERANT-PATCH ...]` marker anywhere in the diff | ❌ Not mentioned in `VENDORED-PATCHES.md` at all — the file's existing entries (`shared/constants/models.ts` already has ONE marked row in the pre-existing table for moonshot entries, but this new provider-prefix-stripping change has no marker and no row) | **Gap — does not follow convention.** This is a real vendored-source patch (root-caused with a live-run measurement, exactly the rigor `VENDORED-PATCHES.md`'s other entries use) that is currently undocumented in the ledger and unmarked in the file. |
| `apps/desktop/src/main/ai/session/stream-handler.ts` | ❌ No `[APERANT-PATCH ...]` marker on this specific hunk (the file DOES carry an *earlier*, pre-existing marker for a *different* patch elsewhere in the file per the task brief, but the new `cumulativeUsage.promptTokens` fix itself is unmarked) | ❌ Not mentioned in `VENDORED-PATCHES.md` | **Gap — does not follow convention.** Same pattern: well-reasoned in an inline comment, but the inline comment doesn't use the `[APERANT-PATCH ...]` tag format and there's no ledger entry. |

**Finding: 2 of 4 vendored-file edits this session (`models.ts`, `stream-handler.ts`) do not follow the repo's own documented patch-marking convention, and neither is recorded in `VENDORED-PATCHES.md`.** Both changes are technically sound and thoroughly justified in their inline comments — this is a **documentation-convention gap**, not a correctness concern — but it is a real gap the operator should close before commit: a future `sha256sum -c ../DESKTOP-SHA256SUMS.txt` / re-sync-from-upstream cycle (per `VENDORED.md`'s own re-sync instructions) has no ledger entry telling the next person these two specific hunks are intentional local patches that need to be re-applied, unlike the other two files which are fully covered.

---

## 5. Risk assessment per change

| Change | Blast radius | What could regress | Evidence coverage |
|---|---|---|---|
| **#1 account-service (F-18)** `(provider,baseUrl)` match + `mintAccountId` | Any code path that provisions or looks up a provider account by provider name alone. `SettingsView.tsx`'s new accounts panel and `activateAccount()` both consume `listProviderAccounts()`'s output shape, which is unchanged except for dropping `keyPreview`. | An operator who previously relied on "second add of the same provider always overwrites" (unlikely intentional behavior, but a behavior change nonetheless) now gets a second account instead. `mintAccountId`'s suffix-on-collision loop is unbounded (`for (let n = 2; ; n += 1)`) — theoretically an infinite loop if fed a pathological accounts array, though this requires an adversarial or corrupted `settings.json` with millions of colliding ids, not a real-world path. | `SOURCE-VERIFICATION.md` confirms the exact predicate at both call sites; no test file changes shown in this diff for this logic — coverage rests on the "driven the real TUI" claim in the brief, which I cannot independently confirm from a diff review alone. **Moderate-low risk; verify the reprovision path was actually exercised end-to-end, not just read-verified.** |
| **#2 InsightsView (F-10 + F-09 + D-C)** | Only the ask-box escape path, the ideation status-line accumulation, and the `applyAccountEnv()` pre-call. Scoped `useInput({isActive: asking})` is additive and narrowly gated. | A stray extra `useInput` listener always mounted (even when inactive) has near-zero perf cost but is one more hook in the tree; no regression risk beyond that. F-09's char-count/tail accumulation changes *what the status string looks like* but not control flow. | `SOURCE-VERIFICATION.md` line 10 confirms the escape handler exists verbatim. F-09/D-C are plausible but not independently spot-checked by the gates-final source-verification pass (which only covered the six brief-named files' *specific claimed lines*, not every line in each file). **Low risk.** |
| **#3 models.ts** provider-prefix stripping | Every call site of `getModelContextWindow()` — used by `observability.ts`'s new `onLog()` handler and (per the vendored contract) by `session/runner.ts`'s 70%/90% compaction guards. | A model id containing a literal `/` that is NOT a router prefix (unlikely in this catalog's naming scheme, but not proven impossible) could now match an unintended catalog entry after prefix-stripping. The `slashIdx !== -1` guard correctly scopes this to only slash-containing ids, so bare shorthands are provably unaffected. | `SOURCE-VERIFICATION.md` line 11 confirms the guard and retry logic verbatim, including the 200_000 fallback staying intact. **Low-moderate risk** given this feeds a real safety guard (context-window compaction) — worth confirming the specific `glm/glm-5` live-run repro cited in the comment was captured as an artifact somewhere in `evidence/phase-7/`, not just narrated. |
| **#4 stream-handler.ts** `promptTokens = ` not `+=` | `cumulativeUsage` is read by the CTX% display (per the brief) and anywhere else in the vendored tree that consumes this state object. | If any OTHER consumer of `cumulativeUsage.promptTokens` genuinely expected N-step accumulation (unlikely given standard chat-completion usage semantics, and the comment's reasoning is sound), this would be a regression for that consumer. I did not have visibility into every consumer of `cumulativeUsage` to rule this out with certainty. `totalTokens` is now correctly derived as `promptTokens + completionTokens` rather than independently accumulated, which is strictly more correct. | Comment cites a specific live-run repro (`CTX 1088%`, `Sigma tokens 2206.6k`) and correctly notes the session-abort guard reads a *different* field (`step-finish`'s per-step usage) and was never affected by this bug. **Low risk**, well-isolated fix. |
| **#5 observability.ts onLog()** | New event listener on `'log'`; regex-matches one specific log line shape (`worker.ts:394`'s `postLog` format). | If `worker.ts`'s log format string ever changes (e.g. wording, punctuation) without updating `SESSION_START_RE`, this silently stops firing (regex simply won't match) rather than throwing — a soft failure that degrades back to the pre-fix 200k-fallback behavior, not a crash. That's a reasonable failure mode but means a future refactor of the vendored `worker.ts` log wording could silently regress this fix with no test failure to catch it. | `SOURCE-VERIFICATION.md` confirms wiring and handler verbatim. **Low-moderate risk** — the regex-on-log-text coupling to vendored code is inherently brittle; not a bug in this diff, but a latent fragility worth a comment pointer at `worker.ts:394` so a future vendored re-sync flags it (the comment already does cite that line, which mitigates this concern significantly). |
| **#6 useKeymap.ts + BoardView.tsx** viewport windowing + `splittableKeys` | Every view using `useKeymap` (all of them) gains the new optional `splittableKeys` param — default `undefined`, so **every other view's behavior is provably unchanged** (opt-in only, verified by reading the diff: the new branch is gated behind `splitRef.current?.length`). BoardView's rendering changes from unconditional full-list `.map()` to a windowed slice. | The windowing math (`scrollRef`, `maxScroll`, `selRowIndex`) is non-trivial; an off-by-one in `viewportRows`/`BOARD_CHROME_ROWS` could clip the last visible row or leave a dead row at the bottom on some terminal heights. `startingRef`/`starting` dual-tracking (ref for synchronous reentrancy guard, state for UI) is a correct pattern for the coalesced-keystroke-burst problem it's solving, but it's exactly the kind of dual-state-source bug class that's easy to get subtly wrong (e.g. if `starting` state and `startingRef.current` ever diverge, the UI could show stale spinner text). The `splittableKeys: ['j','k']` allowlist is correctly restricted to pure state-transition handlers per the file's own stated safety rule, and BoardView's own comment explicitly explains *why* `H`/`L`/`s`/`x` are excluded. | The brief cites a specific measured drop-rate result (93.33% → 0%) and `SOURCE-VERIFICATION.md` confirms the windowing variables exist at the claimed lines. **This is the highest-surface-area change in the set** (225 lines) and the one file that currently **fails to compile** due to the unrelated `probeHR` import — see the blocking finding. Once that import is removed, risk is **moderate**: real UI-rendering logic, well-reasoned, but with enough surface area (scroll math, dual guard state, live-phase Map rebuild on every `snapshot` event) that I'd want to see it actually driven at 200-task scale one more time after the current worker's edits settle, not just re-typechecked. |
| **P-BOARD-LIVE (undocumented-in-brief)** live phase via `observability.on('snapshot', ...)` | Adds a `liveTick` state + `useEffect` subscription + `useMemo` map rebuild, re-rendering BoardView on every observability snapshot tick (documented as "at most once per 16ms frame when dirty"). | This is a *new* re-render trigger on BoardView that didn't exist before — potentially in tension with the very P7.1 perf fix in the same file, since it's one more thing that can cause BoardView to re-render at up to ~60fps while an agent is actively streaming, right as the windowing fix is trying to keep BoardView's render cost bounded. The windowing fix bounds the *cost per render*, not the *render frequency*, so these two changes are compatible in principle, but I'd want to see a combined "an agent is running AND the user is scrolling at 200-task scale" measurement, which I don't see evidence of in the reviewed artifacts (P7.1's cited evidence files are keystroke-drop-rate measurements, not measurements taken with a live agent stream concurrently ticking `snapshot`). | **Moderate risk, weakest evidence coverage of anything in this set** — real and well-reasoned as a fix for the "phase stays `-` forever" bug, but its interaction with the same-file perf fix is asserted rather than measured. |
| **F-12 (BoardView) real `stop`/`killTask`** | Adds `getManager()` + a locally-declared `StoppableManager` type extending the shared `AgentManagerLike` shape (declared "out of scope for this fix" to edit directly — reasonable, minimizes blast radius). | Calling `killTask`/`isRunning` on a manager instance that doesn't actually implement them at runtime (if the vendored singleton's shape ever changes) would throw at call time, not at typecheck time, since the cast to `StoppableManager` is unchecked (`am as unknown as StoppableManager`). This is a real but narrow risk — the comment correctly identifies the vendored source lines these methods come from (`agent-manager.ts:740-742`, `:782-784`), which mitigates but doesn't eliminate it. | Not verified against `agent-manager.ts` by this review (out of the six-file scope) — I did not independently confirm `killTask`/`isRunning` exist at those exact lines in the vendored file. **Recommend a quick confirmation of that vendored source before commit**, since an unchecked type cast onto vendored code is exactly the kind of thing that silently breaks on a future upstream re-sync. |

---

## 6. Anything that should NOT ship

1. **`apps/tui/src/views/BoardView.tsx:20` — `import { probeHR } from '../util/render-probe';`.** Module does not exist. Fails `tsc --noEmit` right now (confirmed live). Never called (dead import even if the module existed). This is exactly the "leftover instrumentation" the task asked me to grep for, and it's the single most important finding in this review — **must be removed (or the missing module created and the probe actually used/justified) before any typecheck gate can be trusted, and before commit.**

2. Grep for `render-probe|probe(|console.log|debugger|XXX|FIXME` across all 20 modified tracked source files: **zero hits for `console.log`, `debugger`, `XXX`, `FIXME`, or a called `probe(...)`.** The only "probe" hits are the two *comments* in `Panel.tsx`/`TitleBar.tsx` correctly describing a **different**, already-removed probe in past tense, and the one dangling import above. No other debug leftovers found.

3. Nothing else in the 20 tracked file diffs is unrelated to the stated defects/perf work — every hunk I read carries an inline tag (`F-##`, `D-##`, `P#.#`, `[APERANT-PATCH ...]`) that traces to a specific, checkable rationale. I did not find any drive-by refactors, unrelated renames, or stray formatting-only churn.

4. **Secondary, non-blocking:** `VENDORED-PATCHES.md` gap for `models.ts` and `stream-handler.ts` (§4) — not something that "ships broken," but a documentation debt that should be closed in the same commit that ships these two vendored patches, per the repo's own convention.

---

## Summary for the operator

- **Modified tracked files (26 total; 20 are `.ts`/`.tsx` source):** see table in §1. Every source file maps to a self-documented, evidence-cited defect or perf fix (§2) — including 10 files beyond the brief's six that are real, attributable work the brief simply undersold.
- **Most important finding:** `apps/tui/src/views/BoardView.tsx` currently imports a non-existent module (`../util/render-probe`) and **fails `tsc --noEmit`**. This is leftover debug instrumentation that was cleaned up in two sibling files but not this one, most likely introduced or left behind by the concurrently-editing worker after `gates-final`'s typecheck evidence was captured (mtime drift confirms this). **The final `npm run typecheck` gate must be re-run after this is fixed — the current `EXIT_CODE=0` in `evidence/phase-7/gates-final/typecheck.txt` no longer reflects the tree.**
- **Chrome memoization (`TitleBar`, `TabBar`, `StatusLine`, `Panel`):** all four verdicts are **keep as-is**. `TitleBar`/`StatusLine`/`TabBar`'s `React.memo` is correct, low-risk hygiene (effective for `TabBar`/`StatusLine`, plausibly inert-but-harmless for `TitleBar` depending on `counts`'s referential stability). `Panel`'s deliberate non-memoization is correctly justified — its `children` prop is a fresh JSX tree on every render, so memoizing it would be a no-op. None of the four should be reverted. (Note: `Panel.tsx`'s diff is *not* comment-only as the brief stated — it also adds a real focus-glyph-set change, F-11.)
- **Vendored-patch convention:** `merge-resolver.ts` and `runner.ts` fully follow the `[APERANT-PATCH ...]` + `VENDORED-PATCHES.md` convention. **`models.ts` and `stream-handler.ts` do not** — both are real, well-justified vendored patches with no marker comment and no ledger entry. Close this gap before commit.
- **Should-not-ship:** the `probeHR` dead import in `BoardView.tsx`. Nothing else — no `console.log`, `debugger`, `TODO`/`FIXME`/`XXX`, or other leftover instrumentation found in any of the 20 modified source files.
