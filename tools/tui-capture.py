#!/usr/bin/env python3
"""tui-capture — drive a real TUI in a real tmux PTY and produce true PNG screenshots.

Why this exists (measured, 2026-09-16): agent-tty could not hold this Ink app's
frame on macOS (docs/plan/phases/phase-4-VALIDATION.md). tmux CAN: it is a real
PTY, the app sees isTTY on both stdin and stdout, and `capture-pane -e` returns
the rendered grid WITH SGR attributes. This tool turns that grid into a PNG via
an ANSI->HTML pass rendered by headless chromium, so visual claims are proven by
pixels, not by a text hash (tui-testing Iron Rule 6).

Never pipes the app (Iron Rule 1: `cmd | tee` destroys the TTY guard — tmux is
the PTY and the app's stdout goes nowhere else).

ROOT CAUSE THIS TOOL DEFEATS (measured 2026-09-16, controlled arms armA/armB):
Ink 5.2.1 `ink.js:111-116` — when `is-in-ci` is true, the renderer stores the
frame and `return`s WITHOUT WRITING A SINGLE BYTE. Any agent harness that
exports CI=true (most of them do) gets a permanently blank terminal from a
perfectly healthy app. This was misdiagnosed for 10+ boot attempts as
"agent-tty cannot paint Ink on macOS". It is one environment variable.
Secondary trap, same file `ink.js:121-125`: when `outputHeight >= stdout.rows`
Ink swaps incremental repaint for a full clearTerminal on EVERY frame, so a
short PTY samples a wiped screen — hence the 50-row floor below.

usage:
  tui-capture.py session start  <name> <cols>x<rows> <cwd> -- <cmd...>
      [--env KEY=VALUE ...]   credentials pass at CREATE only (never logged)
  tui-capture.py session wait   <name> <anchor> [timeout_s]
  tui-capture.py session keys   <name> <key> [key...]
  tui-capture.py session type   <name> <text>
  tui-capture.py session shot   <name> <out.png> [--title T]
  tui-capture.py session text   <name>
  tui-capture.py session kill   <name>
"""
import json
import os
import re
import subprocess
import sys
import time

# xterm 16-color + bright, matched to a dark terminal profile
BASE = [
    "#1d1f21", "#cc6666", "#b5bd68", "#f0c674", "#81a2be", "#b294bb", "#8abeb7", "#c5c8c6",
    "#666666", "#d54e53", "#b9ca4a", "#e7c547", "#7aa6da", "#c397d8", "#70c0b1", "#eaeaea",
]
FG_DEFAULT = "#c5c8c6"
BG_DEFAULT = "#14161a"


def _xterm256(n: int) -> str:
    if n < 16:
        return BASE[n]
    if n < 232:
        n -= 16
        r, g, b = n // 36, (n % 36) // 6, n % 6
        lvl = [0, 95, 135, 175, 215, 255]
        return "#%02x%02x%02x" % (lvl[r], lvl[g], lvl[b])
    v = 8 + (n - 232) * 10
    return "#%02x%02x%02x" % (v, v, v)


def _esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;").replace(" ", "\u00a0"))


SGR_RE = re.compile(r"\x1b\[([0-9;:]*)m")


