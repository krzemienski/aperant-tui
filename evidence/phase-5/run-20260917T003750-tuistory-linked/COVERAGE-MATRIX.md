# Coverage matrix — tuistory-driven TUI proof

Run: `run-20260917T003750-tuistory-linked`  ·  harness: **tuistory 0.11.0** (`tuistory launch/wait/press/type/snapshot/read/screenshot`)

Every row is an anchor-gated capture: the driver waited for a pattern proving the
expected state was on screen BEFORE shooting. `.txt` beside each PNG is the frame
text at capture time — independently checkable.

| # | project | file | keys sent | anchor matched | bytes |
|---|---|---|---|---|---|
| 1 | vigil | `vigil/step-01-board.png` | `1` | True | 134,160 |
| 2 | vigil | `vigil/step-02-term.png` | `2` | True | 100,104 |
| 3 | vigil | `vigil/step-03-road.png` | `3` | True | 203,382 |
| 4 | vigil | `vigil/step-04-chat.png` | `4` | True | 78,513 |
| 5 | vigil | `vigil/step-05-tree.png` | `escape,5` | True | 151,811 |
| 6 | vigil | `vigil/step-06-set.png` | `6` | True | 135,498 |
| 7 | vigil | `vigil/step-07-agents.png` | `7` | True | 101,186 |
| 8 | vigil | `vigil/step-08-road-detail.png` | `(on road)` | None | 0 |
| 9 | vigil | `vigil/step-09-road-detail.png` | `escape,3` | True | 203,382 |
| 10 | vigil | `vigil/step-10-board-before-start.png` | `(relaunch)` | True | 141,883 |
| 11 | vigil | `vigil/step-11-agent-started.png` | `s` | None | 426,902 |
| 12 | vigil | `vigil/step-12-agents-swarm.png` | `escape,7` | True | 430,527 |
| 13 | vigil | `vigil/step-13-board-select-004.png` | `down,down,down` | True | 136,879 |
| 14 | vigil | `vigil/step-14-agent-004-started.png` | `s` | None | 532,772 |
| 15 | vigil | `vigil/step-15-agents-swarm.png` | `escape,7 then 1` | True | 1,367,784 |
| 16 | vigil | `vigil/step-16-agents-graph.png` | `escape,7 then 2` | True | 1,271,353 |
| 17 | vigil | `vigil/step-17-agents-inspect.png` | `escape,7 then 3` | None | 0 |
| 18 | vigil | `vigil/step-18-agents-trace.png` | `escape,7 then 4` | True | 1,633,167 |
| 19 | vigil | `vigil/step-19-agents-tokens.png` | `escape,7 then 5` | True | 1,404,461 |
| 20 | vigil | `vigil/step-20-agents-waits.png` | `escape,7 then 6` | True | 1,502,766 |
| 21 | vigil | `vigil/step-21-agents-swarm-live.png` | `1 (bare digit, no escape)` | True | 1,659,749 |
| 22 | vigil | `vigil/step-22-agents-graph-live.png` | `2 (bare digit, no escape)` | True | 1,556,097 |
| 23 | vigil | `vigil/step-23-agents-inspect-live.png` | `3 (bare digit, no escape)` | None | 0 |
| 24 | vigil | `vigil/step-24-agents-trace-live.png` | `4 (bare digit, no escape)` | True | 1,996,970 |
| 25 | vigil | `vigil/step-25-agents-tokens-live.png` | `5 (bare digit, no escape)` | True | 1,690,096 |
| 26 | vigil | `vigil/step-26-agents-waits-live.png` | `6 (bare digit, no escape)` | True | 1,766,881 |
| 27 | vigil | `vigil/step-27-agents-swarm.png` | `7 then 1` | None | 699,533 |
| 28 | vigil | `vigil/step-28-agents-graph.png` | `7 then 2` | None | 567,463 |
| 29 | vigil | `vigil/step-29-agents-inspect.png` | `7 then 3` | None | 688,973 |
| 30 | vigil | `vigil/step-30-agents-trace.png` | `7 then 4` | None | 758,762 |
| 31 | vigil | `vigil/step-31-agents-tokens.png` | `7 then 5` | None | 578,389 |
| 32 | vigil | `vigil/step-32-agents-waits.png` | `7 then 6` | None | 697,155 |
| 33 | vigil | `vigil/step-33-agents-swarm-verified.png` | `7 then 1` | True | 740,962 |
| 34 | vigil | `vigil/step-34-agents-graph-verified.png` | `7 then 2` | True | 660,498 |
| 35 | vigil | `vigil/step-35-agents-inspect-verified.png` | `7 then 3` | True | 764,173 |
| 36 | vigil | `vigil/step-36-agents-trace-verified.png` | `7 then 4` | True | 811,524 |
| 37 | vigil | `vigil/step-37-agents-tokens-verified.png` | `7 then 5` | True | 652,623 |
| 38 | vigil | `vigil/step-38-agents-waits-verified.png` | `7 then 6` | True | 733,607 |
| 39 | vigil | `vigil/step-39-lifecycle-after-restart.png` | `(relaunch)` | True | 141,883 |
| 40 | vigil | `vigil/step-40-logs-view.png` | `l` | True | 60,698 |
| 41 | vigil | `vigil/step-41-help-overlay.png` | `?` | True | 106,630 |
| 42 | vigil | `vigil/step-42-command-palette.png` | `:` | None | 148,552 |
| 1 | awesome-researcher | `awesome-researcher/step-01-board.png` | `1` | True | 136,551 |
| 2 | awesome-researcher | `awesome-researcher/step-02-term.png` | `2` | True | 104,554 |
| 3 | awesome-researcher | `awesome-researcher/step-03-road.png` | `3` | True | 198,643 |
| 4 | awesome-researcher | `awesome-researcher/step-04-chat.png` | `4` | True | 83,592 |
| 5 | awesome-researcher | `awesome-researcher/step-05-tree.png` | `escape,5` | True | 83,953 |
| 6 | awesome-researcher | `awesome-researcher/step-06-set.png` | `6` | True | 140,014 |
| 7 | awesome-researcher | `awesome-researcher/step-07-agents.png` | `7` | True | 105,320 |
| 8 | awesome-researcher | `awesome-researcher/step-08-road-generating.png` | `escape,3 then g` | True | 233,974 |
| 9 | awesome-researcher | `awesome-researcher/step-09-road-streaming.png` | `G (refresh)` | True | 225,388 |
| 10 | awesome-researcher | `awesome-researcher/step-10-road-complete.png` | `1 then 3` | True | 210,627 |
| 11 | awesome-researcher | `awesome-researcher/step-11-road-converted.png` | `c` | True | 215,423 |
| 12 | awesome-researcher | `awesome-researcher/step-12-board-with-spec.png` | `1` | True | 145,182 |
| 13 | awesome-researcher | `awesome-researcher/step-13-agent-started.png` | `down x N, s` | None | 651,404 |
| 14 | awesome-researcher | `awesome-researcher/step-14-agents-swarm.png` | `escape,7 then 1` | True | 766,743 |
| 15 | awesome-researcher | `awesome-researcher/step-15-agents-graph.png` | `escape,7 then 2` | True | 660,455 |
| 16 | awesome-researcher | `awesome-researcher/step-16-agents-inspect.png` | `escape,7 then 3` | True | 754,345 |
| 17 | awesome-researcher | `awesome-researcher/step-17-agents-trace.png` | `escape,7 then 4` | True | 850,314 |
| 18 | awesome-researcher | `awesome-researcher/step-18-agents-tokens.png` | `escape,7 then 5` | True | 634,605 |
| 19 | awesome-researcher | `awesome-researcher/step-19-agents-waits.png` | `escape,7 then 6` | True | 714,799 |
| 20 | awesome-researcher | `awesome-researcher/step-20-insights-question.png` | `escape,4 then q,a + typed question` | None | 715,471 |
| 21 | awesome-researcher | `awesome-researcher/step-21-insights-answer.png` | `enter` | True | 855,023 |
| 22 | awesome-researcher | `awesome-researcher/step-22-ideation-code-improvements.png` | `i then 1` | None | 1,056,565 |
| 23 | awesome-researcher | `awesome-researcher/step-23-ideation-ui-ux.png` | `i then 2` | None | 1,079,208 |
| 24 | awesome-researcher | `awesome-researcher/step-24-ideation-docs-gaps.png` | `i then 3` | None | 1,070,672 |
| 25 | awesome-researcher | `awesome-researcher/step-25-ideation-security.png` | `i then 4` | None | 1,070,041 |
| 26 | awesome-researcher | `awesome-researcher/step-26-ideation-performance.png` | `i then 5` | None | 1,068,637 |
| 27 | awesome-researcher | `awesome-researcher/step-27-ideation-code-quality.png` | `i then 6` | None | 1,072,362 |
| 28 | awesome-researcher | `awesome-researcher/step-28-agent-isolated-start.png` | `s (after D28/D29 fix)` | None | 736,744 |
| 29 | awesome-researcher | `awesome-researcher/step-29-agents-swarm-isolated.png` | `escape,7 then 1` | True | 1,033,086 |
| 30 | awesome-researcher | `awesome-researcher/step-30-agents-graph-isolated.png` | `escape,7 then 2` | True | 908,071 |
| 31 | awesome-researcher | `awesome-researcher/step-31-agents-inspect-isolated.png` | `escape,7 then 3` | True | 1,016,706 |
| 32 | awesome-researcher | `awesome-researcher/step-32-logs-view.png` | `1 then l` | True | 1,849,709 |
| 33 | awesome-researcher | `awesome-researcher/step-33-help-overlay.png` | `?` | True | 1,895,519 |
| 34 | awesome-researcher | `awesome-researcher/step-34-command-palette.png` | `:` | None | 1,942,082 |
| 1 | hunter-seed | `hunter-seed/step-01-board.png` | `1` | True | 83,808 |
| 2 | hunter-seed | `hunter-seed/step-02-term.png` | `2` | True | 100,857 |
| 3 | hunter-seed | `hunter-seed/step-03-road.png` | `3` | True | 89,686 |
| 4 | hunter-seed | `hunter-seed/step-04-chat.png` | `4` | True | 79,831 |
| 5 | hunter-seed | `hunter-seed/step-05-tree.png` | `escape,5` | True | 84,360 |
| 6 | hunter-seed | `hunter-seed/step-06-set.png` | `6` | True | 136,269 |
| 7 | hunter-seed | `hunter-seed/step-07-agents.png` | `7` | True | 101,924 |
| 8 | hunter-seed | `hunter-seed/step-08-road-generating.png` | `g` | None | 114,019 |
| 9 | hunter-seed | `hunter-seed/step-09-road-stream-1.png` | `(watching)` | None | 130,095 |
| 10 | hunter-seed | `hunter-seed/step-10-road-stream-2.png` | `(watching)` | None | 130,095 |
| 11 | hunter-seed | `hunter-seed/step-11-road-stream-3.png` | `(watching)` | None | 130,095 |
| 12 | hunter-seed | `hunter-seed/step-12-road-complete.png` | `G (refresh)` | True | 207,413 |
| 13 | hunter-seed | `hunter-seed/step-13-road-streaming-live.png` | `g then x` | True | 222,514 |
| 14 | hunter-seed | `hunter-seed/step-14-road-complete.png` | `1 then 3 (re-read disk)` | True | 180,021 |
| 15 | hunter-seed | `hunter-seed/step-15-road-converted.png` | `c` | True | 182,176 |
| 16 | hunter-seed | `hunter-seed/step-16-board-with-spec.png` | `1` | True | 111,000 |
| 17 | hunter-seed | `hunter-seed/step-17-agents-swarm.png` | `escape,7 then 1` | True | 2,781,417 |
| 18 | hunter-seed | `hunter-seed/step-18-agents-graph.png` | `escape,7 then 2` | True | 2,684,260 |
| 19 | hunter-seed | `hunter-seed/step-19-agents-inspect.png` | `escape,7 then 3` | True | 2,792,780 |
| 20 | hunter-seed | `hunter-seed/step-20-agents-trace.png` | `escape,7 then 4` | True | 2,862,945 |
| 21 | hunter-seed | `hunter-seed/step-21-agents-tokens.png` | `escape,7 then 5` | True | 2,658,514 |
| 22 | hunter-seed | `hunter-seed/step-22-agents-waits.png` | `escape,7 then 6` | True | 2,739,520 |
| 23 | hunter-seed | `hunter-seed/step-23-insights-answer.png` | `escape,4 then q,a,<question>,enter` | None | 2,693,844 |
| 24 | hunter-seed | `hunter-seed/step-24-ideation-code-improvements.png` | `i then 1` | None | 2,768,443 |
| 25 | hunter-seed | `hunter-seed/step-25-ideation-ui-ux.png` | `i then 2` | None | 2,756,624 |
| 26 | hunter-seed | `hunter-seed/step-26-ideation-docs-gaps.png` | `i then 3` | None | 2,773,583 |
| 27 | hunter-seed | `hunter-seed/step-27-ideation-security.png` | `i then 4` | None | 2,773,174 |
| 28 | hunter-seed | `hunter-seed/step-28-ideation-performance.png` | `i then 5` | None | 2,778,528 |
| 29 | hunter-seed | `hunter-seed/step-29-ideation-code-quality.png` | `i then 6` | None | 2,771,076 |
| 30 | hunter-seed | `hunter-seed/step-30-logs-view.png` | `1 then l` | True | 2,614,446 |
| 31 | hunter-seed | `hunter-seed/step-31-help-overlay.png` | `?` | True | 2,659,892 |
| 32 | hunter-seed | `hunter-seed/step-32-command-palette.png` | `:` | None | 2,671,489 |
