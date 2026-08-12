# aperant-tui

Terminal user interface for [Aperant](https://github.com/AndyMik90/Aperant) —
an Ink 5 + React 18 renderer that replaces **only** the Electron renderer and
imports the TypeScript agent runtime (`apps/desktop/src/main/**`) directly.
No IPC, no API gateway, no language bridge.

Built to the Aperant TUI specification (Ink + Zustand 5 + XState 5 +
`@lydell/node-pty` + `@xterm/headless`), with every phase gate proven by real
execution evidence (see `docs/plan/` and `evidence/`).

## Layout

```
apps/desktop/        vendored upstream snapshot — UNMODIFIED (see VENDORED.md)
apps/tui/            the TUI package (@aperant/tui, `aperant` bin)
libs/electron-shim/  Node implementation of the electron API subset src/main needs
docs/plan/           validation plan: BRIEF, ROADMAP, per-phase PLAN/SUMMARY/VALIDATION
tests/               functional test suite (real PTYs, real git, real renders)
evidence/            phase-gate evidence: asciinema recordings, timing logs, git proofs
```

## Quick start

```bash
npm install
npm run dev -- /path/to/a/git/project
```

Node >= 20. A truecolor terminal is recommended (`COLORTERM=truecolor`);
the UI degrades coherently to 256-color and 16-color tiers.

## Status

See `docs/plan/ROADMAP.md` for phase gates and their measured verdicts.
