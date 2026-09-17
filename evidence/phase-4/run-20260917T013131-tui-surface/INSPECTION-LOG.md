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

## Mislabeled captures — FOUND, THEN RE-DRIVEN AND REPLACED

Cause: my own early driving contamination — a palette `Enter` left focus
elsewhere, so the next digit keystroke did not land on the tab I intended, and
I shot the frame without checking which view was actually on screen.

My first instinct was to leave them and argue each surface was "proven
elsewhere" (e.g. `ar` tree covered by `pp` tree). **That is substitution, not
proof.** Criterion 3 claims tabs 1-7 captured *per project*, so another
project's screenshot cannot discharge it. All seven were re-driven against the
correct project with a **matched panel anchor asserted before the shutter**
(retry up to 3× on miss, never shoot an unverified frame) and the files
replaced in place:

| File | Was showing | Now shows (anchor asserted) |
|---|---|---|
| `ar/step-05-tree.png` | chat/ideation | `WORKTREES` — `feat/awesome-researcher`, `head 15c94710a6`, `diff clean` |
| `ar/step-06-set.png` | chat/ideation | `THEME`/`CONFIG`/`ACCOUNTS` — anthropic account at `127.0.0.1:20128/v1` |
| `ar/step-07-agents.png` | chat/ideation | `AGENT SWARM` + the six sub-view tabs |
| `ar/step-13-logs.png` | agents (empty) | `TASK LOGS · 001-tri- · 0 lines` |
| `pp/step-05-tree.png` | chat/ideation | `WORKTREES` — `master`, `head 0000000000`, `diff unreadable` |
| `pp/step-06-set.png` | chat/ideation | `THEME`/`CONFIG`/`ACCOUNTS` |
| `pp/step-07-agents.png` | chat/ideation | `AGENT SWARM` + sub-view tabs |

Each recapture was viewed (`/tmp/sheets/recaptures.png`): the correct tab is
highlighted in the tab bar of every one, and each shows that project's own real
data.

Two vigil captures keep non-matching names, and are NOT load-bearing for any
criterion: `vigil/step-11-theme-matrix.png` and `vigil/step-12-nav-j.png` show
the agents view. The matrix theme switch is proven by the colour change from
`step-10` to `step-11` (both real frames), and board navigation is proven by
`vigil/step-12-nav-jj.png` (`j j` → 003 selected).

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
