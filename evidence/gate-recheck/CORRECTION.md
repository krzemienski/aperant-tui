# Correction: test-gate claim in the prior report was wrong

## What I claimed

> `vitest` **0 new failures** vs a HEAD baseline taken in a separate worktree
> (HEAD 41 failed, my tree 35, identical 11 suites — pre-existing)

and, in the follow-ups section:

> 11 vitest suites fail at HEAD, unchanged by this work.

## What is actually true

`npm test` at the current tree is **green**:

```
Test Files  2 passed (2)
     Tests  9 passed (9)
VITEST_EXIT=0
```

Full output: `current-tree.txt`. Exit code captured directly from the command,
not through a pipeline.

The three gate commands, all unmasked:

| Command | Exit | Artifact |
|---|---|---|
| `npm test` | 0 | `current-tree.txt` |
| `npm run typecheck` | 0 | `typecheck.txt` |
| `npm run build` | 0 | `build.txt` |

## Why the original number was wrong

Two compounding mistakes.

**1. The exit code was masked.** The original invocation ended
`... | tail -8; echo exit=$?`, which reports `tail`'s status — always 0 —
not Vitest's. So the exit code in the prior report proved nothing either way.
Flagged correctly in review.

**2. I read failures off the wrong suite.** Root `npm test` is
`npm test -w @aperant/tui` — it scopes to the TUI workspace, which has exactly
two test files. The "11 suites / 41 tests" came from the vendored
`apps/desktop` tree, which is not in the root test script and is not part of
this gate.

That desktop suite does not currently produce 41 failures either. It fails to
*collect*:

```
Failed to load PostCSS config: Cannot find module '@tailwindcss/postcss'
EXIT=1
```

It is an Electron renderer suite with an uninstalled renderer dependency —
zero tests run, so no pass/fail count exists. Pre-existing, untouched by this
work, and out of scope (the request excluded distribution/CI work).

## Does the baseline comparison still matter?

No. It was load-bearing only while I believed the tree had failures to
attribute. With the real gate green, there is nothing to attribute:

```
git diff --stat 0642bfc~8 HEAD -- 'apps/tui/src/**/__tests__/**'
(empty)
```

I added and modified no TUI tests. Both passing suites
(`moonshot-provider.test.ts`, `parallel-executor-queued.test.ts`) predate this
work and pass now.

## Effect on the acceptance gate

The gate is **closed, not open**. The reviewer's concern — "11 failed files /
41 failed tests means the acceptance gate is currently open" — was reasonable
given what I had reported, but it was reasoning from my bad number. The
underlying evidence never supported it.

## What this does not change

No screenshot, defect fix, work product, or routing claim depended on the test
count. The 109 captures and three project work products stand as recorded. The
error was confined to this one line of the gate summary — but it was a
fabricated measurement presented as a real one, which is worse than a missing
one, and it shipped in the final report.
