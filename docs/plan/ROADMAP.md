# ROADMAP — Aperant TUI (from spec Part 6)

Gates are cumulative: Phase N re-runs every gate from Phases 1..N-1.
A regression blocks advancement. Evidence standard: spec Part 7.

| Phase | Scope | Gate (verbatim from spec) | Status |
|---|---|---|---|
| 1 | Shell & Service Layer | `aperant` launches against a real project directory; title bar shows the actual project name, real git branch, and real task counts read from `.aperant/`; `:` opens palette; `?` opens help; all 6 tabs switch. | **PASSED** 2026-08-12 |
| 2 | Board & Task Lifecycle | Board lists real tasks from a live project. Pressing `s` on a queued task actually starts an agent — the agent stream shows real spec/plan/code phase output, and progress advances. Task status changes persist to disk and survive restart. | pending |
| 3 | Terminal Emulation | PTY pane runs a real shell; `ls --color`, `htop`, and `vim` all render correctly. Claude Code invoked from a pane produces streaming output with correct ANSI colors. Four simultaneous panes sustain >=30fps under continuous output. Zoom mode renders vim byte-identically to a native terminal. | pending |
| 4 | Roadmap, Insights, Ideation | Roadmap generates from real codebase analysis with visible streaming progress. Insights answers a real question about the actual codebase with a correct file reference. Ideation returns real findings in all five categories. | pending |
| 5 | Worktrees, Merge, Git Forges | Worktree list matches `git worktree list` exactly. A merge executed from the TUI actually merges — verified by `git log` on the target branch. A PR created from the TUI appears on GitHub. AI conflict resolution resolves a real induced conflict. | pending |
| 6 | Context, Settings, Onboarding | Theme change applies instantly across all views. Profile switch changes the active credential and the next agent run uses it. Onboarding completes on a machine with no `~/.aperant/` and ends in a working board. | pending |
| 7 | Performance & Resilience | 200-task board scrolls at >=60fps. Resize from 200x50 -> 80x24 reflows without corruption. Killing a PTY child leaves the TUI responsive. Renders coherently in `TERM=xterm-256color` and `TERM=xterm`. | pending |
| 8 | Distribution | `npm i -g @aperant/tui && aperant` works on a clean macOS, Ubuntu, and WSL2 machine. | pending |

## Harness note

Gate execution uses `agent-tty` (terminal automation: create/run/type/send-keys/
wait/snapshot/screenshot/record) driving the real TUI as an end user, per-step
direct CLI calls saved as JSON envelopes into the run dir. Monolithic batch
driving was tried and rejected (wait-baseline quirks); blind burst-typing into
overlay-opening keys races React mounts — all driving is observe-then-act.

## Credential constraint (affects Phases 2/4/5 gates)

Gates requiring a live AI provider (agent start, roadmap generation, insights
Q&A, AI conflict resolution) need real provider credentials in
`settings.json`. If none are available in the build environment, those
sub-criteria are reported **UNVERIFIED — no credentials**, never simulated.