def ansi_to_html(text: str, title: str = "") -> str:
    """Convert a tmux `capture-pane -e` dump into standalone HTML."""
    fg, bg, bold, ital, under, rev = None, None, False, False, False, False
    out = []

    def open_span():
        f = fg or FG_DEFAULT
        b = bg or BG_DEFAULT
        if rev:
            f, b = b, f
        st = [f"color:{f}", f"background:{b}"]
        if bold:
            st.append("font-weight:700")
        if ital:
            st.append("font-style:italic")
        if under:
            st.append("text-decoration:underline")
        return '<span style="%s">' % ";".join(st)

    for raw_line in text.split("\n"):
        out.append('<div class="l">')
        pos, openspans = 0, 0
        for m in SGR_RE.finditer(raw_line):
            chunk = raw_line[pos:m.start()]
            if chunk:
                out.append(open_span() + _esc(chunk) + "</span>")
            pos = m.end()
            params = m.group(1)
            codes = [int(x) for x in re.split(r"[;:]", params) if x.isdigit()] or [0]
            i = 0
            while i < len(codes):
                c = codes[i]
                if c == 0:
                    fg = bg = None
                    bold = ital = under = rev = False
                elif c == 1:
                    bold = True
                elif c == 3:
                    ital = True
                elif c == 4:
                    under = True
                elif c == 7:
                    rev = True
                elif c == 22:
                    bold = False
                elif c == 23:
                    ital = False
                elif c == 24:
                    under = False
                elif c == 27:
                    rev = False
                elif 30 <= c <= 37:
                    fg = BASE[c - 30]
                elif 90 <= c <= 97:
                    fg = BASE[c - 90 + 8]
                elif 40 <= c <= 47:
                    bg = BASE[c - 40]
                elif 100 <= c <= 107:
                    bg = BASE[c - 100 + 8]
                elif c == 39:
                    fg = None
                elif c == 49:
                    bg = None
                elif c in (38, 48):
                    tgt = "fg" if c == 38 else "bg"
                    if i + 1 < len(codes) and codes[i + 1] == 5:
                        col = _xterm256(codes[i + 2]) if i + 2 < len(codes) else None
                        i += 2
                    elif i + 1 < len(codes) and codes[i + 1] == 2:
                        r, g, b_ = (codes[i + 2:i + 5] + [0, 0, 0])[:3]
                        col = "#%02x%02x%02x" % (r, g, b_)
                        i += 4
                    else:
                        col = None
                    if tgt == "fg":
                        fg = col
                    else:
                        bg = col
                i += 1
        tail = raw_line[pos:]
        out.append(open_span() + _esc(tail) + "</span>" if tail else "")
        out.append("</div>")
    body = "".join(out)
    hdr = ('<div class="bar"><span class="d r"></span><span class="d y"></span>'
           '<span class="d g"></span><span class="t">%s</span></div>' % _esc(title)) if title else ""
    return f"""<!doctype html><meta charset=utf-8><style>
@font-face{{font-family:MF;src:local("SF Mono"),local("Menlo"),local("DejaVu Sans Mono")}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0b0c0e;padding:18px;display:inline-block}}
.win{{background:{BG_DEFAULT};border-radius:9px;overflow:hidden;
  box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.07)}}
.bar{{height:26px;background:#22252a;display:flex;align-items:center;padding:0 10px;gap:6px}}
.d{{width:11px;height:11px;border-radius:50%}}
.r{{background:#ff5f56}}.y{{background:#ffbd2e}}.g{{background:#27c93f}}
.t{{color:#9aa0a6;font:11px/1 MF,monospace;margin-left:8px}}
.scr{{padding:10px 12px}}
.l{{font:13px/1.32 MF,"SF Mono",Menlo,monospace;white-space:pre;letter-spacing:0}}
</style><div class=win>{hdr}<div class=scr>{body}</div></div>"""


def tmux(*args, check=True):
    r = subprocess.run(["tmux", *args], capture_output=True, text=True)
    if check and r.returncode != 0 and "no server" not in r.stderr:
        raise SystemExit(f"tmux {' '.join(args)} failed: {r.stderr.strip()}")
    return r.stdout


def cap(name: str, ansi: bool) -> str:
    a = ["capture-pane", "-p", "-t", name]
    if ansi:
        a.insert(2, "-e")
    return tmux(*a)


