# Final-state audit: every validation-doc claim vs disk

Run at 2026-09-28T20:24:21Z, after all TUI/agent processes exited
(ps count 0, tap frozen at 6,720 over a 5s window), so these numbers are
stable rather than a moving target.

| Claim in phase-4-VALIDATION.md | Disk | Verdict |
|---|---|---|
| roadmap holds 39 features | 39 | OK |
| spec 006-schema-validated-sdk-message-boundary exists | present | OK |
| planner wrote 5 phases / 14 subtasks | 5 phases / 14 subtasks | OK |
| coder produced two commits | 2 | OK |
| tap holds 6,720 events | 6,720 | OK |
| 0 test files touched this run | 0 | OK |
| 11 screenshots referenced by name | all 11 present | OK |

Committed evidence is byte-current with the live run:
  committed agent-events.jsonl 6,720 == live 6,720
  committed agent-work-product.commits.txt == git log/diff on the branch
  working tree clean (git status --porcelain -> 0 lines)

Why this file exists: three times in this run a doc row drifted behind
reality while an agent kept working (1 commit -> 2, 2,103 -> 6,720 events,
'seven fixes' -> ten). Each was caught by checking the document against disk
rather than re-reading it. This audit is that check, recorded.
