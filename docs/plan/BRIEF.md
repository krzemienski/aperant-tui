# BRIEF — Aperant TUI

Source spec: `aperant-tui-specification.md` (user upload, 583 lines).
Upstream prototype: github.com/AndyMik90/Aperant @ `20250db069a849ab001ac6ab9e3e9779886ab9e2`
(branch `develop`, v2.8.0-beta.6), vendored UNMODIFIED into `apps/desktop/`
(integrity manifest: `apps/DESKTOP-SHA256SUMS.txt`).

## True success criteria

1. A terminal UI (`aperant`) that imports the vendored Electron app's TypeScript
   agent runtime (`apps/desktop/src/main/**`) IN-PROCESS — no IPC, no API
   gateway, no language bridge — via `libs/electron-shim` (real Node
   implementations of the Electron API subset, not mocks).
2. Functional parity per the spec's Part 2 matrix: board/task lifecycle,
   terminal-in-terminal PTY panes, roadmap, insights, worktrees, settings,
   themes, command palette.
3. Every phase gate (spec Part 6) proven by real execution with run-scoped
   evidence under `evidence/phase-{N}/`; regression gates cumulative
   (Phase N re-runs gates 1..N-1). Per-criterion VERDICT for every gate.
4. No mocks, no stubs, no placeholder data anywhere in the product. Empty
   states must report factual reasons.
5. Repo: github.com/krzemienski/aperant-tui (public), all work pushed.

## Iron Rule (spec Part 6)

Real system execution, real evidence, no mocks, no stubs.

## Current status

- Phase 1 — **GATE PASSED** (run-20260812T003000-phase1-gate-recheck, green;
  supersedes red run-20260811T233239-phase1-gate which caught 2 real defects)
- Phases 2–8 — not started
