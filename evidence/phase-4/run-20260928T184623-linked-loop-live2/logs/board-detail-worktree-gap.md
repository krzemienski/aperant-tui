Board DETAIL worktree gap — FIXED (supersedes board-detail-worktree-gap.md)

BEFORE (driven, 200x50 PTY, task 006):
  progress  0%
  subtasks  0/0 complete
  phase     -
  location  main

AFTER the [APERANT-PATCH worktree-plan-merge] fix, same task, same drive:
  progress  50%
  subtasks  3/14 complete
  phase     coding
  location  worktree

Screenshot: step-30-board-detail-worktree-merged.png

WHAT CHANGED: project-store.getTasks() deduplicates main/worktree copies to
one entry per task id and always kept MAIN. Correct for status (a lingering
worktree must not resurrect a finished task) but wrong for plan content: the
main copy is exactly the one with no implementation_plan.json, because a
worktree run never writes that file back to the main repo.

mergeWorktreePlanDetailImpl() now carries subtasks/location/executionProgress
from the worktree twin onto the retained main entry, and ONLY where main
lacks them. Status and priority semantics are untouched, so the staleness
guard that branch exists for still holds.

PROCESS NOTE: a first-party BoardView 'plan twin' lookup was tried first. It
typechecked clean, so it LOOKED fixed — driving the real board showed the
pane unchanged at 0/0, because getTasks returns one entry per id and the twin
never reaches the view. That attempt was reverted as dead code rather than
shipped. Only the store-level merge actually moves the numbers on screen.

GATES: npm test 9/9 exit 0; npm run typecheck exit 0;
       node tools/audit-vendored-drift.mjs -> OK (patch marker + VENDORED-PATCHES.md entry);
       node tools/audit-credentials.mjs -> findings: 0.

SELF-AUDIT: the first cut of this patch carried a regression

My commit message claimed 'status and priority semantics are untouched'.
That was an assertion, not a measurement. Testing the exact scenario the
dedup branch exists to guard (a DONE main task with a lingering partial
worktree) showed my merge broke it:

  main status=done, no subtasks        -> upstream renders 100%
  + worktree plan 3/14 adopted         -> rendered  21%

Cause: BoardView.progressOf() falls back to the subtask ratio when there is
no executionProgress, so adopting a half-finished worktree plan visibly
re-opened a finished task — precisely the staleness the branch prevents.

FIX: terminal statuses (done, pr_created) keep the main entry verbatim.
Re-measured across statuses:
  done         before=100% after=100%  guarded
  pr_created   before=  0% after=  0%  guarded
  in_progress  before=  0% after= 21%  plan adopted
  backlog      before=  0% after= 21%  plan adopted

Live re-drive after the guard, task 006 (BACKLOG): subtasks 3/14 complete,
progress 50%, phase coding, location worktree — the fix still works.

SECOND SELF-AUDIT: the guard fixed one bug and left another

Setting merged.location = 'worktree' destroyed the provenance the dedup
loop itself reads (existing.location === 'main') on every LATER iteration.
With TWO worktree copies of one spec, the second copy then fell into the
same-location status-priority branch and replaced the main entry outright:

  main=backlog, wt1=in_progress(3/14), wt2=human_review(14/14)
    my patch  -> status human_review   (main hijacked by a stale worktree)
    upstream  -> status backlog        (main authoritative)

FIX: location is no longer overwritten. A new Task.executionLocation field
carries where the task is EXECUTING; location keeps saying which copy the
entry was loaded from, so dedup can still recognise main. BoardView renders
executionLocation ?? location.

Re-measured, two worktrees: status backlog | location main | displayed
worktree | subtasks 14 — main authoritative, display still correct.
Live re-drive of 006: subtasks 3/14, progress 50%, phase coding,
location worktree.

Three bugs in three cuts of one patch, each found by testing the scenario
the code was supposed to handle rather than re-reading the diff.

THIRD CHECK: the two-worktree case, DRIVEN on the real board

My first three cuts of this patch were each verified only by a Python
simulation of the dedup loop. That is a model of the code, not the code.
So the advisory's scenario was built for real in ~/Desktop/vigil:

  worktree 1: 006-schema-validated-sdk-message-boundary  (live, 3/14)
  worktree 2: 006-stale-twin                              (stale, 14/14,
              executionPhase human_review) - both holding spec 006
  main spec dir: no implementation_plan.json

WITH THE FIX (driven, 200x50 PTY):
  006-sche [BACKLOG]        <- main status survived
  subtasks 3/14 complete    <- live worktree plan still adopted
  phase coding
  location worktree
  wait: {"matched": true, "anchor": "006-sche [BACKLOG]"}

IS THE FIXTURE DISCRIMINATING? Re-introduced ONLY the provenance bug
(merged.location = worktree.location) and re-drove the same board:
  006-sche [REVIEW]         <- main HIJACKED by the stale twin
  subtasks 14/14 complete
  phase complete
  wait: {"matched": false, "anchor": "006-sche [BACKLOG]", "timedOut": true}

So the check fails when the bug is present and passes when it is not — it
is not vacuous. Probe line reverted immediately; fixture worktree and its
branch removed (git worktree list back to 7).

Screenshot: step-31-two-worktrees-no-status-hijack.png