def cmd_start(name, dims, cwd, argv, envs=()):
    cols, rows = dims.split("x")
    subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True)
    # keep the pane alive after the app exits so failures are readable
    inner = " ".join(_q(a) for a in argv) + '; printf "\\n[EXIT=%s]\\n" $?; sleep 86400'
    # `unset CI ...` is load-bearing, not hygiene: see ROOT CAUSE above. Every
    # is-in-ci trigger must die before the app starts or it renders nothing.
    inner = ("unset CI CONTINUOUS_INTEGRATION BUILD_NUMBER RUN_ID "
             "GITHUB_ACTIONS GITLAB_CI CIRCLECI TRAVIS APPVEYOR BUILDKITE "
             "DRONE TEAMCITY_VERSION TF_BUILD; ") + inner
    # Secrets enter the PTY at create only (tui-testing Iron Rule 8) — exported
    # inside the pane so they never appear in argv, ps output, or the cast.
    if envs:
        inner = "".join(f"export {k}={_q(v)}; " for k, v in envs) + inner
    tmux("new-session", "-d", "-s", name, "-x", cols, "-y", rows, "-c", cwd, inner)
    tmux("set-option", "-t", name, "status", "off")
    print(json.dumps({"session": name, "size": dims, "cwd": cwd, "cmd": argv,
                      "env_keys": [k for k, _ in envs]}))


def _q(s: str) -> str:
    return "'" + s.replace("'", "'\\''") + "'"


def cmd_wait(name, anchor, timeout=300.0):
    """Matched wait (Iron Rule 2): the exit code reflects the CONDITION, not transport."""
    deadline = time.time() + float(timeout)
    last = ""
    while time.time() < deadline:
        last = cap(name, False)
        if anchor in last:
            print(json.dumps({"matched": True, "anchor": anchor,
                              "waited_s": round(float(timeout) - (deadline - time.time()), 2)}))
            return 0
        time.sleep(0.5)
    sys.stderr.write(last[-1500:] + "\n")
    print(json.dumps({"matched": False, "anchor": anchor, "timedOut": True}))
    return 3


def cmd_keys(name, keys):
    for k in keys:
        tmux("send-keys", "-t", name, k)
        time.sleep(0.35)
    print(json.dumps({"sent": keys}))


def cmd_type(name, text):
    # literal, char-paced: overlays mount lazily and drop same-chunk chars (Iron Rule 3)
    for ch in text:
        tmux("send-keys", "-t", name, "-l", ch)
        time.sleep(0.035)
    print(json.dumps({"typed": text}))


def cmd_shot(name, out, title=""):
    html_path = out + ".html"
    with open(html_path, "w") as f:
        f.write(ansi_to_html(cap(name, True), title))
    with open(out + ".txt", "w") as f:
        f.write(cap(name, False))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 2200, "height": 1400}, device_scale_factor=2)
        pg.goto("file://" + os.path.abspath(html_path))
        pg.wait_for_timeout(220)
        el = pg.query_selector("body")
        el.screenshot(path=out)
        b.close()
    print(json.dumps({"png": out, "bytes": os.path.getsize(out), "txt": out + ".txt"}))


def main():
    if len(sys.argv) < 3 or sys.argv[1] != "session":
        print(__doc__)
        return 2
    op, name = sys.argv[2], sys.argv[3]
    rest = sys.argv[4:]
    if op == "start":
        dims, cwd = rest[0], rest[1]
        tail = rest[3:]
        envs = []
        # Strip --env pairs BEFORE locating the `--` separator: they may appear
        # on either side of it, so asserting on a fixed index is wrong.
        mid = list(rest[2:])
        while "--env" in mid:
            i = mid.index("--env")
            k, _, v = mid[i + 1].partition("=")
            envs.append((k, v))
            mid = mid[:i] + mid[i + 2:]
        if not mid or mid[0] != "--":
            raise SystemExit("start: expected `--` before the command")
        tail = mid[1:]
        return cmd_start(name, dims, cwd, tail, envs)
    if op == "wait":
        return cmd_wait(name, rest[0], rest[1] if len(rest) > 1 else 300)
    if op == "keys":
        return cmd_keys(name, rest)
    if op == "type":
        return cmd_type(name, rest[0])
    if op == "shot":
        t = ""
        if "--title" in rest:
            t = rest[rest.index("--title") + 1]
            rest = rest[:rest.index("--title")]
        return cmd_shot(name, rest[0], t)
    if op == "text":
        print(cap(name, False))
        return 0
    if op == "kill":
        subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True)
        print(json.dumps({"killed": name}))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main() or 0)
