#!/usr/bin/env python3
"""Build a 200-task fixture project for P7.1 board-scroll perf measurement.

Same data-model conventions as build-fixture.py (vendored shapes, exact
paths under .auto-claude/specs — the ONLY tree the vendored runtime
discovers). Generates 200 real spec directories spread across every
board column (backlog/queue/in_progress/ai_review/human_review/done/
error/pr_created) so the scroll test exercises a realistic, non-trivial
board rather than one giant column.

Builds into a TEMP directory only (default /tmp/ap-perf-200), never a
real project. Idempotent: re-running regenerates the same 200 specs.
"""
import json
import os
import subprocess
import sys

FIX = os.environ.get("APERANT_PERF_FIXTURE_DIR", "/tmp/ap-perf-200")
SPECS = os.path.join(FIX, ".auto-claude", "specs")
N_TASKS = int(os.environ.get("APERANT_PERF_N_TASKS", "200"))

# plan.status values the vendored determineTaskStatusAndReason() maps to
# board columns (apps/desktop/src/main/project-store.ts). Cycle through
# all of them so every column gets real rows.
STATUS_CYCLE = [
    ("pending", "pending", None),          # -> backlog
    ("queue", "queued", None),             # -> queue
    ("coding", "in_progress", None),       # -> in_progress
    ("review", "review", None),            # -> ai_review (plan.status 'review' -> ai_review per map)
    ("human_review", "review", "completed"),  # -> human_review
    ("done", "completed", None),           # -> done
    ("error", "error", None),              # -> error
    ("pr_created", "pr_created", None),    # -> pr_created
]

PRIORITIES = ["high", "medium", "low"]

SLUG_WORDS = [
    "migrate", "refactor", "fix", "add", "remove", "optimize", "harden",
    "extend", "rewrite", "consolidate", "patch", "audit", "document",
    "validate", "instrument", "decouple", "simplify", "stabilize",
]
SLUG_TARGETS = [
    "provider-registry", "terminal-renderer", "auth-resolver", "task-queue",
    "board-view", "settings-panel", "agent-manager", "worktree-service",
    "roadmap-runner", "logs-pane", "status-bar", "theme-tokens",
    "keymap-bindings", "spec-loader", "changelog-service", "insights-view",
    "command-palette", "toast-system", "help-overlay", "config-service",
]


def w(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        if isinstance(obj, str):
            f.write(obj)
        else:
            json.dump(obj, f, indent=2)


def subtask(id_, title, status):
    return {"id": id_, "title": title, "status": status}


def make_spec(i: int) -> None:
    word = SLUG_WORDS[i % len(SLUG_WORDS)]
    target = SLUG_TARGETS[(i // len(SLUG_WORDS)) % len(SLUG_TARGETS)]
    n = f"{i:03d}"
    slug = f"{n}-{word}-{target}-{i}"
    spec_dir = f"{SPECS}/{slug}"
    feature = f"{word.capitalize()} {target.replace('-', ' ')} (task {i})"

    plan_status, plan_planstatus, review_reason = STATUS_CYCLE[i % len(STATUS_CYCLE)]
    priority = PRIORITIES[i % len(PRIORITIES)]

    # 3-5 subtasks per spec, varied completion so progress bars differ.
    n_sub = 3 + (i % 3)
    total_done = min(n_sub, i % (n_sub + 1))
    subtasks = []
    for s in range(n_sub):
        st = "completed" if s < total_done else "pending"
        subtasks.append(subtask(f"{n}-{s+1}", f"Step {s+1} for task {i}", st))

    w(f"{spec_dir}/spec.md",
      f"# {feature}\n\nGenerated P7.1 perf-fixture spec #{i}. "
      f"{word.capitalize()} the {target.replace('-', ' ')} module.\n")

    w(f"{spec_dir}/requirements.json", {
        "task_description": f"{word.capitalize()} the {target.replace('-', ' ')} module (perf fixture task {i})",
        "workflow_type": "feature",
    })

    w(f"{spec_dir}/task_metadata.json", {"priority": priority})

    plan = {
        "feature": feature,
        "status": plan_status,
        "planStatus": plan_planstatus,
        "updated_at": "2026-09-01T00:00:00Z",
        "phases": [{
            "phase": 1,
            "name": f"{word.capitalize()} phase",
            "status": "completed" if plan_status in ("done", "pr_created") else "in_progress",
            "subtasks": subtasks,
        }],
    }
    if review_reason:
        plan["reviewReason"] = review_reason
    w(f"{spec_dir}/implementation_plan.json", plan)


def git(*args):
    return subprocess.run(["git", "-C", FIX, *args], capture_output=True, text=True)


def main() -> None:
    os.makedirs(SPECS, exist_ok=True)
    for i in range(1, N_TASKS + 1):
        make_spec(i)

    w(f"{FIX}/README.md", "# ap-perf-200 fixture\n\n200-task board-scroll perf fixture (P7.1). Throwaway.\n")
    os.makedirs(f"{FIX}/src", exist_ok=True)
    w(f"{FIX}/src/index.ts", "export const fixture = true;\n")

    if not os.path.isdir(f"{FIX}/.git"):
        r = subprocess.run(["git", "init", "-b", "develop", FIX], capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stdout, r.stderr)
            sys.exit(1)
    git("add", "-A")
    r = git("commit", "-m", "200-task perf fixture")
    if r.returncode != 0 and "nothing to commit" not in (r.stdout + r.stderr):
        print(r.stdout, r.stderr)
        sys.exit(1)
    cur = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    if cur != "develop":
        git("checkout", "-B", "develop")

    n_dirs = len([d for d in os.listdir(SPECS) if os.path.isdir(os.path.join(SPECS, d))])
    branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    print(f"fixture ready: {FIX}")
    print(f"spec dirs on disk: {n_dirs}")
    print(f"branch: {branch}")


if __name__ == "__main__":
    main()
