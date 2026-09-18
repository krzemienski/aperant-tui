# FINAL-VERDICT.md — Aperant TUI, Phase 5/6/7 audit session

Built read-only from `evidence/phase-6/COVERAGE-MATRIX.md`, `docs/plan/ACCEPTANCE-INVENTORY.md`, `audit-evidence/cycle-01/findings.json`, `audit-evidence/RETRACTION.md`, and direct re-verification against the live `hunter-seed`/`proofpunk-agent` repositories performed while writing this document. Every fact cited below was either read from an existing evidence artifact or independently re-checked against source/git this turn — none is asserted from memory.

## Overall verdict

**The commit-and-push gate is NOT satisfied.** The instruction governing this session was to commit and push only after all required functionality and proof pass. An earlier draft of this document counted seven open items; **P6.2 has since been corrected from UNVERIFIED to PROVEN** (see the P6.2 correction note immediately below), dropping the count to **six**:

1. P6.1b color-rendering dimension — UNVERIFIED (instrument limitation)
2. P5.3 "PR appears on GitHub" — PARTIAL/UNVERIFIED (no real GitHub host touched, by design)
3. Design conformance vs. the named binding specification — BLOCKED (spec files never committed to this repo; substitute authority needs a user decision)
4. **P6.3 — Onboarding on a machine with no `~/.aperant/` — NOT ATTEMPTED.** No cold-start run against an empty `APERANT_USER_DATA` dir exists anywhere in the evidence tree. The cold-start safety of `config-service.ts`/`electron-shim` is argued architecturally in `docs/plan/ACCEPTANCE-INVENTORY.md` section J (P6.3 row), not driven.
5. **P7.1 — 200-task board scrolls at >=60fps — NOT ATTEMPTED.** No 200-task fixture and no fps-measurement harness exist anywhere in this repository (`tools/build-fixture.py` builds 4 specs; a repo-wide search for a 200-task fixture or fps harness returns zero hits).
6. **Three-project linked-workflow gate — NOT MET as literally worded.** The governing requirement was the full linked workflow (roadmap → convert → agent run → work product → lifecycle-persisted-across-restart) driven on at least three real codebases. That full workflow was driven on exactly **one** of three projects (hunter-seed). The other two (proofpunk-agent, awesome-researcher) received only a partial catalog: boot/identity, a 7-tab sweep, roadmap force-regeneration with disk verification, the settings/routing panel, and one Insights Q&A each. No feature was converted to a task, no agent was started, no work product landed, and no restart-persistence was exercised on either of those two projects. See the "Three-project linked-workflow gate" subsection below for the per-project stage table.

**P6.2 correction (superseded item, kept here for the record):** a prior draft of this document listed "P6.2 multi-account credential switch — no second credential" as a blocker. That claim was made without reading the routing configuration and was wrong — two real provider routes are configured in this environment. `evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/` now proves the switch bidirectionally on the same task: activate anthropic → next run resolves anthropic; switch back to moonshot → next run resolves moonshot; switch to anthropic again → next run resolves anthropic again. See "What was PROVEN this session" below for the full account. A new MEDIUM-severity defect, F-18, was found while driving this gate (see that section and "Open findings NOT fixed" for detail) and is tracked separately — it does not reopen P6.2, which passes.

Per §"What is NOT proven" below, none of these six is a discovered application defect — each is either an environmental precondition that cannot be met without operator action, a document-provenance question requiring an explicit decision, or work that was genuinely never attempted this session. But the instruction's gate condition is unmet regardless of why, so the change set is held rather than committed. See §"Commit readiness" for the exact hold state.

