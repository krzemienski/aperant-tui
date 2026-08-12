# Phase 1 SUMMARY — Shell & Service Layer

## What was built

- Vendored `apps/desktop` @ 20250db0 (1,288 files, SHA256SUMS manifest).
- `libs/electron-shim` + `libs/sentry-adapter`: the vendored agent runtime
  imports and executes UNMODIFIED in plain Node 20 — smoke 6/6 PASS
  (`scripts/smoke-main-imports.mts`: settings-utils round-trip on disk,
  project-store, rate-limit-detector parse hit/miss, task-log-service,
  pty-manager exports, taskMachine boots to "backlog").
- `apps/tui` Ink application: 7 views, command palette, help screen, 5 themes
  with truecolor->256->16 degradation, config persistence, remappable keymap.
- `bin/aperant.js` cwd-independent launcher (fixed a real tsconfig-paths bug:
  tsx resolves aliases from the process CWD, so the bin must pin
  TSX_TSCONFIG_PATH — otherwise `aperant` only works from the repo).
- SHELL normalization in cli.tsx: vendored pty-manager defaults to `/bin/zsh`;
  on zsh-less systems the term pane died instantly. cli.tsx now picks the
  first existing of /bin/bash, /bin/sh, /bin/zsh WITHOUT touching vendored code.
- `@xterm/headless` v6 is UMD (no exports map) — loaded via createRequire.

## How the gate was executed

agent-tty end-user harness (per user directive after kimi-find-skills
discovery): real PTY session, per-step direct CLI calls, each step saved as
its own JSON envelope; text snapshots + rendered PNG screenshots (sha256) +
asciicast recording; screen states examined personally by the builder.

Two runs:
- `run-20260811T233239-phase1-gate` — RED: caught D1 (Panel titles never
  render), and the palette drive raced (D3, harness-side).
- `run-20260812T003000-phase1-gate-recheck` — GREEN after fixes; includes
  theme-change probe (matrix->amber, 23,846 px diff) and help re-shoot.

## Defects found by the gate and fixed

| # | Defect | Fix | Re-verified by |
|---|---|---|---|
| D1 | Panel titles clipped (`position:absolute;marginTop:-1` inside `overflow:hidden`) | in-flow title row | "live PTY"/"THEME" waits match; titles visible in PNGs |
| D2 | HelpOverlay transparent bleed-through (Ink has no compositing) | full-area replacement render | step-18b-shot-help-fixed.png |
| D3 | Burst-typed `:`commands lose chars (palette mount race) | harness sequencing (product limitation noted) | theme-change-probe |

Earlier build-time defects also caught by real execution: bin CWD dependence,
xterm UMD import, /bin/zsh default (all fixed, see git history).

## Verdict

**GATE 1: PASS** — see phase-1-VALIDATION.md for per-criterion verdicts.
