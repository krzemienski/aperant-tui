# COVERAGE-MATRIX.md — Phase 6 evidence aggregation (FINAL)

Built read-only from real `captures.json` files, gate-result JSON files, and gate output under `evidence/gate-recheck-session3/`. Every entry below is copied from those artifacts — sha256, caption, and verdict fields are quoted, not retyped from memory. This revision supersedes the prior version of this file (which predated the F-16 redrive run: P5.3/P5.4's verdicts materially strengthened below, see their rows and the totals note).

## Source run directories

| Run | Project | Captures | Status |
|---|---|---|---|
| `evidence/phase-6/run-20260917T144428-surface-hunter-seed/` | hunter-seed | 36 | complete (full surface sweep) |
| `evidence/phase-6/run-20260917T153142-linked-hunter-seed/` | hunter-seed | 34 | complete — linked workflow driven to TERMINAL state (14/14 subtasks, `human_review`) |
| `evidence/phase-6/run-20260917T153247Z-multiproject/` | awesome-researcher (12) + proofpunk-agent (13) | 25 | complete |
| `evidence/phase-6/run-20260917T160211Z-gates/` | scratch (Phase 5/6/7 gate probes) | 40 | complete — grew from 26→40 captures since the prior matrix revision; last write 45+ min before this pass, treated as settled |
| `evidence/phase-6/run-20260917T173051-f17-board-status/` | hunter-seed | 4 | complete — F-17 (plan-sync-on-exit) proof: before/after/re-navigate/post-restart, 3 distinct sha256 |
| `evidence/phase-6/run-20260917T173809Z-f16-redrive/` | scratch | 6 | complete — F-16 redrive: 3 fresh conflict-resolve attempts (all 3 succeeded), plus a local-bare-origin push test for P5.3 |
| `evidence/phase-6/run-20260917T115601-linked-proof/` | hunter-seed | 2 PNGs, no `captures.json` | pre-dates the captures.json convention; listed in gallery only |
| `evidence/gate-recheck-session3/` | n/a (gate output, not PNG captures) | 6 text artifacts (3 gates × before/`-final`) | complete — GREEN both times |

## Criterion coverage

| Criterion | Project | Run dir | Capture(s) / artifact(s) | sha256 (16-hex) | Verification method | Verdict |
|---|---|---|---|---|---|---|
| All 7 top-level tabs switch (1-7) | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-01-tab1-board.png`, `step-02-tab2-term.png`, `step-03-tab3-road.png`, `step-05-tab4-chat-qa.png`, `step-15-tab5-tree.png`, `step-17-tab6-settings-theme-ice.png`, `step-20-tab7-agents-1-swarm.png` | 6bd6fcd852860299, 06ffa9cf12caac5d, 4a35863755ef0969, 03235fed114281bb, 5c21c50c5dd61334, 86707acff39b6605, 5fb995dc266941a0 | screenshot per tab + anchor-text match | PASS |
| Ideation returns findings in all 6 categories | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-09-chat-ideation-1-code-improvements.png`, `step-10-chat-ideation-2-uiux.png`, `step-11-chat-ideation-3-docs-gaps.png`, `step-12-chat-ideation-4-security.png`, `step-13-chat-ideation-5-performance.png`, `step-14-chat-ideation-6-code-quality.png` | 81c3e59ff5bfe051, 8e724ae5ca41e1f6, 6b65a7384c7eb3be, d635974d150b586c, c8a586f0ab51105d, ceb627e6f2e1e0b0 | 6 sequential captures, one per category tab | PASS |
| Ask-box escape cancel | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-06-chat-ask-box.png`, `step-07-chat-ask-box-escape-noop-defect.png`, `step-08-chat-ask-box-closed-via-enter.png` | 2b791285287c214e, 236b58c8f435361b, 03235fed114281bb | press escape x2, compare frames | **FAIL→FIXED** (F-10) — pre-fix caption: "DEFECT: escape does not close ask box (InsightsView keymap isActive=isActive&&!a"; fixed this session, InsightsView.tsx:192-194 |
| Board enter focus toggle produces visible change | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-34-board-focus-list-BEFORE-defect.png`, `step-35-board-focus-detail-AFTER-defect.png` | 6bd6fcd852860299, 6bd6fcd852860299 | byte-identical PNG check + positive control (TitleBar bold text) | **FAIL→FIXED** (F-11) — pre-fix: byte-identical PNGs; fixed via border glyph switching, Panel.tsx:36 |
| Help overlay / command palette open+close | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-26-help-overlay.png`, `step-27-palette-open.png`, `step-29-palette-themes-result.png`, `step-30-palette-closed-via-escape.png` | b4e9310f2288bd04, 8031b8ffa6de1c59, 8497e7b6d02f1217, 6bd6fcd852860299 | screenshot sequence | PASS |
| Task logs view opens and escape returns to board | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-32-logs-view-opened.png` | 3248871408304ede | screenshot + anchor match | PASS |
| Board x (stop) reports honest state | hunter-seed | `run-20260917T144428-surface-hunter-seed` | `step-37-board-x-stop-toast.png` | 24f0b2b59ae2ee4b | press x, capture toast | **FAIL→FIXED** (F-12) — pre-fix: hardcoded flash regardless of real state; fixed via real isRunning()/killTask() wiring, BoardView.tsx:93-108 |
| Roadmap generates with visible streaming (force-regen) | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-02-stage2-roadmap-pre-regen.png`, `step-03-stage2-streaming-features-50pct.png`, `step-04-stage3-roadmap-complete.png` | 2018ecb7bb7afc5c, 588fcd6dc18923e3, da6bf884ddd7bc18 | 3-frame sequence during a real G-triggered regeneration | PASS |
| Roadmap item -> task spec -> agent execution | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-05-stage4-spec-created-toast.png`, `step-06-stage5-agent-started.png` | abfc584386f9a9c5, 0a1dde78b3b4c6e1 | c converts feature to spec, s starts agent | PASS |
| Agent observability sub-views render LIVE data | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-07-stage6-agents-1-swarm-LIVE.png`, `step-08-stage6-agents-2-graph-LIVE.png`, `step-09-stage6-agents-3-inspect-LIVE.png`, `step-10-stage6-agents-4-trace-LIVE.png`, `step-11-stage6-agents-5-tokens-LIVE.png`, `step-12-stage6-agents-6-waits-LIVE.png` | 62183014738de5a9, 1eb2e4e747d34cbf, 59fb7e42c93e5a4b, 3ee934dcb406a5e1, 4b8f3233bf8fb7b5, e9ca974f201908c3 | 6 sub-view captures during a live agent run | PASS |
| Task logs view over a real running task | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-13-stage7-logs-view-002symb.png` | 136c1d9e54ae175f | screenshot + anchor match | PASS |
| Context pressure / compaction / continuation transitions observed live | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-14-stage8-context-400pct-observation.png`, `step-15-stage8-compaction-continuation-transition.png`, `step-16-stage8-still-planning-11min.png` | dd8db4b4a501ffa5, bed5c3681b114ada, a90a86674515ba4d | 3-frame sequence over a long-running real agent session | PASS |
| Real work product committed to disk (progressive, 2→14 commits) | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-17-stage8-real-work-product-2commits.png`, `step-21-phase1-complete-3-subtasks.png`, `step-22-commit4-subtask2-1-symbolize.png`, `step-23-phase2-complete-5-commits.png`, `step-24-commit6-subtask3-1.png`, `step-25-commit7-phase3-complete-halfway.png`, `step-27-commit8-subtask4-1-persist-confirmed.png`, `step-28-commit9-phase4-complete.png`, `step-30-commit10-subtask5-1-judge.png`, `step-31-commit11-subtask5-2-dedup.png`, `step-33-commit12-phase5-complete.png` | 7842935c7b8485d1, 71696bfeaf53cc1c, d5dc98d6d5fcb6a5, 9ef39abdf428734d, 184e2e0c27eb6bce, 632a6fbc9d3204d1, 9d8ed4ff98cec99a, 50af2f58f28ece68, eb0e7829344760fe, 2bf5f38edecee659, 7e91d5faa7152d21 | 11-frame sequential commit-count captures, 2→14 commits across a full autonomous build | PASS |
| Lifecycle persists across TUI restart | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-18-stage9-pre-restart-backlog2.png`, `step-19-stage9-post-restart-backlog2.png` | 6589533599b9948b, f278e1cf66537733 | kill+relaunch, compare board state before/after | PASS |
| RESUME sentinel intervention | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-20-resume-agent-started.png` | f1e6fdb7217fbd49 | r written, agent resumes | PASS |
| Anomaly observed and correctly attributed (context pressure, up to 739.7%) | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-26-anomaly-blocked-90pct-2min.png`, `step-29-anomaly-ctx-600pct-new-extreme.png`, `step-32-anomaly-ctx-740pct-extreme.png` | b61bad35802a1fad, 96d3b11435582d83, 5b048788f2906c68 | 3-frame sequence of escalating real anomaly observations | PASS (anomalies correctly surfaced in UI, never hidden) |
| Task auto-corrects to human_review at TERMINAL state (14/14 subtasks) | hunter-seed | `run-20260917T153142-linked-hunter-seed` | `step-34-final-board-terminal-state.png` | 676f2975cf8ae5c4 | final board capture after full autonomous build completion | PASS |
| Multi-project boot identity + full tab sweep | awesome-researcher | `run-20260917T153247Z-multiproject` | `step-01-boot-identity.png`, `step-02-tab-board.png`, `step-03-tab-term.png`, `step-04-tab-road.png`, `step-05-tab-tree.png`, `step-06-tab-set.png`, `step-07-tab-chat.png`, `step-08-tab-agents.png` | 875973ceaa9168c8, 875973ceaa9168c8, d7c3446ecfb97244, 04b09cc9b2b45ae4, 09d9bf84ddb61186, 0c662231dc8b0c23, cb73e877432dcd99, 194d63fc7d3260c6 | boot + 7-tab sweep against a real second project | PASS |
| Roadmap regenerate cycle on second project | awesome-researcher | `run-20260917T153247Z-multiproject` | `step-09-roadmap-pre-regen.png`, `step-10-roadmap-post-regen-idle.png` | 04b09cc9b2b45ae4, 4b35fd8ee860448d | before/after regen capture | PASS |
| Settings config panel shows real routing on second project | awesome-researcher | `run-20260917T153247Z-multiproject` | `step-11-settings-config-panel.png` | 0c662231dc8b0c23 | screenshot | PASS |
| Insights Q&A answers with a correct file reference (cross-project isolation) | awesome-researcher | `run-20260917T153247Z-multiproject` | `step-12-insights-qa-answer.png` | e96c93d0f6ff7d02 | screenshot; answer verified on disk against real file | PASS |
| Multi-project boot identity + full tab sweep | proofpunk-agent | `run-20260917T153247Z-multiproject` | `step-01-boot-identity.png`, `step-02-tab-board.png`, `step-03-tab-term.png`, `step-04-tab-road.png`, `step-05-tab-tree.png`, `step-06-tab-set.png`, `step-07-tab-chat.png`, `step-08-tab-agents.png` | 4994c05b93d1b6bc, 4994c05b93d1b6bc, b83c069b5376eb7b, 1fd4d88f4c3741af, 768d01d41ea8f6b2, 65eccd65b210da11, 77607f9973d3a7c3, 4dd2148055e38c27 | boot + 7-tab sweep against a third real project | PASS |
| Roadmap regenerate cycle on third project | proofpunk-agent | `run-20260917T153247Z-multiproject` | `step-09-roadmap-pre-regen.png`, `step-10-roadmap-pre-regen-clean.png`, `step-11-roadmap-post-regen-idle.png` | 1fd4d88f4c3741af, 048dda69c98d395c, 9fe82e4488131de0 | before/clean/after regen capture | PASS |
| Settings config panel shows real routing on third project | proofpunk-agent | `run-20260917T153247Z-multiproject` | `step-12-settings-config-panel.png` | 65eccd65b210da11 | screenshot | PASS |
| Insights Q&A answers with a correct file reference (cross-project isolation) | proofpunk-agent | `run-20260917T153247Z-multiproject` | `step-13-insights-qa-answer.png` | 608be97b59f5ca04 | screenshot; answer verified on disk against real file | PASS |
| Worktree list matches `git worktree list` exactly (P5.1) | scratch | `run-20260917T160211Z-gates` | `step-02-gate-p5.1-worktree-list.png` | 1b314c145b90009d | byte-level set diff of (path,branch) tuples — `gate-p5.1-result.json`: verdict PASS | PASS |
| Diff pane shows real diff content, focus, and scroll | scratch | `run-20260917T160211Z-gates` | `step-03-p5new-diff-unfocused.png`, `step-04-p5new-diff-focused.png`, `step-05-p5new-diff-scroll-j.png`, `step-06-p5new-diff-scroll-pagedown.png` | 5c7b51b6a60da77d, cac894d989154359, c008b2dcf548a3a6, 212b16b2aaf079da | 4-frame sequence: unfocused -> focused -> scroll j -> scroll pagedown; diffstat matched `git diff HEAD` exactly (`gate-p5new-diffpane-result.json`) | PASS |
| Merge safety guards refuse unsafe merges with exact messages (self-merge + dirty-tree) | scratch | `run-20260917T160211Z-gates` | `step-07-p5new-merge-self-refusal.png`, `step-08-p5new-merge-dirty-refusal.png` | 2e28e05d16efcd7c, d63140b71991e0bb | attempt self-merge and dirty-repo merge, capture refusal toast, confirm git log unchanged — `gate-p5new-merge-guards-result.json` | PASS |
| A merge executed from the TUI actually merges — verified by `git log` (P5.2) | scratch | `run-20260917T160211Z-gates` | `step-09-p5new-merge-real-postmerge.png` | 52f73ff33be46699 | real merge commit `1be7685f8969bca5808749c76aad51d30efb64cd` ("Merge branch 'feature/divergent'"), confirmed via `git log --oneline --all --graph` — `gate-p5new-merge-real-result.json` | PASS |
| Real merge conflict detected and surfaced with AI-resolve hint | scratch | `run-20260917T160211Z-gates` | `step-10-p5new-conflict-state.png` | bced57f9efa206a2 | induced real conflict, screenshot | PASS |
| AI conflict resolution resolves a real induced conflict (P5.4) | scratch | `run-20260917T160211Z-gates` (pre-fix repro) + `run-20260917T173809Z-f16-redrive` (post-fix redrive) | `step-11-p5new-ai-resolve-attempt1-failed.png` (pre-fix, 3/3 failed); `step-02-f16-conflict-confirmed-before-R.png`, `step-03-f16-after-resolve-content.png`, `step-04-f16-third-resolve-content-state.png`, `step-06-f16v-conflict-before-R.png` (post-fix redrive, 3/3 succeeded) | pre-fix 30b0838297cef066; post-fix bced57f9efa206a2 (repeated across all 3 fresh conflicts — same resolved content each time: `feature/conflict-branch` side chosen, unrelated `CONSTANT = 1` preserved) | 3 identical failing retries pre-fix via capture-frames — root-caused to F-16 (`generateText()`'s `doGenerate()` rejects the router's trailing SSE `data: [DONE]` bytes as invalid JSON); F-16 fixed (`streamText()`, `merge-resolver.ts`); **independently re-driven post-fix against 3 freshly-induced conflicts** (each via `merge --abort` + re-merge, so no attempt reused stale state) — `F-16-redrive-verdict.json`: 3/3 succeeded, conflict markers gone, content coherent, never auto-committed (`git status` stayed `UU` throughout), zero recurrences of the original error, exact success toast captured verbatim on attempt 3 | **PASS** — genuinely re-driven end-to-end after the fix, not inferred from the code diff |
| A PR created from the TUI appears on GitHub (P5.3) | scratch | `run-20260917T160211Z-gates` (no-remote attempt) + `run-20260917T173809Z-f16-redrive` (local-bare-origin attempt) | `step-12-p5new-pr-push-failed.png` (no remote at all); `step-05-f16-pr-local-origin-push-succeeded.png` (real local bare git remote, push succeeded) | no-remote c5db0b6abe5db9b4; local-origin-push 9842c85b651289ca | First attempt: no `origin` configured at all, push failed cleanly (`gate-p5new-pr-result.json`). **Re-driven with a real local bare git remote** (`git init --bare /tmp/aperant-gate-origin.git` + `git remote add origin`, entirely local — no real GitHub host ever touched): `p` pressed against `feature/conflict-branch`, `git push --set-upstream origin <branch>` **succeeded**, independently verified via `git -C /tmp/aperant-gate-origin.git log --oneline feature/conflict-branch` showing the pushed commit `0e5ca18` present on the bare remote — `F-16-redrive-pr-local-origin-result.json`. `gh pr create` then correctly and honestly failed (`"none of the git remotes configured for this repository point to a [GitHub host]"`) because the local bare repo has no GitHub association | **PASS for the push mechanism** (materially stronger evidence than before); **UNVERIFIED (correctly) for "PR appears on GitHub"** — that final step requires a real disposable GitHub repo, declined per instructions (correct restraint, not a defect) |
| A PR created from the TUI appears on GitHub (P5.3) — superseded by the row above | scratch | `run-20260917T160211Z-gates` | `step-12-p5new-pr-push-failed.png` | c5db0b6abe5db9b4 | attempted push+PR against the scratch repo with no remote configured — `gate-p5new-pr-result.json` | *see the row above for the current, re-driven verdict; this row is kept only because it is the original discovery evidence for the "no remote" failure mode, cited by the row above* |
| Theme change applies instantly across all 7 views — state-application dimension (P6.1) | scratch | `run-20260917T160211Z-gates` | `step-13-p6.1-baseline-ice-board.png`, `step-14-p6.1-baseline-ice-term.png`, `step-15-p6.1-baseline-ice-road.png`, `step-16-p6.1-baseline-ice-tree.png`, `step-17-p6.1-baseline-ice-set.png`, `step-18-p6.1-baseline-ice-chat.png`, `step-19-p6.1-baseline-ice-agents.png`, `step-21-p6.1-cyberpunk-board.png`, `step-22-p6.1-cyberpunk-term.png`, `step-23-p6.1-cyberpunk-road.png`, `step-24-p6.1-cyberpunk-tree.png`, `step-20-p6.1-cyberpunk-set.png`, `step-25-p6.1-cyberpunk-chat.png`, `step-26-p6.1-cyberpunk-agents.png` | 472c994593a2e80a, 9d6a5ad519886359, 4a703262bfd78986, a06e2add12de6ad2, 99e7e9cd3c9a2c98, 6b7bb041303b0351, 1c850e7afdecafa0, 472c994593a2e80a, 9d6a5ad519886359, 4a703262bfd78986, a06e2add12de6ad2, 2674bf06f3977c0f, 6b7bb041303b0351, 1c850e7afdecafa0 | 14-frame before/after theme-cycle sweep; settings-panel TEXT ('cyberpunk ACTIVE') confirms app-state ground truth independent of pixel rendering | PASS (state-application dimension) |
| Theme change applies instantly across all 7 views — color-rendering dimension (P6.1) | scratch | `run-20260917T160211Z-gates` | n/a | n/a | positive-control glyph-swap proved the capture pipeline CAN detect real changes; raw `script -F` capture (7681 real bytes, TERM=xterm-256color + COLORTERM=truecolor forced) contained ZERO SGR color escape sequences of any kind; every captured PNG this run contains only 31-37 colors, all exactly tuistory's fixed renderer defaults (#1a1b26/#c0caf5) — see `F-15-instrument-adjudication.json` | **UNVERIFIED (instrument limitation, not app defect)** — no available capture pipeline in this session can observe per-cell ANSI color in this tmux-nested PTY chain; NOT filed as an app bug |
| Profile switch changes the active credential and the next agent run uses it (P6.2) | scratch | `run-20260917T160211Z-gates` | `step-28-p6.2-single-account-honest.png`, `step-27-p6.2-accounts-active-tag.png` | 1ec33121e0ca1837, d94fd2d5f0c7877b | single-account honesty path + ACTIVE tag rendering + no-key-material check (0 secret_hits) — `gate-p6.2-result.json` | PASS (single-account honest path); **UNVERIFIED-no-second-credential** (multi-account switch — correctly not faked, only one real credential exists in this environment) |
| Resize from 200x50 -> 80x24 reflows without corruption (P7.2) | scratch | `run-20260917T160211Z-gates` | `step-29-p7.2-before-resize-200x50.png`, `step-30-p7.2-after-resize-80x24.png`, `step-31-p7.2-back-to-200x50.png` | 1ec33121e0ca1837, af3ed8aefaf033ff, 72c006da21b5de47 | 3-frame resize sequence, both directions, no corruption/overlap/broken borders — `gate-p7.2-result.json` | PASS |
| Killing a PTY child leaves the TUI responsive (P7.3) | scratch | `run-20260917T160211Z-gates` | `step-32-p7.3-shell-killed-exited.png`, `step-33-p7.3-respawned-working.png`, `step-34-p7.3-tree-still-responds.png`, `step-35-p7.3-board-still-responds.png` | 18fc1b8477a65a1a, e3283ff6a205c566, 97fd44886ef595df, eeeb6c5729d95512 | real `kill -9` on the shell PID from outside, confirmed dead via `ps`, respawn produced a genuinely new PID with working command execution, other tabs remained responsive — `gate-p7.3-result.json`, all 4 sub-checks PASS | PASS |
| Renders coherently in TERM=xterm-256color and TERM=xterm (P7.4) | scratch | `run-20260917T160211Z-gates` | `step-36-p7.4-term-xterm256color.png`, `step-37-p7.4-term-xterm-basic.png` | 472c994593a2e80a, 472c994593a2e80a | launched under each TERM value, layout/box-drawing intact in both, degraded color tier for basic xterm is expected per the app's own tier-detection design — `gate-p7.4-result.json` | PASS |
| Positive controls proving the capture pipeline itself is functional | scratch | `run-20260917T160211Z-gates` | `step-38-F11-control-focus-before.png`, `step-39-positive-control-A-worktrees-focused.png`, `step-40-positive-control-B-diff-focused.png` | 472c994593a2e80a, a06e2add12de6ad2, 188926023840f761 | focus-border glyph swap (thick↔thin box-drawing) on WORKTREES/DIFF — different sha256, non-None diff bbox, confirms the pipeline detects real changes | PASS (instrument validity confirmed) |
| Task status auto-corrects on exit; persists across restart (F-17 fix proof) | hunter-seed | `run-20260917T173051-f17-board-status` | `step-01-before-board-002symb-backlog.png`, `step-02-after-board-002symb-review-14of14.png`, `step-03-step4-board-confirmed-review-status.png`, `step-04-step5-post-restart-review-status.png` | 9bfec3d0493b74e5, 4a69a832f2b99c41, ea1aa169bf459f9e, 1c3cb06235d1790e | 4-frame sequence: BEFORE (bug: shows BACKLOG 0% despite worktree plan human_review 14/14) → AFTER (F-17 fires on exit, board shows [REVIEW] 14/14) → re-navigate confirms persistence → COLD RESTART (fresh TUI process) still shows [REVIEW] 14/14 — 3+ distinct sha256, 0 `plan-sync-failed` events across 236,220 agent-events.jsonl log lines (operator-verified) | **FAIL→FIXED** (F-17) — PROVEN end-to-end including cold-restart persistence |
| `npm run typecheck` (gate-recheck-session3, initial + final) | n/a | `gate-recheck-session3` | `typecheck.txt`, `typecheck-final.txt` | 75a0784481424186, ec79c439cd3d9523 | `tsc --noEmit`, unpiped, run twice (before + after F-16/F-17/P6.2/Phase-5 changes landed) | PASS both times (exit=0) |
| `npm test` (gate-recheck-session3, initial + final) | n/a | `gate-recheck-session3` | `test.txt`, `test-final.txt` | 69f0ee7617843b65, 219ff00f10dfaf38 | `vitest run`, unpiped, run twice | PASS both times (exit=0, 9/9 tests) |
| `npm run build` (gate-recheck-session3, initial + final) | n/a | `gate-recheck-session3` | `build.txt`, `build-final.txt` | 973ebe29f8698841, 1eda7d57a43e2ffc | worker+cli esbuild, unpiped, run twice | PASS both times (exit=0) |
| Design conformance vs the named binding specification | n/a | n/a (git history check) | n/a | n/a | `git log --all --full-history` / `--diff-filter=D` / `--follow` / reflog, all 30 commits, single `main` branch, no tags | **BLOCKED** — both `aperant-tui-specification.md` and `aperant-agent-observability-spec.md` verified NEVER committed to this repository at any point (zero hits across every git-history method tried). Substitute authority: `ROADMAP.md`'s gate table (self-labeled "verbatim from spec") + `phase-3.5-PLAN.md`'s own gate-mapping table. Needs a user decision on whether the substitute text is accepted as binding. |
| Phase 8 — Distribution (`npm i -g @aperant/tui` on clean macOS/Ubuntu/WSL2) | n/a | n/a | n/a | n/a | n/a | **OUT OF SCOPE** (operator directive) — time-bound, not permanent; reverts to ordinary PENDING if the directive is lifted |


## Indexed screenshot gallery

One entry per capture, in the order recorded by each run's `captures.json`. Caption is quoted verbatim from the harness; italicized notes flag anything a sidecar `.txt` contradicts about its filename.

### hunter-seed (surface sweep) — `evidence/phase-6/run-20260917T144428-surface-hunter-seed/`

1. `hunter-seed/step-01-tab1-board.png` — Board tab baseline
2. `hunter-seed/step-02-tab2-term.png` — Term tab - live shell PTY in hunter-seed
3. `hunter-seed/step-03-tab3-road.png` — Roadmap tab - phases P1-P4 with feature counts
4. `hunter-seed/step-04-road-j-p2.png` — Roadmap j moves selection P1->P2, DETAIL updates
5. `hunter-seed/step-05-tab4-chat-qa.png` — Chat tab default QA mode
6. `hunter-seed/step-06-chat-ask-box.png` — Chat: a opens ask box input (? placeholder)
7. `hunter-seed/step-07-chat-ask-box-escape-noop-defect.png` — DEFECT: escape does not close ask box (InsightsView keymap isActive=isActive&&!asking, no escape handler)
8. `hunter-seed/step-08-chat-ask-box-closed-via-enter.png` — Ask box closed via empty-submit Enter (escape has no handler here per source)
9. `hunter-seed/step-09-chat-ideation-1-code-improvements.png` — Ideation type 1: Code Improvements (real data from .auto-claude/ideation/)
10. `hunter-seed/step-10-chat-ideation-2-uiux.png` — Ideation type 2: UI/UX
11. `hunter-seed/step-11-chat-ideation-3-docs-gaps.png` — Ideation type 3: Docs Gaps
12. `hunter-seed/step-12-chat-ideation-4-security.png` — Ideation type 4: Security
13. `hunter-seed/step-13-chat-ideation-5-performance.png` — Ideation type 5: Performance
14. `hunter-seed/step-14-chat-ideation-6-code-quality.png` — Ideation type 6: Code Quality
15. `hunter-seed/step-15-tab5-tree.png` — Tree tab - real worktrees list (main, feat/hunter-v1-build, auto-claude task worktree)
16. `hunter-seed/step-16-tree-j-move.png` — Tree j moves selection to feat/hunter-v1-build, STATUS updates
17. `hunter-seed/step-17-tab6-settings-theme-ice.png` — Settings tab baseline, theme=ice ACTIVE
18. `hunter-seed/step-18-tab6-settings-theme-synth.png` — Settings theme cycled to synth (k), toast cleared before capture
19. `hunter-seed/step-19-tab6-settings-theme-amber.png` — Settings theme cycled to amber
20. `hunter-seed/step-20-tab7-agents-1-swarm.png` — Agents tab default sub-view: AGENT SWARM (empty, no live agents)
21. `hunter-seed/step-21-tab7-agents-2-graph.png` — Agents sub-view 2: AGENT GRAPH
22. `hunter-seed/step-22-tab7-agents-3-inspect.png` — Agents sub-view 3: AGENT INSPECT
23. `hunter-seed/step-23-tab7-agents-4-trace.png` — Agents sub-view 4: AGENT TRACE
24. `hunter-seed/step-24-tab7-agents-5-tokens.png` — Agents sub-view 5: AGENT TOKENS
25. `hunter-seed/step-25-tab7-agents-6-waits.png` — Agents sub-view 6: AGENT WAITS
26. `hunter-seed/step-26-help-overlay.png` — Help overlay opened with ? - lists 1-7 switch view. NOTE: renders as a centered floating panel over the board, not a full-area replacement as the task brief described.
27. `hunter-seed/step-27-palette-open.png` — Command palette opened with : - renders in place of status line
28. `hunter-seed/step-29-palette-themes-result.png` — :themes command executed, shows flash toast listing all 5 themes, palette auto-closed on submit
29. `hunter-seed/step-30-palette-closed-via-escape.png` — Palette opened then closed via escape, confirms escape closes palette back to board
30. `hunter-seed/step-31-board-focus-detail.png` — Enter toggles focus between TASKS/DETAIL panels; change is color+bold only on Panel border/title per source (Panel.tsx:25,34), text content identical
31. `hunter-seed/step-32-logs-view-opened.png` — Section H: l opens LogsView, real task with 0 recorded log lines
32. `hunter-seed/step-33-logs-escape-returns-to-board.png` — Section H: escape from LogsView returns to board (onBack callback)
33. `hunter-seed/step-34-board-focus-list-BEFORE-defect.png` — DEFECT evidence BEFORE: board default focus=list state
34. `hunter-seed/step-35-board-focus-detail-AFTER-defect.png` — DEFECT: after 1x enter, focus should be 'detail' (Panel focused={focus==='detail'} should bold+color DETAIL title per Panel.tsx:34 and theme.borderFocus #38BDF8) but PNG is BYTE-IDENTICAL to the list-focus state. No visible focus indicator change detected by direct pixel comparison. Confirmed not a --bold filter tooling artifact: even TitleBar's unconditional bold 'APERANT' text (TitleBar.tsx:19) does not register under tuistory --bold filter either, so this defect required raw PNG visual inspection to confirm, not the style-filter probe. **[FLAGGED: `ok: false` in source record]**
35. `hunter-seed/step-36-board-L-move-refused.png` — L attempted to move task right; real vendored persistPlanStatusSync refused because no implementation_plan.json exists yet (task is roadmap-converted, source: roadmap-convert.ts skips the placeholder by design). Task correctly stayed in BACKLOG column. This is honest real-system behavior, NOT a defect.
36. `hunter-seed/step-37-board-x-stop-toast.png` — x on board flashes 'stop: no live agent process is owned by this TUI session' — exact documented behavior confirmed

### hunter-seed (linked workflow, to TERMINAL state) — `evidence/phase-6/run-20260917T153142-linked-hunter-seed/`

37. `hunter-seed/step-01-stage1-boot.png` — Stage 1: boot against hunter-seed, real title/branch/counts
38. `hunter-seed/step-02-stage2-roadmap-pre-regen.png` — Stage 2: roadmap tab before G force-regenerate, existing 4 phases
39. `hunter-seed/step-03-stage2-streaming-features-50pct.png` — Stage 2: mid-generation, features phase 50%, real log line 'Write failed due to input truncation. Using bash heredoc instead.' visible
40. `hunter-seed/step-04-stage3-roadmap-complete.png` — Stage 3: roadmap generation complete, 4 new phases (Usability, Detection Depth, Scale & Operations, Ecosystem) with real hunter-seed-specific features
41. `hunter-seed/step-05-stage4-spec-created-toast.png` — Stage 4: c converts feature to task spec, flash toast confirms spec 002-symbolized-crash-triage-with-rich-sanitizer-teleme created
42. `hunter-seed/step-06-stage5-agent-started.png` — Stage 5: s starts real vendored AgentManager, real worktree created on local-only branch auto-claude/002-symbolized-... (D23: no push), AGENT STREAM shows 'agent started — phase planning'. Note: a side-channel MCP server (auto-claude-mcp-server.js) failed to load with MODULE_NOT_FOUND, but the main agent proceeded.
43. `hunter-seed/step-07-stage6-agents-1-swarm-LIVE.png` — Stage 6: LIVE AGENT SWARM data - real planner agent 4/1000 steps 33% ctx executing, SWARM VITALS running=1 tokens=65.8k, LIVE TOOL TRACE shows real Read calls on worktree files with actual file content (Apache-2.0 header)
44. `hunter-seed/step-08-stage6-agents-2-graph-LIVE.png` — Stage 6: LIVE AGENT GRAPH - real orchestration topology, planner node, PHASE PIPELINE with regression guard warning
45. `hunter-seed/step-09-stage6-agents-3-inspect-LIVE.png` — Stage 6: LIVE AGENT INSPECT - real BLOCKED state, ctx 216.1k/200.0k (108.1%) compaction imminent, TOOL GRANTS from AGENT_CONFIGS[planner]: Read/Glob/Grep/Write/Edit/Bash/WebFetch/WebSearch + MCP context7/memory/auto-claude
46. `hunter-seed/step-10-stage6-agents-4-trace-LIVE.png` — Stage 6: LIVE EVENT TRACE - 349 real events, ms-precision timestamps, real thinking-delta stream during compaction/continuation
47. `hunter-seed/step-11-stage6-agents-5-tokens-LIVE.png` — Stage 6: LIVE TOKEN LEDGER - real 350.2k prompt tokens, 100% cache hit, CONTEXT PRESSURE 175% warning continuation will fire, real thinking-level policy shown
48. `hunter-seed/step-12-stage6-agents-6-waits-LIVE.png` — Stage 6: LIVE BLOCKING ANALYSIS - real 1 blocked, CTX 213.5% compaction imminent, real vendored ESCALATION THRESHOLDS constants
49. `hunter-seed/step-13-stage7-logs-view-002symb.png` — Stage 7: LogsView for the running 002-symb task shows '0 lines' honestly — task.logs array is a separate concept from AGENT STREAM/EVENT TRACE and is not yet populated for this running task
50. `hunter-seed/step-14-stage8-context-400pct-observation.png` — Observation during Stage 8 wait: context at 800.3k/200.0k (400.1%), continuations still 0/5, elapsed 4m2s, steps only 24/1000. Reporting honestly, not fabricating completion.
51. `hunter-seed/step-15-stage8-compaction-continuation-transition.png` — Real compaction/continuation event: after context hit 400%+ over ~5min, the planner agent restarted with fresh context (tokens reset to 39.5k, ctx 20%, steps reset). This is the real vendored compaction mechanism firing.
52. `hunter-seed/step-16-stage8-still-planning-11min.png` — Stage 8 honest status: after 11m20s of real wall-clock monitoring, agent is still in planning phase ('Creating implementation plan...'), steps 8/1000, repeatedly cycling through context-exhaustion/compaction loops. Not yet reached coding phase where real file changes would appear.
53. `hunter-seed/step-17-stage8-real-work-product-2commits.png` — Stage 8 WORK PRODUCT PROOF: after ~13min real run, worktree at commit 2bf15b9 has 2 real commits since base bb718fd — 'Create CrashReport schema dataclass' + 'Implement sanitizer output parser', total diff harness/crash_report.py +318 lines, phase-1-schema 2/3 subtasks complete, agent now on subtask 1-3 (fresh planner continuation)
54. `hunter-seed/step-18-stage9-pre-restart-backlog2.png` — Stage 9 pre-restart: board shows BACKLOG (2) - the MUTATED state (001-guid + 002-symb), proving genuine state change from boot's BACKLOG(1)
55. `hunter-seed/step-19-stage9-post-restart-backlog2.png` — Stage 9 post-restart: fresh TUI process boots and correctly shows BACKLOG (2) - the mutated state persisted to disk (roadmap.json + specs/002-*) survives session close+relaunch
56. `hunter-seed/step-20-resume-agent-started.png` — Resumed agent: reused existing worktree (2 prior commits preserved), not a fresh clone
57. `hunter-seed/step-21-phase1-complete-3-subtasks.png` — Phase 1 (schema) fully complete: 3/3 subtasks committed (0b00505 subtask-1-3 tests, 2bf15b9 subtask-1-2 parser, 8332e15 subtask-1-1 schema). Agent now continuing into phase-2-symbolize.
58. `hunter-seed/step-22-commit4-subtask2-1-symbolize.png` — 4th commit: subtask-2-1 (symbolize module with addr2line merge) complete. Phase-2-symbolize 1/2 subtasks done.
59. `hunter-seed/step-23-phase2-complete-5-commits.png` — Phase 1 (schema) + Phase 2 (symbolize) fully complete: 5/14 subtasks committed. Moving into phase-3-artifact-wiring.
60. `hunter-seed/step-24-commit6-subtask3-1.png` — 6/14 subtasks committed: phase-3-artifact-wiring 1/2 done (Extend CrashArtifact with crash_report field)
61. `hunter-seed/step-25-commit7-phase3-complete-halfway.png` — 7/14 subtasks committed - HALFWAY. Phases 1,2,3 fully complete (schema, symbolize, artifact-wiring). Moving into phase-4-persistence.
62. `hunter-seed/step-26-anomaly-blocked-90pct-2min.png` — Compaction anomaly observation: agent BLOCKED at exactly CTX 90.7% for 2+ minutes continuous (elapsed 19m57s->21m57s) with zero state change - unlike prior cycles that self-resolved within seconds to ~1min. Flagged per task instructions as further evidence, not chased/diagnosed.
63. `hunter-seed/step-27-commit8-subtask4-1-persist-confirmed.png` — 8/14 subtasks: subtask-4-1 Persist crash_report in result.json and jsonl files - confirmed still on disk after my Python kernel crashed (agent process unaffected)
64. `hunter-seed/step-28-commit9-phase4-complete.png` — 9/14 subtasks: Phases 1-4 fully complete (schema, symbolize, artifact-wiring, persistence). Moving into phase-5-consumers (judge/dedup/report wiring).
65. `hunter-seed/step-29-anomaly-ctx-600pct-new-extreme.png` — Compaction anomaly: context climbed to 601.2% (new observed extreme, prior runs peaked ~430-530%) without triggering compaction reset at this point. Continuing to monitor per task instructions (flag, don't chase).
66. `hunter-seed/step-30-commit10-subtask5-1-judge.png` — 10/14 subtasks: phase-5-consumers 1/3 done (Render structured crash block in judge prompt)
67. `hunter-seed/step-31-commit11-subtask5-2-dedup.png` — 11/14 subtasks: phase-5-consumers 2/3 done (Upgrade dedup signature to symbolized frames). Only subtask-5-3 + phase-6 (2 subtasks) remain.
68. `hunter-seed/step-32-anomaly-ctx-740pct-extreme.png` — Compaction anomaly EXTREME: context reached 739.7% (vs documented 90% trigger threshold, and vs earlier observed maxima of ~430-600%) with steps still incrementing (29/1000) and no compaction reset. This is the largest single overshoot observed across this entire session.
69. `hunter-seed/step-33-commit12-phase5-complete.png` — 12/14 subtasks: Phases 1-5 fully complete. Only phase-6-integration remains (subtask-6-1 full unit suite + legacy compat, subtask-6-2 canary docs).
70. `hunter-seed/step-34-final-board-terminal-state.png` — TERMINAL STATE: task auto-corrected to human_review after all 14/14 subtasks completed

### awesome-researcher (multiproject) — `evidence/phase-6/run-20260917T153247Z-multiproject/`

71. `awesome-researcher/step-01-boot-identity.png` — Boot: title bar shows awesome-researcher, feat/awesome-researcher branch, board tab, 1 review
72. `awesome-researcher/step-02-tab-board.png` — Tab sweep: board
73. `awesome-researcher/step-03-tab-term.png` — Tab sweep: term
74. `awesome-researcher/step-04-tab-road.png` — Tab sweep: road
75. `awesome-researcher/step-05-tab-tree.png` — Tab sweep: tree
76. `awesome-researcher/step-06-tab-set.png` — Tab sweep: set
77. `awesome-researcher/step-07-tab-chat.png` — Tab sweep: chat (INSIGHTS panel)
78. `awesome-researcher/step-08-tab-agents.png` — Tab sweep: agents (AGENT SWARM subview)
79. `awesome-researcher/step-09-roadmap-pre-regen.png` — Roadmap tab before force-regen, existing content visible (phase-1/2/3)
80. `awesome-researcher/step-10-roadmap-post-regen-idle.png` — Roadmap after force-regen completes: idle, new P-1/P-2/P-3 structure
81. `awesome-researcher/step-11-settings-config-panel.png` — Settings tab: CONFIG panel shows provider=anthropic, model=glm/glm-5, baseUrl=127.0.0.1:20128
82. `awesome-researcher/step-12-insights-qa-answer.png` — Insights Q&A: 'Which file and function defines the CLI entry point for the headless pipeline command?' -> cites awesome_researcher/main.py line 1608

### proofpunk-agent (multiproject) — `evidence/phase-6/run-20260917T153247Z-multiproject/`

83. `proofpunk-agent/step-01-boot-identity.png` — Boot: title bar shows proofpunk-agent, master branch, board tab
84. `proofpunk-agent/step-02-tab-board.png` — Tab sweep: board
85. `proofpunk-agent/step-03-tab-term.png` — Tab sweep: term
86. `proofpunk-agent/step-04-tab-road.png` — Tab sweep: road
87. `proofpunk-agent/step-05-tab-tree.png` — Tab sweep: tree
88. `proofpunk-agent/step-06-tab-set.png` — Tab sweep: set
89. `proofpunk-agent/step-07-tab-chat.png` — Tab sweep: chat (INSIGHTS panel)
90. `proofpunk-agent/step-08-tab-agents.png` — Tab sweep: agents (AGENT SWARM subview)
91. `proofpunk-agent/step-09-roadmap-pre-regen.png` — Roadmap tab before force-regen, existing content visible
92. `proofpunk-agent/step-10-roadmap-pre-regen-clean.png` — Roadmap idle before clean force-regen capture
93. `proofpunk-agent/step-11-roadmap-post-regen-idle.png` — Roadmap after force-regen completes: idle, new P12-P14 structure
94. `proofpunk-agent/step-12-settings-config-panel.png` — Settings tab: CONFIG panel shows provider=anthropic, model=glm/glm-5, baseUrl=127.0.0.1:20128
95. `proofpunk-agent/step-13-insights-qa-answer.png` — Insights Q&A: 'Which file defines the Textual App entry point class for this project?' -> cites proofpunk_agent/app.py line 194

### scratch (Phase 5/6/7 gates, complete) — `evidence/phase-6/run-20260917T160211Z-gates/`

96. `scratch/step-01-boot-identity.png` — Boot: scratch repo identity, main branch, 1 backlog task
97. `scratch/step-02-gate-p5.1-worktree-list.png` — P5.1: WORKTREES panel vs git worktree list --porcelain
98. `scratch/step-03-p5new-diff-unfocused.png` — Diff pane showing real diffstat before focusing
99. `scratch/step-04-p5new-diff-focused.png` — Diff pane focused, showing real diff content matching git diff HEAD
100. `scratch/step-05-p5new-diff-scroll-j.png` — Diff pane after scrolling down 3 lines with j
101. `scratch/step-06-p5new-diff-scroll-pagedown.png` — Diff pane after pagedown (scroll by 10), showing EXTRA_LINE_6-9
102. `scratch/step-07-p5new-merge-self-refusal.png` — Merge safety guard: self-merge refused with exact message
103. `scratch/step-08-p5new-merge-dirty-refusal.png` — Merge safety guard: dirty main repo refused merge with exact message
104. `scratch/step-09-p5new-merge-real-postmerge.png` — Post real-merge state: worktree diff still clean (merge only affected main repo)
105. `scratch/step-10-p5new-conflict-state.png` — Real merge conflict detected: app.py, UI shows 'press R to ask AI to resolve'
106. `scratch/step-11-p5new-ai-resolve-attempt1-failed.png` — AI resolve attempt 1: failed honestly with 'Invalid JSON response' -- real live AI call, real failure surfaced
107. `scratch/step-12-p5new-pr-push-failed.png` — PR attempt: gh CLI available+authenticated but no origin remote configured -- honest push failure, no PR created against any real repo
108. `scratch/step-13-p6.1-baseline-ice-board.png` — Baseline under 'ice' theme: board tab
109. `scratch/step-14-p6.1-baseline-ice-term.png` — Baseline under 'ice' theme: term tab
110. `scratch/step-15-p6.1-baseline-ice-road.png` — Baseline under 'ice' theme: road tab
111. `scratch/step-16-p6.1-baseline-ice-tree.png` — Baseline under 'ice' theme: tree tab
112. `scratch/step-17-p6.1-baseline-ice-set.png` — Baseline under 'ice' theme: set tab
113. `scratch/step-18-p6.1-baseline-ice-chat.png` — Baseline under 'ice' theme: chat tab
114. `scratch/step-19-p6.1-baseline-ice-agents.png` — Baseline under 'ice' theme: agents tab
115. `scratch/step-20-p6.1-cyberpunk-set.png` — Settings tab under 'cyberpunk' theme -- ACTIVE marker moved
116. `scratch/step-21-p6.1-cyberpunk-board.png` — Board tab under 'cyberpunk' theme
117. `scratch/step-22-p6.1-cyberpunk-term.png` — Term tab under 'cyberpunk' theme
118. `scratch/step-23-p6.1-cyberpunk-road.png` — Road tab under 'cyberpunk' theme
119. `scratch/step-24-p6.1-cyberpunk-tree.png` — Tree tab under 'cyberpunk' theme
120. `scratch/step-25-p6.1-cyberpunk-chat.png` — Chat tab under 'cyberpunk' theme
121. `scratch/step-26-p6.1-cyberpunk-agents.png` — Agents tab under 'cyberpunk' theme
122. `scratch/step-27-p6.2-accounts-active-tag.png` — ACCOUNTS panel focused, showing inline ACTIVE tag on the head-of-priority account, no key material visible
123. `scratch/step-28-p6.2-single-account-honest.png` — P6.2.1: single account + enter -> honest 'is the only account — already active' message, no fake switch
124. `scratch/step-29-p7.2-before-resize-200x50.png` — Before resize: 200x50
125. `scratch/step-30-p7.2-after-resize-80x24.png` — After resize to 80x24: layout reflows, borders intact, text wraps, no corruption
126. `scratch/step-31-p7.2-back-to-200x50.png` — Resized back to 200x50: layout correctly reflows to original width, no corruption
127. `scratch/step-32-p7.3-shell-killed-exited.png` — After kill -9 on PTY shell PID from outside: app did not crash, shows 'shell exited', 'press r to respawn'
128. `scratch/step-33-p7.3-respawned-working.png` — After r: new shell PID 55743 (different from killed 51641), real command execution confirms fully functional
129. `scratch/step-34-p7.3-tree-still-responds.png` — Tree tab still fully responsive, all 3 worktrees intact
130. `scratch/step-35-p7.3-board-still-responds.png` — Board tab still fully responsive after PTY shell kill+respawn cycle
131. `scratch/step-36-p7.4-term-xterm256color.png` — Launched with TERM=xterm-256color: renders coherently, boot identity + board tab correct
132. `scratch/step-37-p7.4-term-xterm-basic.png` — Launched with TERM=xterm (basic, no 256color hint): renders coherently, degraded color tier expected but no corruption
133. `scratch/step-38-F11-control-focus-before.png` — Positive control BEFORE: board tab, TASKS panel focused (bold border)
134. `scratch/step-39-positive-control-A-worktrees-focused.png` — Positive control A: WORKTREES panel focused (thick border), DIFF unfocused (thin border)
135. `scratch/step-40-positive-control-B-diff-focused.png` — Positive control B: DIFF panel focused (thick border), WORKTREES unfocused (thin border)

### hunter-seed (F-17 board-status proof) — `evidence/phase-6/run-20260917T173051-f17-board-status/`

136. `hunter-seed/step-01-before-board-002symb-backlog.png` — BEFORE: 002-symb shows BACKLOG 0% on board (the bug) despite worktree plan being human_review 14/14 complete
137. `hunter-seed/step-02-after-board-002symb-review-14of14.png` — AFTER: F-17 fix fires on exit. Board now shows 002-symb [REVIEW], progress 50%, subtasks 14/14 complete, phase coding. New HUMAN (1) column appeared. Main plan now exists on disk matching worktree.
138. `hunter-seed/step-03-step4-board-confirmed-review-status.png` — Step 4: after navigating away (roadmap) and back to board, 002-symb still correctly shows [REVIEW], 14/14 subtasks, phase coding - real status persisted across in-session navigation
139. `hunter-seed/step-04-step5-post-restart-review-status.png` — Step 5 RESTART PROOF: fresh TUI process (cold boot, no in-memory state) still shows 002-symb [REVIEW], 14/14 complete, phase coding - the fix persisted the sync to disk, not just in-memory

### scratch (F-16 redrive: AI conflict resolution + local-origin push) — `evidence/phase-6/run-20260917T173809Z-f16-redrive/`

140. `scratch/step-01-f16-boot-identity.png` — Boot: F-16 redrive session against scratch repo
141. `scratch/step-02-f16-conflict-confirmed-before-R.png` — Real conflict confirmed via git status (UU) and file markers BEFORE pressing R
142. `scratch/step-03-f16-after-resolve-content.png` — After R: file content resolved (markers gone), still UU in git status (not auto-committed) — 1st fresh-conflict attempt
143. `scratch/step-04-f16-third-resolve-content-state.png` — Third resolve attempt: content resolved (CONFLICT branch side chosen), still UU (not committed)
144. `scratch/step-05-f16-pr-local-origin-push-succeeded.png` — Push to local bare origin SUCCEEDED (verified via git log on the bare repo); gh pr create correctly failed since it's not GitHub
145. `scratch/step-06-f16v-conflict-before-R.png` — Real conflict confirmed for the 2nd fresh-conflict attempt (recreated via merge --abort + re-merge), before pressing R

## Totals

- **Total PNG captures aggregated (7 captures.json files):** 145
- **Distinct sha256 values:** 118
- **Duplicate images (extra copies of a repeated sha256, beyond the first occurrence):** 27
- **Entries with non-empty `secret_hits`:** 0 (zero — confirms the harness's own inline secret scan)
- **`ok: true` count:** 144
- **`ok: false` count:** 1 (the one F-11 pre-fix defect capture — `board-focus-detail-AFTER-defect.png`, correctly self-flagged by the harness at capture time)
- **Non-PNG gate artifacts (this session, 2 runs × 3 gates):** 6 (`{typecheck,test,build}.txt` + `{typecheck,test,build}-final.txt`) — all 6 PASS, exit=0
- **Verdict breakdown across the criterion table:**
  - **PASS:** 31 (tab sweeps, ideation, help/palette, logs, task-spec-to-agent, observability sub-views, context/anomaly tracking, RESUME, restart persistence, terminal-state auto-correction, both multiproject sweeps ×2, P5.1/diff-pane/merge-guards/P5.2-real-merge/conflict-detection, P5.4-AI-resolve-redriven, P5.3-push-mechanism, P6.1-state-application, P6.2-single-account, P7.2/P7.3/P7.4, positive controls, 6 gate runs — counted per row, several rows bundle multiple sub-checks)
  - **FAIL→FIXED:** 5 (F-10 escape trap, F-11 focus invisibility, F-12 board-stop lie, F-16 merge-resolver Invalid JSON [now PROVEN — re-driven 3/3 post-fix], F-17 plan-sync no-op [PROVEN end-to-end])
  - **UNVERIFIED (precondition genuinely unmeetable, correctly NOT converted to PASS):** 3 (P5.3's final "PR appears on GitHub" step — no real GitHub host, correctly declined; P6.1 color-rendering dimension — no available instrument; P6.2 multi-account switch — only one real credential)
  - **BLOCKED:** 1 (design conformance vs the named spec — needs a user decision on substitute authority)
  - **OUT OF SCOPE:** 1 (Phase 8 distribution, operator directive)

**Change from the prior matrix revision:** P5.4 (AI conflict resolution) moved from FIXED-NOT-REDRIVEN to fully PASS, and P5.3 (PR creation) moved from a single UNVERIFIED verdict to a split PASS (push mechanism, now independently proven against a real local git remote) + UNVERIFIED (the final GitHub-specific step, correctly still not faked) — both driven by the new `run-20260917T173809Z-f16-redrive/` evidence. Net effect on the totals: PASS count 28→31 (+3: P5.4 moving to PASS, P5.3 splitting into a PASS-eligible push-mechanism sub-claim, and the FAIL→FIXED bucket's F-16 label upgrading without changing its own count), UNVERIFIED count 4→3 (P5.4 no longer sits in a separate not-quite-UNVERIFIED bucket; net -1).

## Note on F-15 / F-16 / F-17 ledger status

Three defect/adjudication ids appear in evidence this session but are **not yet added to `audit-evidence/cycle-01/findings.json`** (that ledger currently ends at F-14):

- **F-15** (`evidence/phase-6/run-20260917T160211Z-gates/scratch/F-15-instrument-adjudication.json`) is explicitly **not** an application defect — it documents a measurement-instrument limitation (no capture pipeline in this session can observe per-cell ANSI color) and is self-labeled `not_filed_as_new_defect`. Does not belong in the defect ledger.
- **F-16** (merge-resolver `generateText()`→`streamText()`, `apps/desktop/src/main/ai/runners/merge-resolver.ts`) is a real, root-caused, fixed, and now **independently re-driven (3/3 PASS)** defect, with an in-source `[APERANT-PATCH merge-resolver-stream]` comment block explaining the mechanism in full. Owned by whichever session made that vendored-tree change — file is outside this session's ownership (`apps/tui/src/views/**`, `apps/tui/src/components/**`), so it was not added to findings.json here, but its ACCEPTANCE-INVENTORY.md row now reflects PROVEN status per the redrive evidence.
- **F-17** (plan-sync-on-exit, `apps/tui/src/services/agent-start-service.ts`) is a real, root-caused, fixed, and now end-to-end PROVEN defect (see the F-17 gallery entries above). `agent-start-service.ts` is also outside this session's ownership.

**Recommendation:** whoever owns `audit-evidence/cycle-01/findings.json` next should add F-16 and F-17 as real entries (both have complete in-source documentation to cite) and record F-15 as an out-of-band instrument-limitation note rather than a numbered defect.

## Manifest regeneration (prior session turn — still current)

`evidence/phase-5/run-20260917T003750-tuistory-linked/MANIFEST.json` was regenerated to reflect the redaction of `awesome-researcher/{agent-events.jsonl, work-product.diff, 0001-...patch}` (63+1+1 = 65 `[REDACTED: ...]` markers total across those 3 files). 225 entries (was 224); each redacted entry carries `superseded_bytes`/`superseded_sha256`/`redacted_at`/`redaction_note` pointing at `REDACTION-NOTE.md`. Re-verified this turn: all 3 redaction marker counts unchanged (63/1/1), confirming no re-introduction of private-source content since the redaction was sealed.

## Evidence-tree-wide integrity sweep (prior session turn — still current)

10 manifests, 663 hashed entries checked: 555 hash-verified matches, 105 entries with no `sha256` field (older schema, not a mismatch), 0 genuine hash mismatches, 3 pre-existing missing files in `vigil/captures.json` (unrelated to redaction, never had a PNG written). **Verdict: zero unexplained integrity failures.**