**Why this count differs from the ledger's PENDING rows.** `docs/plan/ACCEPTANCE-INVENTORY.md`'s reconciliation table (as corrected for P6.2 and F-18) records 10 rows bucketed PENDING (plus 4 PARTIAL, 1 UNVERIFIED). The 10 PENDING rows are: P2.6 (1), P3.5.5/P3.5.7/P3.5.11 (3), F-10+ (1), F-18 (1, new), P7.1 (1), P8.1/P8.2/P8.3 (3). These do not reconcile 1:1 against the six items above because they answer a different question (every open row in the whole 81-row inventory across all 8 phases) than this document's question (what blocks committing THIS session's Phase 5/6/7 work). Specifically:
- P8.1–P8.3 (3 rows) are legitimately excluded from this session's blocking count: Phase 8 distribution is explicitly out of scope per operator directive this session (see the Phase 8 note below), time-bound rather than a proof gap.
- P2.6 and P3.5.5/P3.5.7/P3.5.11 (4 rows) are inherited PENDING items from Phase 2 and Phase 3.5 — earlier phases this session did not touch or re-attempt. They remain genuinely open in the ledger and are disclosed here for completeness, but they are not new work this session claims to have closed, so they are not counted among the six Phase-5/6/7 blockers above.
- F-10+ (1 row) is an untriaged observation (chat-ask-box escape appears to no-op), not yet classified as a defect with required evidence — it is listed in the ledger as a placeholder investigation, not a proof-gate criterion, so it is carried here as a disclosure rather than a numbered blocker.
- F-18 (1 row, new this correction) is a real, characterized MEDIUM-severity defect (the `a` binding cannot create a second Anthropic-compatible account) — but it does not block the P6.2 gate, which passes via the moonshot/anthropic route pair used for this session's proof. It is disclosed for completeness, not counted as a numbered blocker.
- P6.3 is bucketed **PARTIAL**, not PENDING, in the ledger's own table — it was PARTIAL in the ledger the whole time. This document downgrades it here to NOT ATTEMPTED (stronger than PARTIAL) because no run against it exists at all, architectural argument only.

