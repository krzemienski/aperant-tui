# Phase 7 Gate Run

Run from repo root `/Users/nick/dev/aperant-tui`. Each command executed directly (no pipe to `head`/`tail`/`grep`); exit code captured from the command's own return value, not a pipeline tail.

| Command | Exit code | Pass/Fail | Decisive output excerpt |
|---|---|---|---|
| `npm run typecheck` | 0 | PASS | `tsc --noEmit` completed with no diagnostics printed (empty stdout after the npm workspace banner). |
| `CI=1 npm test` | 0 | PASS | `Test Files  2 passed (2)` / `Tests  9 passed (9)` — vitest v2.1.9, Duration 7.23s |
| `npm run build` | 0 | PASS | `worker bundle: /Users/nick/dev/aperant-tui/apps/tui/dist/agent-worker.cjs (4.52 MB)` and `cli bundle: /Users/nick/dev/aperant-tui/apps/tui/dist/cli.mjs (6.33 MB)`; esbuild reported `⚡ Done in 66ms` / `⚡ Done in 87ms` (bundle-size warnings only, not errors) |

## Full output locations
- `evidence/phase-7/gates/typecheck.txt`
- `evidence/phase-7/gates/test.txt`
- `evidence/phase-7/gates/build.txt`

## Notes
- All three gates ran against the current dirty working tree (uncommitted concurrent edits under `apps/tui/src/**` and `apps/desktop/src/main/**` present at run time).
- Test suite scope: `npm test` → `npm test -w @aperant/tui` → `vitest run`, which discovered only 2 test files (`src/services/__tests__/moonshot-provider.test.ts`, `src/services/__tests__/parallel-executor-queued.test.ts`), 9 tests total, 0 failed, 0 skipped.
- Build produced two esbuild size warnings (`⚠️` on 4.5mb and 6.3mb bundles) — these are non-fatal warnings, not failures; exit code was 0.
