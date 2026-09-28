Board DETAIL under-reports worktree plan data — ROOT-CAUSED, NOT FIXED

Observed, driving the real TUI: task 006 shows
  subtasks 0/0 complete
  location main
while its worktree plan holds 5 phases / 14 subtasks and the task genuinely
ran in .auto-claude/worktrees/tasks/006-schema-validated-sdk-message-boundary.

ROOT CAUSE (read, then confirmed by experiment):
  project-store.getTasks() loads BOTH copies (main :304, worktree :322) but
  its dedup keeps exactly one entry per task id (:343-371, taskMap), and
  :350-358 unconditionally prefers the MAIN entry. That rule is correct for
  STATUS — a lingering worktree must not resurrect a finished task — but the
  main entry is precisely the one with no implementation_plan.json, because a
  worktree run never writes that file back to the main repo (see the
  P-BOARD-LIVE comment block in BoardView.tsx).

ATTEMPTED FIX, REVERTED:
  A view-layer 'plan twin' lookup in BoardView that preferred whichever loaded
  entry carried subtasks. Typechecked clean, then driven live against the real
  board: STILL 'subtasks 0/0 / location main'. Reason: getTasks returns
  Array.from(taskMap.values()) — the worktree twin is discarded INSIDE the
  store, so it never reaches the view and there is nothing to look up.
  The change was a no-op, so it was reverted rather than shipped as a fix.

WHERE THE REAL FIX BELONGS:
  loadTasksFromSpecsDir/getTasks must MERGE the two entries — main wins for
  status, worktree supplies plan content (subtasks, location) — instead of
  discarding one wholesale. That is vendored desktop runtime, outside the
  Phase 4 loop this run is scoped to prove, so it is recorded here and left
  for a scoped change rather than smuggled in.

IMPACT ON THIS RUN'S CRITERIA: none. Criterion 4/4b is proven by the commit
  and diff on disk (0b22b23, +197), and criterion 5 by the tracing views over
  the real tap — neither reads the board DETAIL subtasks/location fields.