That accounts for all 10 PENDING + P6.3(PARTIAL): 3 (out-of-scope Phase 8) + 4 (inherited-earlier-phase) + 1 (untriaged F-10+ finding) + 1 (F-18, disclosed, non-blocking) + 1 (P7.1, counted above as blocker #5) = 10, plus P6.3 counted above as blocker #4.

## What was PROVEN this session (with evidence paths)

- **Full linked workflow end-to-end on hunter-seed** — driven against the live local 9router (`http://127.0.0.1:20128/v1`, `glm/glm-5`). `evidence/phase-6/run-20260917T153142-linked-hunter-seed/` (34 captures: boot, roadmap regen, feature→spec conversion, agent start, live swarm/graph/inspect/trace/tokens/waits, real commits through 14/14 subtasks, pre/post-restart persistence). **Corrected from a prior draft's overstatement**: the full linked workflow was NOT also driven end-to-end on proofpunk-agent or awesome-researcher — see the "Three-project linked-workflow gate" subsection immediately below for exactly what those two projects did and did not receive. `evidence/phase-6/run-20260917T153247Z-multiproject/` (25 captures across the other two projects) covers boot/tab-sweep/roadmap-regen/settings/insights only, not the linked chain.

### Three-project linked-workflow gate — NOT met as literally worded

The task's governing requirement was the full linked workflow — roadmap generation → select a generated roadmap item → convert it to a task → run the agent on it → real work product on disk → project checks → lifecycle persisted across restart — driven on at least three real codebases. Reading each project's `captures.json` step list directly (not summaries) gives:

| Stage | hunter-seed (`run-20260917T153142-linked-hunter-seed/hunter-seed/captures.json`, 34 steps) | proofpunk-agent (`run-20260917T153247Z-multiproject/proofpunk-agent/captures.json`, 13 steps) | awesome-researcher (`run-20260917T153247Z-multiproject/awesome-researcher/captures.json`, 12 steps) |
|---|---|---|---|
| Boot / identity | ✅ step 0 `stage1-boot` | ✅ step 0 `boot-identity` | ✅ step 0 `boot-identity` |
| 7-tab sweep | not separately staged (single boot capture) | ✅ steps 1-7 (`tab-board`…`tab-agents`) | ✅ steps 1-7 (`tab-board`…`tab-agents`) |
| Roadmap force-regeneration + disk verification | ✅ steps 1-3 (`stage2-roadmap-pre-regen`, `stage2-streaming-features-50pct`, `stage3-roadmap-complete`) | ✅ steps 8-10 (`roadmap-pre-regen`, `roadmap-pre-regen-clean`, `roadmap-post-regen-idle`) | ✅ steps 8-9 (`roadmap-pre-regen`, `roadmap-post-regen-idle`) |
| Settings / routing panel | ✅ (implicit in agent-start account resolution) | ✅ step 11 `settings-config-panel` | ✅ step 10 `settings-config-panel` |
| Insights Q&A | not staged as a separate step this run | ✅ step 12 `insights-qa-answer` (cites `app.py:194`) | ✅ step 11 `insights-qa-answer` (cites `main.py:1608`) |
| **Convert roadmap item → task spec** | ✅ step 4 `stage4-spec-created-toast` | ❌ absent — no `convert`/`spec-created` step exists in the captures list | ❌ absent — no `convert`/`spec-created` step exists in the captures list |
| **Agent started (`s`)** | ✅ step 5 `stage5-agent-started` | ❌ absent | ❌ absent |
| **Live agent swarm/graph/inspect/trace/tokens/waits** | ✅ steps 6-12 (`stage6-agents-1-swarm-LIVE` … `stage7-logs-view-002symb`) | ❌ absent (step 7 `tab-agents` is only a static tab-sweep screenshot of the empty AGENT SWARM subview, not a live run) | ❌ absent (same — step 7 `tab-agents` is a static tab-sweep only) |
| **Real work product on disk (commits)** | ✅ steps 16-33 — 14/14 subtasks, real commit-by-commit progression to `human_review` | ❌ absent — no work-product step, no commit evidence | ❌ absent — no work-product step, no commit evidence |
| **Lifecycle persisted across restart** | ✅ steps 17-18 (`stage9-pre-restart-backlog2`, `stage9-post-restart-backlog2`) + separately re-proven in `run-20260917T173051-f17-board-status/` (4 steps, cold-restart proof) | ❌ absent — no restart step of any kind in this project's captures | ❌ absent — no restart step of any kind in this project's captures |

**Conclusion: the full linked workflow was driven on 1 of 3 projects (hunter-seed).** proofpunk-agent and awesome-researcher each received five stages only — boot, tab sweep, roadmap regeneration, settings panel, and one Insights Q&A — and are missing all four of: task conversion, agent start, live agent-run evidence, work product on disk, and restart persistence. This is a materially smaller proof than "linked workflow end-to-end on 3 real codebases," and the three-project gate as literally worded is **not met**.

- **Linked workflow driven to TERMINAL state**: 14/14 subtasks, `human_review`. Independently re-verified this turn, not just cited from prior capture:
  - `git log --oneline` in `/Users/nick/dev/hunter-seed/.auto-claude/worktrees/tasks/002-symbolized-crash-triage-with-rich-sanitizer-teleme` shows exactly **14 commits total, 13 `auto-claude:` build commits** since base `bb718fd`.
  - `git diff --stat bb718fd HEAD` in that worktree shows exactly **19 files changed, 2252 insertions(+), 26 deletions(-)**.
  - `python3 -m pytest -q` at HEAD (`eaf5984`): **502 passed, 5 skipped**, 0 failures.
  - `python3 -m pytest -q` at base `bb718fd` (checked out in an isolated clone, real worktree never touched): **429 passed, 5 skipped**, 0 failures.
  - Delta: **73 net new passing tests, 0 pre-existing failures, 0 introduced failures**, skip count unchanged both sides.

- **Insights Q&A citing `proofpunk_agent/app.py:194`** — `evidence/phase-6/run-20260917T153247Z-multiproject/proofpunk-agent/step-13-insights-qa-answer.png.txt` + `insights-qa-verification.json`. Re-verified this turn: `git show HEAD:proofpunk_agent/app.py` in `/Users/nick/proofpunk-agent` shows `class ProofpunkAgentApp(App):` at line 194 exactly. (The working-tree copy has since drifted to line 198 due to unrelated later edits in that separate, actively-developed project — the citation was correct against the committed source at capture time.)

- **Retracted items R1/R2/R3 re-proven with distinctness-asserted captures; R4 re-proven via the fixed settings panel; R5 corrected by green unpiped gates.** `docs/plan/ACCEPTANCE-INVENTORY.md` section G. All 5 remain formally bucketed RETRACTED pending a RETRACTION.md-authorized un-retraction, per the document's own rule — the re-proof evidence is cited, not self-certified.

- **Phase 5 built from nothing and proven**: worktree list exact match (P5.1, `gate-p5.1-result.json`), diff pane real content/focus/scroll, merge guards (self-merge + dirty-tree refusals, `gate-p5new-merge-guards-result.json`), real merge commit `1be7685f8969bca5808749c76aad51d30efb64cd` (`gate-p5new-merge-real-result.json`), AI conflict resolution 3/3 post-fix (`evidence/phase-6/run-20260917T173809Z-f16-redrive/scratch/F-16-redrive-verdict.json`).

- **Phase 6/7**: P6.1a state-application dimension PASS (14-frame theme-cycle sweep, `run-20260917T160211Z-gates/`), **P6.2 multi-account credential switch PASS — bidirectional, corrected from UNVERIFIED** (`evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/`, 9 captures, 0 `secret_hits`; see the dedicated subsection below), P7.2 resize round-trip PASS (`gate-p7.2-result.json`), P7.3 real `kill -9` + respawn PASS (`gate-p7.3-result.json`, 4/4 sub-checks), P7.4 both TERM values PASS (`gate-p7.4-result.json`). **Not PASS and not previously listed here: P6.1b (color-rendering, UNVERIFIED), P6.3 (clean-home onboarding, NOT ATTEMPTED), P7.1 (200-task/60fps, NOT ATTEMPTED)** — see "What is NOT proven" below.

### P6.2 multi-account credential switch — corrected to PASS, bidirectional

A prior draft of this document claimed "only one real provider credential exists in this environment" and marked P6.2 UNVERIFIED on that basis. That claim was made without reading the routing configuration and was wrong: two real provider routes are configured (a moonshot route and an anthropic-compatible route). `evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/` (9 captures, `secret_hits: []` on every single capture) now proves the switch bidirectionally on the same task in the same session:

- Activate the anthropic-compatible account → the next agent run resolves `provider=anthropic` (steps 2-3 confirm the switch via the CONFIG panel and on-disk `globalPriorityOrder` head; steps 3-4 confirm the agent run resolving against it).
- Switch back to the moonshot account → the next agent run resolves `provider=moonshot` (steps 4-6, re-driven with the environment confound described below removed).
- Switch to the anthropic-compatible account a second time → the next agent run again resolves `provider=anthropic` (steps 7-8).

Bidirectional switching on the same task is the discriminating test: either direction alone could pass by coincidence (e.g. a hidden default-account fallback masking a broken switch). Getting the correct provider on both switches, cross-checked against both the live CONFIG panel text and the on-disk priority-order head at every step, rules that out. `~/.aperant/settings.json` was backed up before the test (`~/.aperant/settings.json.bak-20260917T181250Z`) and restored byte-identical afterward (diff exit 0) — the operator's real config was not left mutated.

**Methodology note — a false FAIL was caught and corrected, not an app defect.** The first attempt at this gate produced a false FAIL: the test driver's default environment pinned every requested model to one provider regardless of the active account, traced to `apps/desktop/src/main/ai/config/types.ts:161`'s prefix→provider map, which structurally excluded the other account from the routing queue independent of switch state. Re-running with that environment variable removed produced the true bidirectional result recorded above (captures 5-8, captioned "clean env, no model-provider confound"). This is recorded because it is exactly the class of confound that produces a wrong verdict if not caught — the driver caught its own artifact here rather than silently reporting a false FAIL.

**New defect found during this re-drive: F-18 (MEDIUM, OPEN, not fixed).** The `a` (add-Anthropic) binding in SettingsView cannot create a second Anthropic-compatible account — `provisionAnthropicAccount()` (`apps/tui/src/services/account-service.ts:172`) matches on `provider === 'anthropic'` and overwrites the existing account's credentials/baseUrl in place instead of appending a new one. A user with one Anthropic-compatible router who wants to add a second has no working path via that binding; they must use a different provider slot entirely (which is what this session's bidirectional proof did — moonshot and anthropic, not two anthropic accounts). This is distinct from the P6.2 gate itself, which passes; F-18 is tracked separately in `docs/plan/ACCEPTANCE-INVENTORY.md` section H and is not yet recorded in `audit-evidence/cycle-01/findings.json`.

