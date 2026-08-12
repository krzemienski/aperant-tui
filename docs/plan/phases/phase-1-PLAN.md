# Phase 1 PLAN — Shell & Service Layer

## Proof obligation

`aperant` launches against a real project directory; title bar shows the actual
project name, real git branch, and real task counts; `:` opens palette; `?`
opens help; all 6 tabs switch — proven by run-scoped agent-tty evidence
(snapshots + rendered screenshots + asciicast).

## Work items

1. Vendor `apps/desktop` @ 20250db0 unmodified + SHA256SUMS manifest.
2. `libs/electron-shim` — real Node implementations of the Electron API subset
   used by `src/main` (app paths, ipcMain registry, safeStorage honesty,
   shell.openPath, net.fetch). BrowserWindow constructor throws
   `UnsupportedInTuiError`; statics return empty honestly.
3. `libs/sentry-adapter` — `@sentry/electron` export-compatible adapter writing
   crash reports to `<userData>/logs/crash-report.log`.
4. `apps/tui` — Ink/React TUI: cli (TTY check, SHELL normalization), App shell,
   TitleBar/TabBar/StatusLine, Board/Terminal/Roadmap/Insights/Worktree/
   Settings/Logs views reading REAL data via vendored projectStore,
   CommandPalette, HelpOverlay, 5 truecolor themes with 256/16 degradation,
   zustand store, config service (zod-validated, malformed -> .broken-<ts> +
   clear error), keymap hook with tui.json remaps.
5. `bin/aperant.js` — cwd-independent launcher (pins TSX_TSCONFIG_PATH).
6. Smoke: 6/6 vendored runtime modules import + execute in plain Node 20.
7. Gate run via agent-tty per-step drive + asciicast.

## Data sources (all real)

- Tasks: `<project>/.auto-claude/specs/*/implementation_plan.json` etc. via
  vendored `projectStore.getTasks` (3s TTL cache, real disk scan)
- Branch: `git rev-parse --abbrev-ref HEAD`; worktrees: `git worktree list
  --porcelain`
- Roadmap: `.auto-claude/roadmap/roadmap.json`; index: `.auto-claude/
  project_index.json`
- Config: `<APERANT_USER_DATA>/tui.json` (theme persists across restarts)

## Known limitations entering Phase 2

- Pasting/burst-typing a full `:`command in one stdin write can drop chars
  (palette mounts after the opening `:`; same-chunk chars are lost). Human
  typing is unaffected. Candidate hardening for Phase 7.
- Logs view is only reachable from board (`L`); no recorded runs fixture yet.
- PtyPane renders an ellipsis gutter on the right edge (cosmetic).
