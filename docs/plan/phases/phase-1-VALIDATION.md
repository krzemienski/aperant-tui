# Phase 1 VALIDATION — per-criterion verdicts

Run: `evidence/phase-1/e2e-evidence/run-20260812T003000-phase1-gate-recheck/`
(green; supersedes red run-20260811T233239-phase1-gate)
Session 01KZSNMHZ2NCA27VTVZ9YPY6Q9 · 110x32 · agent-tty 0.5.0 · asciicast
step-20-record-export.cast (54.1s, sha256 cc26cecb…44dc8)

Gate criteria (spec Part 6, Phase 1):

| # | Criterion | Evidence | VERDICT |
|---|---|---|---|
| 1 | `aperant` launches against a real project directory | step-05-run (launch), step-06-wait-title matched "APERANT" | **PASS** |
| 2 | Title bar shows actual project name | step-07: `aperant-fixture` (= directory name, via vendored addProject) | **PASS** |
| 3 | Title bar shows real git branch | step-07: `⑂ develop` (= `git rev-parse` of fixture, branch develop) | **PASS** |
| 4 | Title bar shows real task counts | step-07: `◉ 1 running ◆ 0 review` — matches 4 fixture specs: 001 in_progress, 002 queue, 003 done, 004 backlog; board lists all 4 with real titles/priority/subtask counts (3/5, 50%) | **PASS** |
| 5 | `:` opens palette | step-15-wait-palette matched placeholder text; palette snapshot | **PASS** |
| 6 | Palette executes real commands | theme-change-probe: `:theme matrix|amber|cyberpunk` applied live (23,846 px changed), ACTIVE marker moved, tui.json persisted each time | **PASS** |
| 7 | `?` opens help | step-18-wait matched "KEYBINDINGS"; step-18b screenshot readable after D2 fix | **PASS** |
| 8 | All 6 tabs switch | step-10..14: term (live PTY + real shell prompt), road (Foundation), insights (entries 3), worktrees (⑂ develop head b6d252a5fd), settings (THEME) | **PASS** |
| 9 | (evidence standard) screenshots + recording | step-08/10/14/16 PNGs with sha256; step-20 asciicast | **PASS** |
| 10 | Clean exit | step-19: ctrl+c ×2 → shell prompt returned | **PASS** |

Cross-checks:
- Boot-loaded config: step-14 shows `matrix ACTIVE` at launch — tui.json
  written by an earlier process was honored at boot (persistence PROVEN).
- Board navigation: `j` moved ❯ 001-migr → 002-fix (step-09).
- Terminal pane: real bash prompt `kimi@…:/tmp/aperant-fixture$` inside pane
  (step-10 snapshot) — vendored pty-manager spawning a real PTY.

Regression obligations carried into Phase 2: this gate re-runs in full.

## Defects (all closed)

D1 Panel titles clipped → fixed, re-verified. D2 HelpOverlay bleed-through →
fixed, re-verified (step-18b). D3 harness burst-type race → driving discipline
corrected; product hardening candidate logged for Phase 7.

## UNVERIFIED items

None for Phase 1 scope.