**Process note — a credential value was briefly visible in an agent transcript this session, not in any persisted artifact.** While investigating routing configuration for the P6.2 re-drive, a routing config was read verbatim in one transcript turn, briefly exposing a credential value in that transcript only. A full-tree sweep for that value and for its 12-character prefix found **zero occurrences** in any persisted artifact (evidence captures, `captures.json` files, findings, or this document) — the exposure was transcript-only and nothing publishable was affected. A redacting reader, `tools/read-model-routes.py`, now exists so routing config can be inspected going forward without this risk: it prints only provider name, baseUrl, api type, a boolean `hasApiKey` flag, and model ids — it never imports, prints, logs, or interpolates the actual key value or any prefix of it anywhere in its code path (confirmed by reading the script directly). This is recorded as a process improvement, not a leak requiring remediation of any shipped artifact.

- **7 defects found and fixed** (`audit-evidence/cycle-01/findings.json`, `docs/plan/ACCEPTANCE-INVENTORY.md` section H). **An 8th, F-18, was found this correction pass and remains OPEN (not fixed)** — see the P6.2 subsection above and "Open findings NOT fixed" below.
  - F-09 — ideation status line frozen (constant string replaced every delta)
  - F-10 — escape did not close the chat ask box
  - F-11 — board focus toggle produced no visible change (color-only signal, invisible to capture)
  - F-12 — board `x` (stop) was a hardcoded flash regardless of real agent state
  - F-13 — footer/help-overlay keybinding advertising gaps
  - F-16 — AI conflict resolution failed on every attempt (`Invalid JSON response`, router SSE-framing mismatch); fixed and **independently re-driven 3/3 post-fix** this session (`F-16-redrive-verdict.json`)
  - F-17 — board task status did not sync from the worktree's real plan file, including after a cold restart; fixed and proven end-to-end (`run-20260917T173051-f17-board-status/`)

