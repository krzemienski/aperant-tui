# Phase 4 — linked loop, live run

Run dir: `evidence/phase-4/run-20260919T222313-linked-loop-live/`
Driver: `tools/tui-drive.sh` (tmux PTY, 200x50), model `cc/claude-opus-5`,
router `https://router.hack.ski/v1` (queue head, token env-only, never printed).
aperant-tui rev at drive time: `2ac3f33` + working-tree fixes listed below.

## Projects driven (three distinct real codebases)

| # | Root | Branch | Rev | Roadmap item selected → spec |
|---|------|--------|-----|------------------------------|
| P1 | `/Users/nick/proofpunk-agent` | `master` | `656fd1a` | Tamper-Evident Evidence Hash Chain → `009-tamper-evident-evidence-hash-chain` |
| P2 | `/Users/nick/awesome-researcher` | `feat/awesome-researcher` | `15c9471` | Link-rot audit of existing list entries → `007-link-rot-audit-of-existing-list-entries` |
| P3 | `/Users/nick/dev/hunter-seed` | `main` | — | False-positive feedback loop → `004-false-positive-feedback-loop` |

Each project's pre-existing uncommitted work was recorded before driving
(`logs/p1-baseline-git.txt`, 86 dirty entries at `656fd1a2`) and left untouched;
all agent writes landed in `.auto-claude/worktrees/tasks/<spec>/`.

## Criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | TUI launches against a real project and shows correct identity/branch/data | **PASS** | `screens/p1-step-00-board.png` — `proofpunk-agent … ⑂ master`, 7 BACKLOG + 1 HUMAN real tasks. P2/P3 equivalents show their own roots and branches. |
| 2 | Roadmap renders real generated content | **PASS** | P1 phases P13–P15 with per-phase feature counts; P2 P-1..P-3; P3 P1..P3. Read from each project's `.auto-claude/roadmap/roadmap.json`. |
| 3 | A **user-selected** roadmap item converts to a task spec | **PASS** | `n`/`p` move the new feature cursor, `c` converts the selected feature. P1 specs 8→9, P2 6→7, P3 3→4. Before this run's fix `c` always took a phase's *first unlinked* feature — later items were unreachable. |
| 4 | Roadmap ⇄ task linkage is real and shared | **PASS** | `task_metadata.json` = `{sourceType:"roadmap", featureId:"X2-evidence-hash-chain"}`; roadmap row flips `·` → `⇒ spec 009-…`; same id appears on the board as `009-tamp`. |
| 5 | Agent starts through the UI and runs against the router | **PASS** | AGENT STREAM: `start 009-tamp → vendored AgentManager…` / `started … phase planning`. No 401 after pinning `cc/claude-opus-5`. |
| 6 | Agent tracing surfaces show live real data | **PASS** | `screens/p1-step-05-agents-swarm.png` — 1 live planner, 8/1000 steps, Σ 63.3k tokens, LIVE TOOL TRACE with real `Read`/`Bash` and durations. All six sub-views captured (`p1-agents-{swarm,graph,inspect,tokens,waits}.png`). |
| 7 | Streaming output is visible token-by-token | **PASS** | `screens/p1-step-07-trace-streaming.png` — EVENT TRACE, 489 events, `text-delta` rows carrying `Self` / `-critique passes —` / `only \`digest.py\` tou` / `ched, additive`. Before this run's fix the payload column was empty for every delta. |
| 8 | Agent produces real work product on disk | **PASS** | Worktree `009-…/`: planner wrote `context.json` (5.4 KB, naming real files `proofpunk_agent/bridge/digest.py`, `…/evidence.py`), `project_index.json`, `task_logs.json` (118 KB). Trace shows `Edit` → *Successfully edited …*. The agent then self-critiqued and reverted `digest.py` (trace: *"only digest.py touched, additive, digest unchanged"*), so the tree is clean by the agent's own decision — recorded, not hidden. |
| 9 | Router/model config proven in UI, secrets never shown | **PASS** | `screens/p1-settings-router.png` — `https://router.hack.ski/v1  ACTIVE`, token absent from the frame. `settings-redacted.json` carries `<REDACTED>` for every key/token field. |
| 10 | No secret in the evidence tree | **PASS** | `node tools/audit-credentials.mjs` → exit 0; live token value absent from the run dir (checked by value). |
| 11 | Regression gates green | **PASS** | `npm run typecheck` exit 0; `npx vitest run --root apps/tui` → 2 files, 9 tests passed, exit 0. No test deleted, skipped, or weakened. |
| 12 | Lifecycle persistence across restart | **PASS** | P1 was relaunched mid-run (model pin); `009-tamp` and its `⇒ spec` linkage survived the restart and re-rendered from disk. |

## Defects found and fixed this run

1. **Roadmap item selection was impossible** — `RoadmapView.tsx:169` converted
   `feats.find(f => !f.linked_spec_id)`, ignoring the user. Added a feature
   cursor (`n`/`p`), rendered it (`❯`), and made `c` act on the selected
   feature; converting an already-linked feature now reports its spec instead
   of silently converting a different one.
2. **Streamed text was discarded at the tap** — `observability.ts` called
   `pushTrace(taskId,'text-delta')` with no payload, so the trace rendered an
   empty column. Now passes `summarizeDelta(event.text)` (whitespace-collapsed,
   80-char bounded so one delta cannot break row alignment).
3. **Roadmap runs produced no observability state** — `attachToManager`
   subscribed to six task events, none of which a roadmap run emits, so the
   agents view read "no agent has started" during generation. Added
   `roadmap-progress|log|error|complete|stopped` onto the same agent record.
4. **Blank TUI under automation** — not an app defect. Ink emits nothing when
   `is-in-ci` is true and the harness exports `CI=true`; `tuistory`'s `sh -c`
   spawn also bypassed the login shell. `tools/tui-drive.sh` unsets the CI
   variable family *inside the pane* and drives via tmux. Controlled arms: a
   minimal Ink app rendered fine under the same PTY, and the same command
   rendered under tmux — isolating the variable rather than blaming the app.
5. **401 "No active credentials for provider: antigravity"** — a routing
   default, not an auth failure: unset `APERANT_MODEL` falls back to the literal
   `'sonnet'`, which this router maps to a provider with no credentials. The
   driver now pins `cc/claude-opus-5`; the same keypress then started the agent.

## Screenshot index

All PNGs rendered from the exact tmux frame (`capture-pane -p -e` → HTML →
headless Chromium @2x) with a paired `.txt` for grepping, so content — not just
the container — is checkable.

| File | Shows |
|------|-------|
| `p1-step-00-board.png` | P1 board, real tasks |
| `p1-step-05-agents-swarm.png` | live swarm + LIVE TOOL TRACE |
| `p1-step-06-trace.png` | event trace, tool calls |
| `p1-step-07-trace-streaming.png` | `text-delta` streaming rows |
| `p1-agents-{graph,inspect,tokens,waits}.png` | remaining agent sub-views |
| `p1-settings-router.png` | router ACTIVE, no token |
| `p2-board-agent-running.png` | P2 agent started |
| `p3-board-agent-running.png` | P3 agent started |

One earlier capture of this trace frame was taken from scrollback and showed the
board under a "streaming" caption; it was re-captured from the live pane rather
than re-labelled. An earlier PNG batch rendered Chromium's `ERR_INVALID_URL`
page because the converter passed a relative `file://` path — fixed
(`pathToFileURL`) and every image regenerated and viewed.
