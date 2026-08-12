# Phase 2.5 PLAN — Live provider E2E (Moonshot/Kimi) + log facet

Inserted between Phase 2 and Phase 3 by operator directive (2026-08-12):
"How are you proving that a QB is actually fully functional? You need logs…
upgrade the agent SDK for JavaScript and add the provider you're currently
using." The operator supplied a live OpenAI-compatible combo endpoint
(`http://home.hack.ski:20128/v1`) serving `kimi/*` models.

## Scope

1. **AI SDK upgrade**: `ai` v6→v7 and the full `@ai-sdk/*` constellation to
   latest, keeping the vendored closure compiling and running.
2. **Moonshot (Kimi) provider**: real provider package
   (`libs/moonshot-provider`), vendored registry/auth/equivalence wiring
   (marked `[APERANT-PATCH moonshot-provider]`, see `VENDORED-PATCHES.md`),
   TUI account provisioning (Settings → ACCOUNTS, `a` key).
3. **Worker runtime**: esbuild-bundled agent worker for the non-Electron
   runtime (`tools/build-worker.mjs` + `APERANT_WORKER_PATH`).
4. **Log facet (the proof upgrade)**: every gate now captures
   - `agent-events.jsonl` — the TUI flight recorder (all AgentManager events)
   - `tui-console.raw.log` — full PTY byte stream via `script(1)` sub-PTY
     (a pipe breaks Ink's TTY guard — defect D7)
   - `crash-report.log` — sentry-adapter local crash log
   - `task_logs.json` — the worker's own per-spec log
   - worktree/disk diffs, exit codes, wait envelopes with `result.matched`
     assertions (defect D8: envelope `ok` is transport-level, not a match)
5. **Live agent run**: `s` on queued task 002 → real planner/coder session
   against the real endpoint.

## Gates (three-facet: UI + persistence + logs)

| # | Criterion | Facets |
|---|---|---|
| 1 | Provisioning refusal without credentials (clear, safe) | UI flash + absent settings.json |
| 2 | `a` provisions a real moonshot account | UI flash + settings.json disk read (redacted copy) |
| 3 | Account resolves through the vendored queue | console log `[AgentManager] Resolved auth… provider=moonshot` |
| 4 | Agent starts and streams for real | `agent-events.jsonl` lifecycle + screenshots |
| 5 | Agent does real work | fixture disk diff (plan status, source files, task_logs.json) |
| 6 | No secrets in evidence | automated grep scan of the run dir |
| 7 | Regression: provider protocol suite | 9/9 vitest (provider HTTP/SSE/401/garbage + executor queue) |

## Credential handling

Keys enter via env at session creation only. Evidence carries redacted
copies; a scripted scan asserts no key material in the run dir.