- **3 regression gates GREEN, unpiped, run twice** (before and after the F-16/F-17/P6.2/Phase-5 changes): `evidence/gate-recheck-session3/` — `typecheck.txt`/`typecheck-final.txt` exit=0, `test.txt`/`test-final.txt` exit=0 (9/9 tests), `build.txt`/`build-final.txt` exit=0.

- **Evidence integrity**: 145 captures across 7 `captures.json` files, 118 distinct sha256, 0 non-empty `secret_hits`, 663 manifest entries cross-checked (555 hash-verified, 105 no-hash-field older schema, 0 genuine mismatches, 3 pre-existing missing files unrelated to this session), private-source leak in `evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/` redacted (65 `[REDACTED: ...]` markers across `agent-events.jsonl`, `work-product.diff`, `0001-...patch`) and reconfirmed unchanged this pass.

## What is NOT proven — the blockers

1. **P6.1b color-rendering dimension — UNVERIFIED.** (Note: `docs/plan/ACCEPTANCE-INVENTORY.md` section J splits the original single P6.1 row into P6.1a, state-application — PROVEN — and P6.1b, color-rendering — UNVERIFIED. This document's prior draft cited the pre-split "P6.1" label; corrected here to P6.1b.) No instrument in this environment can observe per-cell ANSI/SGR color. Three independent instruments exhausted: tuistory PNG capture (every PNG this session contains only 31-37 colors, all exactly tuistory's fixed renderer defaults `#1a1b26`/`#c0caf5`, zero theme hex values of any kind), tuistory `--fg`/`--bg` snapshot filters (returned empty even for definitely-present black/white), raw `script -F` capture bypassing tuistory entirely with `TERM=xterm-256color`+`COLORTERM=truecolor` forced (7681 real bytes, zero SGR color escapes of any kind). A positive control (focus-border glyph swap) proved the capture pipeline **can** detect real changes when they occur, ruling out a wholly broken instrument as the explanation. This is an instrument limitation in the tmux-nested-PTY→tuistory-PNG conversion chain, explicitly **NOT an app defect** (`F-15-instrument-adjudication.json`, self-labeled `not_filed_as_new_defect`). **Needed:** a capture path that preserves SGR color codes through the full chain, or a different terminal-capture tool.

