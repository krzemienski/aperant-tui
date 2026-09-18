# GATES-FINAL — Re-run verification (attributable tree state)

**HEAD:** `20a7e9b949866c37c94f13e73546e5b82793af54`
**Working tree:** dirty (operator's in-progress work; see full `git status --porcelain` below). Status IDENTICAL before and after this gate run — tree did not shift under the gate commands.

## Gate results (unpiped, true exit codes via subprocess.returncode)

| Command | Exit code | Pass/Fail | Decisive output excerpt |
|---|---|---|---|
| `npm run typecheck` | 0 | PASS | `tsc --noEmit` produced no diagnostics output (silent success) |
| `CI=1 npm test` | 0 | PASS | `Test Files  2 passed (2)` / `Tests  9 passed (9)` |
| `npm run build` | 0 | PASS | `dist/agent-worker.cjs 4.5mb` (4.52 MB); `dist/cli.mjs 6.3mb` (6.33 MB); both `⚡ Done` |

Full output: `typecheck.txt`, `test.txt`, `build.txt` (each ends with `EXIT_CODE=<n>` on the last line, captured directly from `subprocess.run(...).returncode`, never from a piped tail).

## Tree state (git status --porcelain, full, captured before AND after the gate run — identical)

```
 M VENDORED-PATCHES.md
 M apps/desktop/src/main/ai/runners/merge-resolver.ts
 M apps/desktop/src/main/ai/session/runner.ts
 M apps/desktop/src/main/ai/session/stream-handler.ts
 M apps/desktop/src/shared/constants/models.ts
 M apps/tui/src/components/HelpOverlay.tsx
 M apps/tui/src/components/Panel.tsx
 M apps/tui/src/components/StatusLine.tsx
 M apps/tui/src/components/TabBar.tsx
 M apps/tui/src/components/TitleBar.tsx
 M apps/tui/src/services/account-service.ts
 M apps/tui/src/services/agent-start-service.ts
 M apps/tui/src/services/observability.ts
 M apps/tui/src/services/roadmap-service.ts
 M apps/tui/src/views/BoardView.tsx
 M apps/tui/src/views/InsightsView.tsx
 M apps/tui/src/views/RoadmapView.tsx
 M apps/tui/src/views/SettingsView.tsx
 M apps/tui/src/views/WorktreeView.tsx
 M audit-evidence/cycle-01/findings.json
 M evidence/phase-5/run-20260917T003750-tuistory-linked/MANIFEST.json
 M evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/0001-auto-claude-Complete-subtask-1-1-bs4-HTML-link-extra.patch
 M evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/agent-events.jsonl
 M evidence/phase-5/run-20260917T003750-tuistory-linked/awesome-researcher/work-product.diff
 M tools/tuistory_drive.py
?? .agents/
?? .claude/
?? .omc/
?? .omp/
?? CLAUDE.md
?? apps/tui/src/services/worktree-actions.ts
?? audit-evidence/RETRACTION.md
?? audit-evidence/cycle-01/functional-evidence/
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub1.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub2.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub3.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub4.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub5.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents-sub6.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-agents.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-board.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-board.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-chat.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-chat.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-road.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-road.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-set.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-set.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-term.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-term.txt
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-tree.png
?? audit-evidence/cycle-01/ux-reports/awesome-researcher-tree.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub1.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub2.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub3.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub4.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub5.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents-sub6.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-agents.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-board.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-board.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-chat.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-chat.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-road.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-road.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-set.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-set.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-term.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-term.txt
?? audit-evidence/cycle-01/ux-reports/hunter-seed-tree.png
?? audit-evidence/cycle-01/ux-reports/hunter-seed-tree.txt
?? audit-evidence/cycle-01/ux-reports/overlay-help.png
?? audit-evidence/cycle-01/ux-reports/overlay-help.txt
?? audit-evidence/cycle-01/ux-reports/overlay-logs.png
?? audit-evidence/cycle-01/ux-reports/overlay-logs.txt
?? audit-evidence/cycle-01/ux-reports/overlay-palette-error.png
?? audit-evidence/cycle-01/ux-reports/overlay-palette-error.txt
?? audit-evidence/cycle-01/ux-reports/overlay-palette-executed.png
?? audit-evidence/cycle-01/ux-reports/overlay-palette-typed.png
?? audit-evidence/cycle-01/ux-reports/overlay-palette.png
?? audit-evidence/cycle-01/ux-reports/overlay-palette.txt
?? banks/
?? docs/agents/
?? docs/plan/ACCEPTANCE-INVENTORY.md
?? evidence/gate-recheck-session3/
?? evidence/phase-5/run-20260917T003750-tuistory-linked/REDACTION-NOTE.md
?? evidence/phase-6/
?? evidence/phase-7/
?? repomix-output.xml
?? skills-lock.json
?? tools/build-fixture-200.py
?? tools/prove-linked-workflow.py
?? tools/read-model-routes.py
```

## Mtimes of the six modified source files (captured before gate run)

| File | mtime |
|---|---|
| `apps/tui/src/services/account-service.ts` | 2026-09-17 18:08:25 -0400 |
| `apps/tui/src/views/InsightsView.tsx` | 2026-09-17 18:08:25 -0400 |
| `apps/desktop/src/shared/constants/models.ts` | 2026-09-17 18:08:25 -0400 |
| `apps/desktop/src/main/ai/session/stream-handler.ts` | 2026-09-17 18:08:25 -0400 |
| `apps/tui/src/services/observability.ts` | 2026-09-17 18:21:54 -0400 |
| `apps/tui/src/views/BoardView.tsx` | 2026-09-17 18:25:21 -0400 |
