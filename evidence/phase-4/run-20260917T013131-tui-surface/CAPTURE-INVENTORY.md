# Capture inventory — 67 PNGs, in capture order

Order is by file mtime (the moment the PNG was written). `View` is derived from
the paired `.txt` — the frame text captured at the same instant — so it reports
what was ACTUALLY on screen, not what the filename claims.

## Input provenance — read this before trusting any key column

Keystrokes were sent by `tools/tui-capture.py session keys|type`, invoked from
Python driver cells. **The driver did not log each keystroke to a per-capture
file.** The `Keys` column below is therefore reconstructed from the driver code
that produced each capture, not read back from a recorded input log. Treat it as
author-asserted. What IS independently verifiable for every row: the PNG, its
paired `.txt` frame text, the mtime, and the sha256 in `MANIFEST.json`.

Where a capture's frame disagrees with its filename, the `View` column shows the
disagreement — see INSPECTION-LOG.md for the seven that were re-driven.

| # | time | file | view on screen (from .txt) | bytes |
|---|---|---|---|---|
| 1 | 21:31:32 | `vigil/step-01-board.png` | board | 158,842 |
| 2 | 21:32:05 | `vigil/step-02-term.png` | term | 89,327 |
| 3 | 21:32:08 | `vigil/step-03-road.png` | road | 256,418 |
| 4 | 21:32:10 | `vigil/step-05-tree.png` | tree | 174,829 |
| 5 | 21:32:13 | `vigil/step-06-set.png` | set | 153,123 |
| 6 | 21:32:15 | `vigil/step-07-agents.png` | agents | 122,297 |
| 7 | 21:33:04 | `vigil/step-08-help-overlay.png` | help overlay | 140,387 |
| 8 | 21:33:07 | `vigil/step-09-palette-open.png` | agents | 125,279 |
| 9 | 21:33:09 | `vigil/step-10-palette-typed.png` | agents | 115,708 |
| 10 | 21:33:12 | `vigil/step-11-theme-matrix.png` | agents | 123,853 |
| 11 | 21:33:13 | `vigil/step-12-nav-j.png` | agents | 124,086 |
| 12 | 21:33:22 | `vigil/step-14-defect-digit-trap.png` | agents | 124,629 |
| 13 | 21:33:51 | `vigil/step-13-logs.png` | logs | 67,664 |
| 14 | 21:33:53 | `vigil/step-12-nav-jj.png` | board | 154,475 |
| 15 | 21:33:56 | `vigil/step-04-chat.png` | chat/insights | 83,333 |
| 16 | 21:36:08 | `vigil/step-15-settings-account.png` | set | 160,177 |
| 17 | 21:39:10 | `vigil/step-17-agent-running.png` | board | 482,381 |
| 18 | 21:39:15 | `vigil/step-18-agents-1-swarm.png` | agents | 459,666 |
| 19 | 21:39:17 | `vigil/step-18-agents-2-graph.png` | agents/graph | 396,906 |
| 20 | 21:39:19 | `vigil/step-18-agents-3-inspect.png` | ? | 327,825 |
| 21 | 21:39:22 | `vigil/step-18-agents-4-trace.png` | agents/trace | 268,581 |
| 22 | 21:39:24 | `vigil/step-18-agents-5-tokens.png` | agents/tokens | 203,400 |
| 23 | 21:39:27 | `vigil/step-18-agents-6-waits.png` | agents/waits | 296,579 |
| 24 | 21:41:53 | `vigil/step-16-agent-start.png` | board | 631,042 |
| 25 | 21:41:56 | `vigil/step-19-agents-live-run.png` | agents | 677,160 |
| 26 | 21:41:58 | `vigil/step-20-agents-tokens.png` | agents/tokens | 563,420 |
| 27 | 21:42:38 | `ar/step-21-insights-question.png` | help overlay | 125,215 |
| 28 | 21:43:02 | `ar/step-23-defect-question-mark.png` | help overlay | 125,215 |
| 29 | 21:50:08 | `ar/step-22-insights-streaming.png` | chat/insights | 99,469 |
| 30 | 21:50:48 | `ar/step-24-insights-answer.png` | chat/insights | 315,257 |
| 31 | 21:51:45 | `pp/step-21-roadmap-generating.png` | road | 204,951 |
| 32 | 21:53:14 | `pp/step-22-roadmap-result.png` | road | 560,537 |
| 33 | 21:53:37 | `vigil/step-25-d14-fixed-escape-digit.png` | board | 153,366 |
| 34 | 21:56:30 | `ar/step-01-board.png` | board | 325,957 |
| 35 | 21:56:33 | `ar/step-02-term.png` | term | 111,860 |
| 36 | 21:56:35 | `ar/step-03-road.png` | road | 251,320 |
| 37 | 21:56:47 | `ar/step-08-help.png` | help overlay | 139,560 |
| 38 | 21:56:50 | `ar/step-09-palette.png` | agents | 140,545 |
| 39 | 21:57:09 | `pp/step-01-board.png` | board | 484,476 |
| 40 | 21:57:12 | `pp/step-02-term.png` | term | 107,571 |
| 41 | 21:57:14 | `pp/step-03-road.png` | road | 226,464 |
| 42 | 21:57:17 | `pp/step-04-chat.png` | chat/insights | 105,326 |
| 43 | 21:57:30 | `pp/step-08-help.png` | help overlay | 135,078 |
| 44 | 21:57:33 | `pp/step-09-palette.png` | board | 176,292 |
| 45 | 21:57:37 | `pp/step-11-theme-amber.png` | board | 176,559 |
| 46 | 21:57:41 | `pp/step-13-logs.png` | logs | 86,812 |
| 47 | 21:58:10 | `pp/step-06-set-accounts.png` | set | 173,151 |
| 48 | 21:58:45 | `pp/step-02-term-live-shell.png` | term | 131,998 |
| 49 | 22:02:29 | `ar/step-26-d18-fixed-question-typed.png` | chat/insights | 98,890 |
| 50 | 22:08:02 | `vigil/step-27-d19-agent-planning.png` | board | 779,227 |
| 51 | 22:08:05 | `vigil/step-28-d19-agents-live.png` | agents | 525,908 |
| 52 | 22:08:08 | `vigil/step-29-d19-trace-clean.png` | agents/trace | 643,103 |
| 53 | 22:13:03 | `ar/step-30-ideation-running.png` | chat/insights | 100,935 |
| 54 | 22:25:47 | `ar/step-31-ideation-1-code-improvements.png` | chat/ideation | 249,680 |
| 55 | 22:25:50 | `ar/step-31-ideation-2-ui-ux.png` | chat/ideation | 249,417 |
| 56 | 22:25:53 | `ar/step-31-ideation-3-docs-gaps.png` | chat/ideation | 266,710 |
| 57 | 22:25:56 | `ar/step-31-ideation-4-security.png` | chat/ideation | 271,943 |
| 58 | 22:25:59 | `ar/step-31-ideation-5-performance.png` | chat/ideation | 261,055 |
| 59 | 22:26:02 | `ar/step-31-ideation-6-code-quality.png` | chat/ideation | 277,887 |
| 60 | 22:31:50 | `ar/step-05-tree.png` | tree | 110,218 |
| 61 | 22:31:54 | `ar/step-06-set.png` | set | 177,027 |
| 62 | 22:31:57 | `ar/step-07-agents.png` | agents | 133,608 |
| 63 | 22:32:17 | `ar/step-13-logs.png` | logs | 76,619 |
| 64 | 22:32:21 | `pp/step-05-tree.png` | tree | 96,703 |
| 65 | 22:32:24 | `pp/step-06-set.png` | set | 171,574 |
| 66 | 22:32:27 | `pp/step-07-agents.png` | agents | 127,587 |
| 67 | 23:57:17 | `ar/step-32-d21-clean-frame.png` | chat/insights | 111,183 |

## Launch commands (one per project, verbatim)

```bash
# every session; CI stripping happens INSIDE the pane (see tui-capture.py)
# The auth token is passed with a --env flag whose name is ANTHROPIC_AUTH_TOKEN
# and whose value is read from the shell environment, never written literally.
python3 tools/tui-capture.py session start <name> 200x50 apps/tui \
  --env ANTHROPIC_BASE_URL=http://127.0.0.1:20128/v1 \
  --env ANTHROPIC_DEFAULT_SONNET_MODEL=glm/glm-5 \
  -- npx tsx src/cli.tsx <PROJECT>

# PROJECT, per session:
#   /Users/nick/Desktop/vigil
#   /Users/nick/awesome-researcher
#   /Users/nick/proofpunk-agent
```

Boot was gated on a matched anchor before any key was sent:
`session wait <name> BACKLOG 300` → `{"matched": true, "anchor": "BACKLOG", "waited_s": 1.03}`.
A `matched: false` result aborts the capture rather than shooting a blank frame.