2. **P5.3 "PR appears on GitHub" — PARTIAL (bucketed PARTIAL in `ACCEPTANCE-INVENTORY.md`, treated as a blocking UNVERIFIED item here).** The push mechanism itself is now PASS: re-driven against a real local bare git remote (`git init --bare` + `git remote add origin`, entirely local, no GitHub host ever touched) — `git push --set-upstream origin <branch>` succeeded, independently verified on the remote side (`F-16-redrive-pr-local-origin-result.json`). `gh pr create` then correctly and honestly failed because the local bare repo has no GitHub association. Only the final "appears on GitHub" claim is unverified, and deliberately so — it requires pushing a scratch branch to a real GitHub remote, which was not authorized this session. **Needed:** explicit authorization to push a disposable/scratch branch to a real GitHub remote.

3. **Design conformance vs. the named binding specification — BLOCKED.** Both `aperant-tui-specification.md` and `aperant-agent-observability-spec.md` are named as the binding spec in `BRIEF.md:9-10` and `phase-3.5-PLAN.md:3` respectively, and both were verified **never committed** to this repository at any point — checked via `git log --all --full-history`, `--diff-filter=D`, `--follow`, and full reflog across all 30 commits on the single `main` branch (no tags). The substitute authority available is `ROADMAP.md`'s own gate table (self-labeled "verbatim from spec") plus `phase-3.5-PLAN.md`'s own gate-mapping table — everything in this evidence set is measured against that substitute, not the named originals. **Needed:** a user decision on whether the substitute text is accepted as binding, or the original spec documents supplied.

4. **P6.3 — Onboarding on a machine with no `~/.aperant/` — NOT ATTEMPTED.** ROADMAP.md:15 requires "Onboarding completes on a machine with no `~/.aperant/` and ends in a working board." A repo-wide search for `APERANT_USER_DATA` (the env var that would point at an alternate/empty data dir), for `clean.?home`/cold-start language, and for any onboarding-specific run directory under `evidence/` returns **zero hits for a cold-start run**. What exists instead is an architectural argument only, in `docs/plan/ACCEPTANCE-INVENTORY.md`'s P6.3 row (section J): `config-service.ts:29` returns Zod defaults when the config path doesn't exist, and `libs/electron-shim/index.js:36-48` creates `userData`/`logs`/etc. directories on demand — both read from source, neither exercised by a live cold-start run against an empty `APERANT_USER_DATA`. The ledger's own text is explicit that this is not equivalent evidence: Phase 4's vigil run started with no `.auto-claude/` and is offered as a *related* cold-start data point for the roadmap/board surface, but the ledger itself says it "is not framed or evidenced as an explicit 'no `~/.aperant/`'" run. **Needed:** an actual run with `APERANT_USER_DATA` pointed at a fresh empty directory, driven through boot to a rendered board.

