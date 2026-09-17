#!/usr/bin/env python3
"""Drive the Aperant TUI as an end user via tuistory, capturing real PNGs.

Why tuistory and not tmux+ANSI: tuistory owns the PTY, so `wait` is reactive
(polls the live buffer until a pattern appears) instead of sleep-and-hope, and
`screenshot` renders the terminal buffer to PNG directly. Every capture here is
observe-then-act: wait for an anchor that proves the expected state is on
screen, THEN shoot. A shot without a matched anchor is a bug, not evidence.

The CI trap (this is why earlier runs captured blank frames):
  node_modules/ink/build/ink.js:111-116 — when `is-in-ci` reports true, Ink
  stores the frame and returns WITHOUT writing a byte.
  node_modules/is-in-ci/index.js — true when env CI merely EXISTS, even as "".
So `CI=` (empty) still blanks the TUI. Only `CI=false` clears the detector.
tuistory runs a persistent daemon that inherits the launching shell's env, so
CI leaks in unless we override it explicitly on every launch.
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

BIN = "tuistory"
ROUTER = {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:20128/v1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm/glm-5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm/glm-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm/glm-5",
    "APERANT_MODEL": "glm/glm-5",
    # CI=false, not unset: is-in-ci keys off existence, so "" still blanks Ink.
    "CI": "false",
}
SECRET_ENV = "ANTHROPIC_AUTH_TOKEN"


def _run(args: list[str], timeout: int = 180) -> tuple[int, str]:
    env = dict(os.environ)
    env.pop("CI", None)
    # The TUI is full of box-drawing glyphs, so tuistory's stdout is
    # multi-byte UTF-8. A large snapshot can be chunked mid-character, and
    # strict decoding then raises UnicodeDecodeError and kills the capture —
    # losing a real frame to a harness bug. Decode leniently: one replacement
    # character is a cosmetic blemish, a lost frame is missing evidence.
    p = subprocess.run(
        [BIN, *args], capture_output=True, text=True, timeout=timeout, env=env,
        errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def close(session: str) -> None:
    _run(["close", "-s", session], timeout=30)


def launch(session: str, cwd: str, project: str, cols: int = 200, rows: int = 50) -> str:
    """Start the real TUI against a real project root."""
    close(session)
    env_args: list[str] = []
    for k, v in ROUTER.items():
        env_args += ["--env", f"{k}={v}"]
    token = os.environ.get(SECRET_ENV, "")
    if token:
        # Passed through process env; never echoed back or written to evidence.
        env_args += ["--env", f"{SECRET_ENV}={token}"]
    rc, out = _run(
        [
            "launch", "--background", "-s", session,
            "--cols", str(cols), "--rows", str(rows), "--cwd", cwd,
            *env_args,
            f"npx tsx src/cli.tsx {project}",
        ],
        timeout=240,
    )
    if rc != 0:
        raise RuntimeError(f"launch failed rc={rc}: {out[-400:]}")
    return out


def wait(session: str, pattern: str, timeout_ms: int = 240_000) -> tuple[bool, str]:
    rc, out = _run(
        ["wait", "-s", session, pattern, "--timeout", str(timeout_ms)],
        timeout=timeout_ms // 1000 + 60,
    )
    return rc == 0, out


def snapshot(session: str, trim: bool = True) -> str:
    args = ["snapshot", "-s", session]
    if trim:
        args.append("--trim")
    return _run(args, timeout=90)[1]


def current_frame(session: str) -> str:
    """The LAST rendered frame only, with earlier frames discarded.

    Worker/CLI writes to the terminal push previous frames up into scrollback,
    and `snapshot` returns the whole buffer — so naive substring checks match
    text from a frame that is no longer on screen and report the wrong view.
    Ink repaints the full UI each time, so the last line containing the app's
    header starts the only frame that is actually visible.
    """
    s = snapshot(session)
    lines = s.split("\n")
    starts = [i for i, l in enumerate(lines) if "APERANT" in l and "board" not in l]
    return "\n".join(lines[starts[-1]:]) if starts else s


def read_stream(session: str, all_output: bool = False) -> str:
    """Full process output stream — this is the live streaming evidence."""
    args = ["read", "-s", session]
    if all_output:
        args.append("--all")
    return _run(args, timeout=90)[1]


def press(session: str, *keys: str) -> None:
    _run(["press", "-s", session, *keys], timeout=60)


# Views that own the digit keys for their own sub-navigation. In `chat`,
# 1-6 select ideation types; in `agents`, 1-6 select observability sub-views.
# App.tsx:163,205 deactivates the global digit keymap there, and App.tsx:184
# makes `escape` ARM tab-nav for a single following digit (1500ms window).
# A driver that fires digits blind will appear to "freeze" on those views —
# that is the documented D14 contract working, not a hang.
DIGIT_CAPTURING_VIEWS = {"chat", "agents"}


def goto_tab(session: str, key: str, from_view: str | None = None) -> None:
    """Switch tabs the way the on-screen help tells a user to."""
    if from_view in DIGIT_CAPTURING_VIEWS:
        press(session, "escape")
        time.sleep(0.4)  # let the arm land before the digit consumes it
    press(session, key)
    time.sleep(1.6)


def subview(session: str, key: str) -> None:
    """Select a sub-view inside agents/chat with a digit.

    Distinct from goto_tab: `escape` here would ARM tab-nav (App.tsx:184) and
    the very next digit would be consumed as a TAB switch, silently landing on
    a different screen. Once we are already on the view, digits belong to the
    view — press them bare.
    """
    press(session, key)
    time.sleep(1.8)


def rx(*alternatives: str) -> str:
    """tuistory matches plain strings LITERALLY; /.../ enables regex.

    Passing "A|B" as a plain string searches for the four characters "A|B"
    and always misses. This wraps alternatives into real regex syntax.
    """
    return "/" + "|".join(alternatives) + "/"


def type_text(session: str, text: str) -> None:
    _run(["type", "-s", session, text], timeout=90)


def shot(session: str, out_path: str, anchor: str | None = None,
         anchor_timeout_ms: int = 60_000) -> dict:
    """Capture a PNG. If `anchor` is given it MUST appear first.

    Anchor-gated by design: an unanchored screenshot can catch a stale or
    half-painted frame and silently become false evidence.
    """
    matched = None
    if anchor is not None:
        matched, _ = wait(session, anchor, anchor_timeout_ms)
        if not matched:
            return {"ok": False, "reason": f"anchor {anchor!r} never appeared",
                    "png": None, "anchor": anchor}
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    rc, out = _run(
        ["screenshot", "-s", session, "-o", out_path, "--pixel-ratio", "2"],
        timeout=180,
    )
    ok = rc == 0 and Path(out_path).exists() and Path(out_path).stat().st_size > 0
    if ok:
        # Persist the exact frame text beside the PNG: independently checkable
        # proof of what was on screen at capture time.
        Path(out_path + ".txt").write_text(snapshot(session))
    return {
        "ok": ok,
        "png": out_path if ok else None,
        "bytes": Path(out_path).stat().st_size if ok else 0,
        "anchor": anchor,
        "anchor_matched": matched,
        "err": None if ok else out[-200:],
    }


class Recorder:
    """Accumulates capture records so the coverage matrix is generated, not typed."""

    def __init__(self, run_dir: str, project: str) -> None:
        self.run_dir = Path(run_dir)
        self.project = project
        self.records: list[dict] = []
        self.n = 0

    def capture(self, session: str, name: str, anchor: str | None,
                keys: str, caption: str) -> dict:
        self.n += 1
        rel = f"{self.project}/step-{self.n:02d}-{name}.png"
        res = shot(session, str(self.run_dir / rel), anchor)
        rec = {
            "seq": self.n, "file": rel, "name": name, "anchor": anchor,
            "keys_sent": keys, "caption": caption, "ok": res["ok"],
            "anchor_matched": res.get("anchor_matched"),
            "bytes": res.get("bytes", 0), "ts": time.strftime("%H:%M:%S"),
            "err": res.get("err"),
        }
        self.records.append(rec)
        return rec

    def save(self) -> str:
        p = self.run_dir / self.project / "captures.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(self.records, indent=1))
        return str(p)
