# DEFECT (found live, this session): board j/k skips tasks

Repro on /Users/nick/awesome-researcher:
  Rendered order: BACKLOG[001, 002, 006] HUMAN[003, 005] DONE[004]
  Start at 001 -> press j -> 002 (correct)
             -> press j -> 003-list (WRONG; skipped 006-auto)

Impact: 006-auto is UNREACHABLE by keyboard. A user pressing `j j s`
intending 006 actually starts 003. Orchestrator hit exactly this.

Root cause (source-verified):
  BoardView.tsx:145  const flat = tasks;            <- selection = RAW disk order
  BoardView.tsx:252  groupByStatus(tasks)           <- render  = GROUPED order
  The two sequences differ; j/k walks one while the eye follows the other.

Status: fix dispatched (FixBoardNavOrder lane).
