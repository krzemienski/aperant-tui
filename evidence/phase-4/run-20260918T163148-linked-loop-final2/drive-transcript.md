# Drive transcript — every observe→act wait with its matched result

Tool: `tools/tui-capture.py` over a real tmux PTY (200x50), TUI booted with
`zsh -lc 'ANTHROPIC_BASE_URL=https://router.hack.ski APERANT_MODEL=cc/claude-opus-5 exec npm exec --workspace @aperant/tui -- aperant /Users/nick/Desktop/vigil'`
(token inherited from the login shell inside the pane; never in argv).

| # | Act (keys) | Observe wait (anchor) | Result JSON |
|---|---|---|---|
| 1 | boot (session start) | `APERANT` | `{"matched": true, "anchor": "APERANT", "waited_s": 1.56}` |
| 2 | `6` (settings) | `ACCOUNTS` | `{"matched": true, "anchor": "ACCOUNTS", "waited_s": 0.01}` |
| 3 | `a` (provision router) | `router.hack.ski` | `{"matched": true, "anchor": "router.hack.ski", "waited_s": 0.01}` — pane shows `anthropic account added: anthropic-mu76gy5z → https://router.hack.ski/v1`, ACTIVE at queue head |
| 4 | `3` (roadmap) | `ROAD` | `{"matched": true, "anchor": "ROAD", "waited_s": 0.01}` |
| 5 | `G` (force regen #1) | `analyzing` | `{"matched": false, "anchor": "analyzing", "timedOut": true}` — real 429 in GENERATION panel (preserved in `logs/roadmap-regen-429-screen.txt`) |
| 6 | `G` (regen #2 after 60s backoff) | `discovery` | `{"matched": true, "anchor": "discovery", "waited_s": 0.01}` — then both phases 429'd (preserved in `logs/roadmap-regen-429-retry.txt`) |
| 7 | `j j j j` + `k k k k` (navigate phases) | `Secret redaction` | `{"matched": true, "waited_s": 0.01}` |
| 8 | `c` (convert→spec) | `005` | `{"matched": true, "waited_s": 0.01}` — spec `005-secret-redaction-in-run-artifacts` on disk |
| 9 | `1` (board) | `BOARD` | `{"matched": true, "waited_s": 0.01}` |
| 10 | `j j j j` (select 005) | `005-secr` | `{"matched": true, "waited_s": 0.01}` |
| 11 | `s` (start agent run 1) | `phase planning` | `{"matched": true, "waited_s": 0.01}` — pane: `agent started — phase planning`; separate `BUILDING` wait honestly `{"matched": false, "timedOut": true}` (run 1 = 401 antigravity failover, fixed by env-model-default patch + rebuild + restart) |
| 12 | restart with patched bundle; `1`,`j×4` | `BOARD`, `005-secr` | both `{"matched": true}` |
| 13 | `s` (run 2, model now cc/*) | `phase planning` | `{"matched": true, "waited_s": 0.01}` — events: `model=cc/claude-opus-5`; ended 429 CODING_FAILED (rate limit) |
| 14 | `s` (run 3, final retry post-reset) | `phase planning` | `{"matched": true, "waited_s": 0.01}` — events: `model=cc/claude-opus-5`, 3 planner attempts, 429, CODING_FAILED, `exit code 1` |
| 15 | `7` (agents view) | `AGENTS` | `{"matched": true, "waited_s": 0.01}` — LIVE TOOL TRACE rendered runs 2+3 in real time |
| 16 | `l` from board on 005 | `LOGS` chrome | logs view rendered real flight-recorder events (bottom chrome `LOGS  j/k scroll · esc back`; `step-14-logs-view-005.png`) |

Every false match above is kept as-is: those are real timeouts on conditions that
did not hold (429 outage), never retried into a fake green.
