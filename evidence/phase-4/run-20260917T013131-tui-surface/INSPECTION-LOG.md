# Per-image inspection log — all 66 PNGs viewed

Method: 14 images opened individually at full size; the remaining 52 viewed in
11 six-up contact sheets (`/tmp/sheets/sheet-00..10.png`, legible at full size).
Every image was looked at. This log records what each one actually shows,
including the ones whose filename does not match their content.

An earlier pass used a programmatic proxy (distinct-colour count ≥40 + the
string `APERANT` in the paired `.txt`). **That proxy passed 66/66 and was
wrong** — it cannot tell "renders a panel" from "renders an EMPTY panel", which
is exactly how the D20 UI/UX defect (`no findings for this type yet`) survived
it. Visual inspection is the only check that catches a well-formed screen with
missing content.

## Outcome summary

| Outcome | Count |
|---|---|
| Shows what the filename claims, content correct | 58 |
| Correct render, **filename does not match content** (see below) | 6 |
| Deliberate before-state capture (defect visible on purpose) | 2 |
| Blank / corrupt / failed render | **0** |

## Mislabeled captures (content is real; the step name is wrong)

Caused by my own early driving contamination: a palette `Enter` left focus
elsewhere, so the next digit keystrokes did not land on the tab I intended.
Kept as-is rather than renamed, because the VERDICT cites these paths and the
images are genuine TUI frames either way.

| File | Filename claims | Actually shows |
|---|---|---|
| `vigil/step-11-theme-matrix.png` | board in matrix theme | agents view in matrix theme (theme switch still proven — compare step-10) |
| `vigil/step-12-nav-j.png` | board after `j` | agents view |
| `ar/step-13-logs.png` | task logs | agents view (AGENT SWARM empty state) |
| `ar/step-21-insights-question.png` | typed question | help overlay (the D18 defect firing) |
| `pp/step-05-tree.png` | worktree view | chat/ideation view |
| `pp/step-06-set.png`, `pp/step-07-agents.png` | settings / agents | chat/ideation view |

Each of those surfaces IS proven elsewhere: worktrees by `ar/step-05-tree.png`
(real `head 15c94710a6`), settings by `pp/step-06-set-accounts.png` and
`vigil/step-15-settings-account.png`, agents by the six
`vigil/step-18-agents-*` sub-views, logs by `vigil/step-13-logs.png`
(`TASK LOGS · 003-cont · 0 lines`) and `pp/step-13-logs.png`.

## Deliberate before-state captures

| File | Shows |
|---|---|
| `ar/step-23-defect-question-mark.png` | D18 before the fix: typing `?` opened the help overlay mid-question |
| `vigil/step-14-defect-digit-trap.png` | D14 before the fix: `1` could not leave the agents tab |

Paired after-states: `ar/step-26-d18-fixed-question-typed.png`,
`vigil/step-25-d14-fixed-escape-digit.png`.

## Pre-fix vs post-fix hint text

Captures taken before D17/D20 show the old strings (`/ filter`,
`a add Moonshot acct`, `IDEATION · five types`); captures taken after show the
corrected ones (`l logs`, `a Anthropic acct · m Moonshot acct`,
`IDEATION · 6 types`). Both states are visible in the set and the contrast is
itself the proof that the fix landed.

## Notable content confirmed by eye

- **vigil** (30): 3 real specs; roadmap 5 phases / 26 features; all six agents
  sub-views with real data (SWARM VITALS, ORCHESTRATION GRAPH phase pipeline,
  INSPECT tool grants, EVENT TRACE, TOKEN LEDGER, BLOCKING ANALYSIS with
  escalation thresholds); pre-D19 API-key stack traces in steps 16/17/19/20 and
  post-D19 clean runs in 27/28/29 (27.1k tokens, 588 events).
- **awesome-researcher** (21): board on `feat/awesome-researcher`; roadmap
  4 phases / 26 features; worktree `head 15c94710a6`; settings showing the
  provisioned anthropic account at `127.0.0.1:20128/v1`; insights answer citing
  `main.py:1608 cli_main`; all six ideation categories with 5 findings each.
- **proofpunk-agent** (15): board with the 3 fixture specs; roadmap generating
  live (`RUNNING · discovery 30%`) and its 4-phase result; real shell pane
  running `ls proofpunk_agent`; amber theme applied via `:theme amber`.

## Sheets

`/tmp/sheets/sheet-00.png` … `sheet-10.png` (6 images each, 66 total). These are
a viewing aid only and are not part of the sealed evidence set.