5. **P7.1 — 200-task board scrolls at >=60fps — NOT ATTEMPTED.** ROADMAP.md:16 requires this exact claim. A repo-wide search for `200-task`, `60fps`/`>=60fps`, and `fps` measurement code returns zero hits anywhere in `evidence/` or `tools/`. `tools/build-fixture.py` (read directly) builds exactly 4 task specs (`001-migrate-provider-registry` … `004-qa-loop-docs`), two orders of magnitude short of 200, and contains no scroll-timing or frame-rate instrumentation at all. This is not a partially-attempted or blocked item — nothing toward it exists in this repository. **Needed:** a 200-task fixture generator and an fps-measurement harness, neither of which currently exist.

6. **Three-project linked-workflow gate — NOT MET as literally worded.** See the "Three-project linked-workflow gate" subsection under "What was PROVEN" above for the full per-project stage table. Summary: the full workflow (roadmap → convert → agent run → work product → restart-persisted) was driven end-to-end on hunter-seed only. proofpunk-agent and awesome-researcher each received boot, a 7-tab sweep, roadmap force-regeneration, the settings/routing panel, and one Insights Q&A each — five stages, none of which include conversion, agent execution, work product, or restart persistence. **Needed:** driving the full conversion→agent→work-product→restart chain on at least two additional projects beyond hunter-seed.

**Not a blocker, noted for completeness:** Phase 8 (`npm i -g @aperant/tui` on clean macOS/Ubuntu/WSL2) is **OUT OF SCOPE** per explicit operator directive this session, time-bound rather than a failure — it reverts to ordinary PENDING if the directive is lifted.

**Disclosed but not counted as a Phase-5/6/7 blocker (inherited from earlier phases, untouched this session, or non-blocking new findings):** P2.6 (Phase 2's own gate instance of "agent stream shows real phase output" was never itself closed, though the capability is proven elsewhere per `ACCEPTANCE-INVENTORY.md` section C), P3.5.5/P3.5.7/P3.5.11 (context-wait threshold not reached, cache-hit endpoint returned 0, no SpawnSubagent traffic occurred — Phase 3.5, section E), F-10+ (untriaged observation that escape may not close the chat ask box — section H), and F-18 (the `a` binding cannot create a second Anthropic-compatible account — a real, characterized MEDIUM defect, but it does not block P6.2, which passes via the moonshot/anthropic pair used for this session's proof — section H). These remain open in the full 81-row ledger and are listed here for completeness per the reconciliation note above, but this session did not attempt to close them (or, for F-18, did not need to close it to pass the gate it was found under) and they are not counted among the six numbered blockers.

## Open findings NOT fixed (report only)

- **F-18 — `a` (add-Anthropic) binding cannot create a second Anthropic-compatible account.** `provisionAnthropicAccount()` (`apps/tui/src/services/account-service.ts:172`) matches on `provider === 'anthropic'` and overwrites the existing account in place instead of appending. Found during the P6.2 multi-account re-drive (`evidence/phase-6/run-20260917T181250Z-p62-multiaccount/hunter-seed/`). Severity MEDIUM, screen: settings. Does not block P6.2, which was proven via the moonshot/anthropic route pair rather than two Anthropic-compatible accounts. Not fixed this session; not yet added to `audit-evidence/cycle-01/findings.json`.

- **Context-overshoot anomaly.** The agent's compaction mechanism has a documented 90% context-pressure trigger, but was observed repeatedly firing far past that threshold — up to **739.7%** with the step counter still incrementing and no compaction reset (`hunter-seed/step-32-anomaly-ctx-740pct-extreme.png`, `run-20260917T153142-linked-hunter-seed/hunter-seed/captures.json:503-504`). Three escalating observations recorded (90%+2min blocked, 601.2%, 739.7%). Always self-resolved eventually; the run never hung and reached TERMINAL state. Real finding, not chased or fixed this session — out of scope per task instructions to flag rather than diagnose.

