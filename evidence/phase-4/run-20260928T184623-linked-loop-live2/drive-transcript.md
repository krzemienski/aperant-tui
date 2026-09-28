# Drive transcript — Phase 4 linked loop (observe → act ledger)

Harness: `tools/tui-capture.py` — a REAL tmux PTY (200x50), `capture-pane -e`
for the rendered grid, headless chromium for true PNGs. The app sees `isTTY`
on both stdin and stdout; nothing is piped (Iron Rule 1). Every wait below is
a `cmd_wait` whose exit code reflects the CONDITION, not transport, and every
result JSON is quoted verbatim — `matched:true` is asserted, never assumed.

Target project: `/Users/nick/Desktop/vigil` (a real git repo with real source).
Provider: `ANTHROPIC_BASE_URL=https://router.hack.ski`, `APERANT_MODEL=cc/claude-opus-5`.
Token: read from the operator env with `zsh -lc` and passed only at
`session start --env` (exported INSIDE the pane), so it never appears in argv,
`ps` output, the captured grid, or any committed file.
`APERANT_USER_DATA` points OUTSIDE the repo (`/tmp/aperant-userdata-<run>`) so
the live `settings.json` (which carries a real apiKey) can never be committed;
only a redacted copy is emitted into this run root.

## Sessions

| session | why it exists | fate |
|---|---|---|
| `ap4` | first boot, pre-fix code | killed after defects D1–D3 were identified |
| `ap5` | post-D1/D2/D3 restart | killed; its generation was in-process and died with it |
| `aporph` | synthetic orphan fixture (throwaway project) | killed after proving the liveness gate |
| `ap6` | post-fix, full regeneration | killed after it exposed D4 (frame overflow) |
| `ap7` | post-D4 restart — the run this evidence is drawn from | see below |

## Ledger

| # | Act (keys) | Observe (anchor) | Result |
|---|---|---|---|
| 1 | `session start ap4 200x50 … -- npx tsx src/cli.tsx --project ~/Desktop/vigil` | `APERANT` | `{"matched": true, "anchor": "APERANT", "waited_s": 0.01}` |
| 2 | `6` (settings) | `ACCOUNTS` | `{"matched": true, "anchor": "ACCOUNTS", "waited_s": 0.01}` |
| 3 | `a` (provision anthropic router account FROM ENV) | `router.hack.ski` | `{"matched": true, "anchor": "router.hack.ski", "waited_s": 0.01}` |
| 4 | — (read disk) | settings.json | queue head `anthropic-mu76gy5z → https://router.hack.ski/v1`; on-screen: `anthropic account updated: anthropic-mu76gy5z → https://router.hack.ski/v1` |
| 5 | `3` (roadmap) | `PHASES` | `{"matched": true, "anchor": "PHASES", "waited_s": 0.01}` |
| 6 | `G` (force regenerate) | `RUNNING · ` | `{"matched": true, "anchor": "RUNNING \u00b7 ", "waited_s": 0.01}` |
| 7 | `7` (agents) | `swarm` | `{"matched": true, "anchor": "swarm", "waited_s": 0.01}` — **D1 caught here**: `LIVE TOOL TRACE / no events yet`, `Σ tokens 0`, `STEPS 0/1000` while the roadmap was demonstrably tool-calling |
| 8 | `Escape`, `3` | `GENERATION` | `{"matched": false, "anchor": "GENERATION", "timedOut": true}` — **D2 caught here**: the panel vanished on remount even though the run was live |
| 9 | `session start ap7 …` (post-fix) | `APERANT` | `{"matched": true, "anchor": "APERANT", "waited_s": 0.01}` |
| 10 | `3` (roadmap, with a REAL orphan progress file on disk from killed ap6) | `RUNNING · ` count | `0` — orphan correctly renders idle (liveness gated on the manager, not the file) |
| 11 | `G` (force regenerate) | `RUNNING · ` | `{"matched": true, "anchor": "RUNNING \u00b7 ", "waited_s": 0.01}` |
| 12 | — (frame integrity) | `^┌` row count | `1` (was `34` stacked repaints pre-D4-fix) |
