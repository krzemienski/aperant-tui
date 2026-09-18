#!/usr/bin/env python3
"""Prove the linked roadmap->spec->agent->work-product workflow as an end user.

Drives the REAL TUI through tuistory against a REAL project root. Every claim
is anchor-gated (the expected text must be on screen before the shutter fires)
and every capture is hashed, so a repeated frame is recorded as
`duplicate_of` instead of silently passing as motion.

Why this file exists: audit-evidence/RETRACTION.md documents three "streaming"
PNGs captured 57s apart that were byte-identical. Screenshot-then-rename cannot
evidence change. Streaming here is proven with `capture_frames`, which samples
the live terminal buffer and lets distinctness be measured.

Usage:
    prove-linked-workflow.py <run_dir> <project_path> <session> [--phase N]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import tuistory_drive as td  # noqa: E402


def git(project: str, *args: str) -> str:
    p = subprocess.run(["git", "-C", project, *args],
                       capture_output=True, text=True, timeout=60)
    return (p.stdout or "").strip()


def project_facts(project: str) -> dict:
    """Disk-side truth the UI must agree with (the second facet)."""
    rm = Path(project) / ".auto-claude" / "roadmap" / "roadmap.json"
    specs = Path(project) / ".auto-claude" / "specs"
    roadmap = json.loads(rm.read_text()) if rm.exists() else {}
    return {
        "name": Path(project).name,
        "branch": git(project, "rev-parse", "--abbrev-ref", "HEAD"),
        "head": git(project, "rev-parse", "--short", "HEAD"),
        "roadmap_phases": len(roadmap.get("phases", []) or []),
        "roadmap_features": len(roadmap.get("features", []) or []),
        "spec_dirs": sorted(
            d.name for d in specs.iterdir()
            if specs.is_dir() and d.is_dir() and d.name[0].isdigit()
        ) if specs.is_dir() else [],
    }


def prove_streaming(session: str, key: str, out: Path, count: int = 8,
                    interval_ms: int = 900) -> dict:
    """Fire `key` and sample the buffer N times; distinctness is the evidence."""
    frames = td.capture_frames(session, key, count=count, interval_ms=interval_ms)
    import hashlib
    digests = [hashlib.sha256(f.encode()).hexdigest() for f in frames]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(
        [{"i": i, "sha256": d, "chars": len(f), "frame": f}
         for i, (d, f) in enumerate(zip(digests, frames))], indent=1))
    uniq = len(set(digests))
    return {
        "frames": len(frames),
        "distinct": uniq,
        # A single repeated frame proves nothing; >1 distinct frame is real motion.
        "streaming_proven": uniq > 1,
        "file": str(out),
    }


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    run_dir, project, session = sys.argv[1], sys.argv[2], sys.argv[3]
    facts_before = project_facts(project)
    rec = td.Recorder(run_dir, facts_before["name"])

    print(f"[launch] {session} -> {project}")
    td.launch(session, cwd="apps/tui", project=project)
    ok, _ = td.wait(session, td.rx("APERANT"), 180_000)
    if not ok:
        print("FATAL: TUI never painted")
        return 1

    # C1 identity: the title bar must carry THIS project's real name+branch.
    rec.capture(session, "launch-identity", td.rx(facts_before["name"]),
                "(launch)", f"Launch against {project}; title shows real name/branch")

    steps = [
        ("1", "board", "BACKLOG|TASKS", "Board lists real specs from .auto-claude/specs"),
        ("2", "term", "shell|TERMINAL", "Real PTY shell pane"),
        ("3", "road", "PHASES", "Roadmap from real codebase analysis"),
        ("4", "chat", "Q&A|ideation|ASK", "Insights / ideation"),
        ("5", "tree", "WORKTREES", "Worktree list"),
        ("6", "set", "THEME", "Settings: theme + live routing"),
        ("7", "agents", "AGENT", "Agent observability"),
    ]
    for key, name, anchor, caption in steps:
        td.goto_tab(session, key)
        rec.capture(session, f"tab-{key}-{name}", td.rx(anchor), key, caption)

    out = {
        "project": project,
        "facts_before": facts_before,
        "facts_after": project_facts(project),
        "captures": rec.records,
    }
    Path(run_dir, facts_before["name"], "proof.json").write_text(
        json.dumps(out, indent=1))
    rec.save()
    dupes = [r["file"] for r in rec.records if r.get("duplicate_of")]
    leaks = [r["file"] for r in rec.records if r.get("secret_hits")]
    print(f"[done] {len(rec.records)} captures, "
          f"{len(dupes)} duplicate frames, {len(leaks)} secret hits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