- **tuistory upstream bug.** `capture-frames` truncates stdout at exactly **65536 bytes** when its output is piped via `subprocess.run` — confirmed independently on two separate projects (`run-20260917T153247Z-multiproject/awesome-researcher/streaming-distinctness.json:13`, `run-20260917T153247Z-multiproject/proofpunk-agent/streaming-distinctness.json:12`). Worked around this session by redirecting to a file instead of a pipe. Worth reporting upstream to the tuistory maintainers.

- **MCP module-resolution crash.** A side-channel MCP server, `auto-claude-mcp-server.js`, failed to load with `MODULE_NOT_FOUND` during agent start (`run-20260917T153142-linked-hunter-seed/hunter-seed/captures.json:88`). The main agent proceeded and the run completed successfully, but this same failure independently killed one earlier task attempt in this session's history. Not root-caused or fixed here.

## Commit readiness

The change set is staged-ready but **withheld**, pending resolution of the six blockers above. All three regression gates (typecheck, test, build) are green, unpiped, confirmed twice — the code is not broken; the gate condition is about proof completeness, scope coverage, and spec-authority ambiguity, not code health. It can be committed the moment the operator either (a) accepts the substitute spec authority (`ROADMAP.md` + `phase-3.5-PLAN.md`) as binding, and (b) explicitly waives or separately schedules each of: the color-rendering instrument limit (P6.1b), GitHub PR push authorization (P5.3), the not-attempted clean-home onboarding run (P6.3), the not-attempted 200-task/60fps harness (P7.1), and the two-project shortfall on the three-project linked-workflow gate. (P6.2, the multi-account credential gap, is no longer a blocker — it is PROVEN as of the P6.2 correction above.)

**Should stage:**
```
VENDORED-PATCHES.md
apps/desktop/src/main/ai/runners/merge-resolver.ts
apps/desktop/src/main/ai/session/runner.ts
apps/tui/src/components/HelpOverlay.tsx
apps/tui/src/components/Panel.tsx
apps/tui/src/components/StatusLine.tsx
apps/tui/src/services/account-service.ts
apps/tui/src/services/agent-start-service.ts
apps/tui/src/services/roadmap-service.ts
apps/tui/src/services/worktree-actions.ts          (new file)
apps/tui/src/views/BoardView.tsx
apps/tui/src/views/InsightsView.tsx
apps/tui/src/views/RoadmapView.tsx
apps/tui/src/views/SettingsView.tsx
apps/tui/src/views/WorktreeView.tsx
audit-evidence/cycle-01/findings.json
audit-evidence/RETRACTION.md                        (new file)
audit-evidence/cycle-01/functional-evidence/         (new dir)
audit-evidence/cycle-01/ux-reports/                  (new files)
tools/tuistory_drive.py
tools/prove-linked-workflow.py                       (new file)
tools/read-model-routes.py                           (new file, redacting routing-config reader)
docs/plan/ACCEPTANCE-INVENTORY.md                    (new file)
evidence/gate-recheck-session3/                      (new dir)
evidence/phase-6/                                    (new dir, incl. COVERAGE-MATRIX.md, FINAL-VERDICT.md)
evidence/phase-5/run-20260917T003750-tuistory-linked/MANIFEST.json
evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/agent-events.jsonl
evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/work-product.diff
evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/0001-auto-claude-Complete-subtask-1-1-bs4-HTML-link-extra.patch
evidence/phase-5/run-20260917T003750-tuistory-linked/REDACTION-NOTE.md
```

**Should exclude:**
```
.agents/
.claude/
.omp/
banks/
repomix-output.xml
skills-lock.json
```

No commits or staging performed by this session, per instruction.

---
*Generated by read-only recon plus direct re-verification against live source/git this turn. No source file was edited to produce this document.*
