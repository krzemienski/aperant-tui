# VERDICT — Phase 5: tuistory-driven linked workflow across 3 real codebases

Harness: **tuistory 0.11.0** (`/Users/nick/.bun/bin/tuistory`), skill installed via
`npx -y skills add remorses/tuistory` → `.agents/skills/tuistory`.
Driver: `tools/tuistory_drive.py` (launch / wait / press / type / snapshot / read / screenshot).
Router: local gateway `http://127.0.0.1:20128/v1`, model `glm/glm-5`, token via
`ANTHROPIC_AUTH_TOKEN` env only — never written to the repo (secret scan: 0 matches).

**106 screenshots, 224 artifacts, 0 blank, 0 wrong-project, 0 secrets.**

## Per-criterion

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | TUI launches against a real project, correct identity/branch | **PASS** | 3 projects: `vigil /Users/nick/Desktop/vigil ⑂ main`, `awesome-researcher … ⑂ feat/awesome-researcher`, `hunter-seed … ⑂ main` |
| 2 | All 7 screens render | **PASS** | 21 captures (7 × 3 projects), each anchor-gated |
| 3 | Roadmap generates from real codebase analysis | **PASS** | hunter-seed 5 phases/14 features (gVisor sandbox, canary suite — real to that repo); AR 4 phases/13 features regenerated this session |
| 4 | Visible streaming during generation | **PASS** | `RUNNING · discovery 30%` → `features 50%` with progress bars, captured live |
| 5 | Insights answers with a correct file reference | **PASS** | AR → `awesome_researcher/agents/validator.py` (verified: `class Validator` at :67). hunter-seed → `targets/canary/config.yaml` (verified on disk) |
| 6 | Ideation returns findings in all 6 categories | **PASS** | AR 6/6 and hunter-seed 6/6 `*_ideas.json` written; all 6 render non-blank in UI (12 captures) |
| 7 | Roadmap item → task spec → agent execution | **PASS** | hunter-seed `c` → `001-guided-quickstart-skill`; AR `c` → `004-awesome-list-parsing-and-category-extraction`; both started with `s` |
| 8 | Agent produces a real work product on disk | **PASS** | vigil 8 commits / 439 insertions; hunter-seed 4 / 344; AR 3 / 342. Diffs at `<project>/work-product.diff` |
| 9 | Agent tracing live during the run | **PASS** | All 6 sub-views × 3 projects; trace view showed 364 and 1864 real events with Bash/Edit tool calls |
| 10 | Lifecycle persists across restart | **PASS** | vigil relaunched, 4 tasks + statuses intact |
| 11 | Regression | **PASS** | `tsc --noEmit` exit 0; `npm run build` OK; vitest: **0 new failures** vs HEAD baseline (HEAD 41 failed / tree 35 failed, identical 11 suites — pre-existing) |
| 12 | No secrets in evidence | **PASS** | 0 matches across 224 artifacts |

## Defects found and fixed this run

| ID | Defect | Fix |
|---|---|---|
| **D22** | 60s stream watchdog **enclosed** 600s tool timeouts — any tool call >60s killed the session by design; healthy sessions also died at ~62k prompt tokens | Wait-state-aware budget: 180s provider / 660s while a tool runs; error now reports the budget that actually fired (`runner.ts`) |
| **D23** | Worktree branches auto-pushed to origin; `ExecutionOptions.pushNewBranches` was declared and threaded but **ignored** at the call site | Caller's choice honoured; TUI passes `false`. Proven: `Leaving branch local-only (auto-push disabled)`, 0 remote branches |
| **D24** | `glm/glm-5` unmapped → `No available account in provider queue` → silent fallback to unauthenticated legacy path | `'glm/' → anthropic` in MODEL_PROVIDER_MAP (`glm-` still → zai). Live: `Resolved auth … model=glm/glm-5` |
| **D21b** | AI SDK warnings flooded the frame from **worker threads** (own `globalThis`, so the main-thread fix didn't apply) | Suppress in `worker.ts` |
| **D28** | `baseBranch` hardcoded `'main'`; AR's default is `feat/awesome-researcher` → `fatal: invalid reference: main` | `detectDefaultBranch()`: origin/HEAD → current branch → 'main' |
| **D29** | Worktree failure **silently fell back to the project root** — the AR coder committed onto the user's real branch | Fail closed: throw unless `useWorktree:false` is explicit |

### D29 incident — disclosed

Before the fix, AR's coder committed `f44a411` directly onto the user's
`feat/awesome-researcher`. Work **preserved** (branch `ar-agent-work-preserved` +
`0001-*.patch`), user branch reset to `15c9471`, agent re-run in a proper isolated
worktree. No remote was touched.

## Known issues (not fixed)

- **D26** — `generation_progress.json` keeps `is_running: true` after completion; the
  banner goes stale until the view is re-entered. Cosmetic; roadmap itself is correct.
- **D27** — `g` silently no-ops when a roadmap already exists; `G` (refresh) is required.
  Discoverable only from the footer.
- Pre-existing: 11 vitest suites fail at HEAD, unchanged by this work.
