# Phase 4 PLAN — Roadmap, Insights, Ideation (real-project E2E)

Gate (verbatim, spec Part 6 / ROADMAP):

> Roadmap generates from real codebase analysis with visible streaming
> progress. Insights answers a real question about the actual codebase with
> a correct file reference. Ideation returns real findings in all five
> categories.

## Brainstorm contract

- **Outcome:** the verbatim gate above, proven end-to-end on a REAL user
  project (`~/Desktop/vigil`) driven as the end user through the TUI
  (tuistory driver), with the roadmap→spec→board chain linked and exercised.
- **Constraints:** Iron Rule (no mocks/stubs); vendored sources unmodified
  outside catalogued patches; account provisioning through the TUI's own
  `a` flow (settings.json written by the app, never by hand); credentials
  via env only; three-facet evidence (screen + disk + logs); secret scan.
- **Non-goals:** Phase 5+ features; scrollback; competitor analysis;
  multi-pane (descoped); insights streaming Q&A beyond one proven answer.

## Credential route (per rules; resolved, not blocked)

- Provider: `moonshot` (the only wired provider account surface).
- Endpoint: `http://127.0.0.1:20219/v1` (omniroute gateway, models.yml;
  live, 573 models).
- Model id: `kmc/kimi-for-coding` (served — verified on the gateway).
- Provisioning: through the TUI settings `a` flow from env
  `MOONSHOT_API_KEY` / `MOONSHOT_BASE_URL` (or KIMI_* equivalents —
  account-service reads both). Account model must be `kmc/kimi-for-coding`;
  the queue resolver maps shorthand → account per provider.

## Scout evidence (2026-09-15, this session)

- `RoadmapView` renders `.auto-claude/roadmap/roadmap.json` honestly;
  generation (`g`) is the Phase 4 gap. Detail pane stub says "Phase 4 wires
  feature detail + convert→spec".
- Vendored surface (all real, in-process):
  - `runRoadmapGeneration(config, onStream)` —
    `ai/runners/roadmap.ts:434`; discovery → features phases; emits
    `phase-start/-complete/text-delta/tool-use/error`; validates JSON
    outputs; retries ×3 per phase.
  - Queue path: `AgentManager.startRoadmapGeneration` →
    `agent-queue.runRoadmapRunner` (`agent-queue.ts:353`) — emits
    `roadmap-progress/roadmap-log/roadmap-complete/roadmap-error` on the
    manager emitter; persists progress state under the project.
  - Convert-to-spec: `ipc-handlers/roadmap-handlers.ts:467`
    (`ROADMAP_CONVERT_TO_SPEC`) — creates `NNN-slug` spec dir with
    implementation_plan.json, requirements.json, spec.md, task_metadata
    (sourceType roadmap), marks feature `planned` + `linked_spec_id`.
    TUI re-implementation must match this contract exactly (no IPC in TUI —
    reimplement the handler body in a service, like task-lifecycle-service
    did for persistPlanStatusSync).
  - Insights: `ai/runners/insights.ts` (Q&A over project index).
  - Ideation: `ai/runners/ideation.ts` — five types
    (pain_points/audience/competitive/pricing/risky_ideas per runner),
    sequential, emits ideation-progress/log per type.
- Model resolution: `createSimpleClient` → `buildDefaultQueueConfig` reads
  `providerAccounts` + `globalPriorityOrder` from settings — the exact
  shape `account-service.provisionMoonshotAccount` writes (proven Phase
  2.5). Shorthand `sonnet` resolves through the queue to the account's
  model.
- Board service refreshes tasks every 2s (App) — new specs appear on the
  board automatically after convert.
- TUI already imports the vendored graph in-process (Phase 2/2.5 pattern).

## Design

1. **RoadmapService** (`services/roadmap-service.ts`):
   `generate(project, onEvent)` → `AgentManager.startRoadmapGeneration`
   with an events subscription; exposes a `RoadmapRun` state object
   (phase/progress/message/loglines) the view renders. Abort via
   `stopRoadmap`.
2. **RoadmapView rewrite**: `g` starts generation (confirms if one
   exists); streaming PROGRESS panel (phase %, live log tail), live phase
   list once roadmap.json lands; `j/k` select phase → DETAIL shows
   features (status, priority, complexity, linked spec); `c` on a feature
   → convert-to-spec (service); converted features show their spec id.
3. **ConvertService** (`services/roadmap-convert.ts`): port of the
   handler body (file-lock, next spec number, spec files, feature
   `planned` + `linked_spec_id`, roadmap metadata.updated_at).
4. **InsightsView**: `a` opens question input → `runInsights` (or the
   runner's Q&A entry) with streaming answer; requires project index
   (roadmap generation builds `project_index.json` as a side effect —
   ordering: roadmap first).
5. **IdeationView** (tab 4 chat? No — ideation is part of Phase 4; add
   sub-view or extend InsightsView): five-type generation with per-type
   progress; output rendered from `.auto-claude/ideation/*.json`.
   Keys: `i` generate all types.

   Scope check: spec gate says "Ideation returns real findings in all five
   categories" — one ideation run over vigil, five files, rendered.
6. **Help/palette text** updated for new keys.

## Task breakdown

| # | Task | Proof |
|---|---|---|
| T1 | RoadmapService + RoadmapView streaming/g/select/convert | live vigil run, screenshots |
| T2 | ConvertService (port handler contract) | spec dir on disk matches handler shape; board shows it |
| T3 | InsightsView Q&A streaming | one real answer citing a vigil file |
| T4 | IdeationView five-type run | five JSONs + rendered findings |
| T5 | tuistory E2E on ~/Desktop/vigil (account provision → roadmap → convert → board → insights → ideation) | screenshots + disk + agent-events log |
| T6 | Phase 1 regression legs re-run | green |
| T7 | VALIDATION + SUMMARY + ROADMAP + ledger; commit+push | docs + git |

## Gate mapping

| Criterion | How proven |
|---|---|
| Roadmap from real codebase analysis | `g` on vigil → discovery reads vigil sources → roadmap.json with phases/features about vigil |
| Visible streaming progress | PROGRESS panel screenshots mid-run (phase %, log lines) |
| Insights real answer + file reference | Q&A answer citing e.g. `src/cli.ts` |
| Ideation five categories | five non-empty ideation JSON files + view render |
| Everything linked | convert → spec appears on board → `s` starts it (agent run) — chain proof |
| Regression | Phase 1 legs green |

## Risks

- Kimi model must follow the roadmap tool-call loop (Write/Read). If a
  phase fails validation ×3, the error path must render honestly (gate
  reports FAIL, no fabrication). Fallback model: `kmc/kimi-for-coding-highspeed`.
- Roadmap runner needs `roadmap_discovery` tool registry entry — verify
  `buildToolRegistry().getToolsForAgent('roadmap_discovery')` returns
  tools in-process before the run.
- vigil has no `.auto-claude/` — first run generates everything fresh
  (good; proves cold-start).
- Long runs (multi-step agent loops) — streaming panel keeps the TUI
  responsive; abort (`x`) wired.

— plan v1, 2026-09-15. Execute --auto --parallel where slices allow.
