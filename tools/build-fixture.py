#!/usr/bin/env python3
"""Build the aperant fixture project (vendored data model, exact shapes).

Idempotent. Spec 002 carries Moonshot task_metadata so the board's `s` key
resolves through the moonshot provider account queue. Specs live in
.auto-claude/specs — the ONLY tree the vendored runtime discovers (D9).
"""
import json, os, subprocess, sys

FIX = os.environ.get("APERANT_FIXTURE_DIR", "/tmp/aperant-fixture")
SPECS = os.path.join(FIX, ".auto-claude", "specs")

def w(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        if isinstance(obj, str):
            f.write(obj)
        else:
            json.dump(obj, f, indent=2)

def subtask(id_, title, status):
    return {"id": id_, "title": title, "status": status}

w(f"{SPECS}/001-migrate-provider-registry/spec.md", "# Migrate Provider Registry\n\nConsolidate provider registration into a single registry module.\n")
w(f"{SPECS}/001-migrate-provider-registry/requirements.json", {"task_description": "Migrate the provider registry to a unified module"})
w(f"{SPECS}/001-migrate-provider-registry/task_metadata.json", {"priority": "high"})
w(f"{SPECS}/001-migrate-provider-registry/implementation_plan.json", {
    "feature": "Migrate Provider Registry", "status": "in_progress", "planStatus": "in_progress",
    "executionPhase": "coding", "updated_at": "2026-08-11T22:00:00Z",
    "phases": [{"phase": 1, "name": "Registry migration", "status": "in_progress",
        "subtasks": [subtask("001-1", "Extract provider enum", "completed"),
            subtask("001-2", "Move factory into registry", "completed"),
            subtask("001-3", "Rewire auth resolver", "completed"),
            subtask("001-4", "Port provider tests", "pending"),
            subtask("001-5", "Delete legacy factory", "pending")]}],
})

w(f"{SPECS}/002-fix-terminal-blank/spec.md", "# Fix Terminal Blank Screen\n\nTerminal pane goes blank after resize storm.\n")
w(f"{SPECS}/002-fix-terminal-blank/requirements.json", {"task_description": "Fix terminal blank screen after rapid resize"})
w(f"{SPECS}/002-fix-terminal-blank/task_metadata.json", {
    "priority": "medium", "model": "kimi/kimi-for-coding", "provider": "moonshot",
})
w(f"{SPECS}/002-fix-terminal-blank/implementation_plan.json", {
    "feature": "Fix Terminal Blank Screen", "status": "queue", "planStatus": "queued",
    "updated_at": "2026-08-11T22:05:00Z",
    "phases": [{"phase": 1, "name": "Repro & fix", "status": "pending",
        "subtasks": [subtask("002-1", "Reproduce blank screen", "pending"),
            subtask("002-2", "Patch redraw path", "pending")]}],
})

w(f"{SPECS}/003-archive-button-fixes/spec.md", "# Archive Button Fixes\n\nArchive button did not persist state.\n")
w(f"{SPECS}/003-archive-button-fixes/requirements.json", {"task_description": "Fix archive button state persistence"})
w(f"{SPECS}/003-archive-button-fixes/task_metadata.json", {"priority": "low"})
w(f"{SPECS}/003-archive-button-fixes/implementation_plan.json", {
    "feature": "Archive Button Fixes", "status": "done", "planStatus": "completed",
    "updated_at": "2026-08-10T18:00:00Z",
    "phases": [{"phase": 1, "name": "Fix", "status": "completed",
        "subtasks": [subtask("003-1", "Persist archive state", "completed")]}],
})

w(f"{SPECS}/004-qa-loop-docs/spec.md", "# QA Loop Docs\n\nDocument the QA review loop.\n")
w(f"{SPECS}/004-qa-loop-docs/requirements.json", {"task_description": "Write QA loop documentation"})
w(f"{SPECS}/004-qa-loop-docs/task_metadata.json", {"priority": "low"})
w(f"{SPECS}/004-qa-loop-docs/implementation_plan.json", {
    "feature": "QA Loop Docs", "status": "pending", "planStatus": "pending",
    "updated_at": "2026-08-09T12:00:00Z",
    "phases": [{"phase": 1, "name": "Docs", "status": "pending",
        "subtasks": [subtask("004-1", "Draft QA loop doc", "pending")]}],
})

w(f"{FIX}/.auto-claude/roadmap.json", {
    "title": "Aperant Fixture Roadmap",
    "phases": [
        {"id": "phase-1", "name": "Foundation", "status": "completed", "features": ["001-migrate-provider-registry"]},
        {"id": "phase-2", "name": "Stability", "status": "in_progress", "features": ["002-fix-terminal-blank", "003-archive-button-fixes"]},
        {"id": "phase-3", "name": "Docs", "status": "pending", "features": ["004-qa-loop-docs"]}],
})
w(f"{FIX}/.auto-claude/project_index.json", {
    "files": [{"path": "src/index.ts", "summary": "entry point"},
        {"path": "src/terminal.ts", "summary": "terminal pane"},
        {"path": "README.md", "summary": "fixture readme"}]})
w(f"{FIX}/README.md", "# aperant fixture\n\nReal git repo fixture for TUI gates.\n")
os.makedirs(f"{FIX}/src", exist_ok=True)
w(f"{FIX}/src/index.ts", "export const fixture = true;\n")

def git(*args):
    return subprocess.run(["git", "-C", FIX, *args], capture_output=True, text=True)

if not os.path.isdir(f"{FIX}/.git"):
    subprocess.run(["git", "init", "-b", "develop", FIX], capture_output=True)
git("add", "-A")
r = git("commit", "-m", "fixture state")
if r.returncode != 0 and "nothing to commit" not in (r.stdout + r.stderr):
    print(r.stdout, r.stderr); sys.exit(1)
cur = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
if cur != "develop":
    git("checkout", "-B", "develop")
print("fixture ready:", FIX, "branch:", git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip())
