#!/usr/bin/env python3
"""
Regenerate the GitHub Pages doc pages (docs/doc-*.html) from the markdown
sources in docs/plan/**. Idempotent: safe to run after every doc change.

Chrome matches the existing site: title bar with LED stats, numbered tab nav,
statusline, footer. Doc bodies are pandoc gfm→html fragments.
"""
import datetime
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

CHROME_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — APERANT TUI</title>
<meta name="description" content="Aperant TUI — the full Aperant agent runtime in your terminal. Real gates, real evidence.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="wrap">
<div class="chrome">
  <div class="chrome-bar">
    <span class="brand">APERANT</span><span class="sep">│</span>
    <span class="meta">aperant-tui</span><span class="sep">│</span>
    <span class="branch">⑂ main</span><span class="sep">│</span>
    <span class="meta"><span class="led ok"></span>{gated} phases gated</span>
    <span class="meta"><span class="led idle"></span>generated {date}</span>
  </div>
  <nav class="tabs"><a href="index.html" class=""><span class="n">1</span>overview</a><a href="roadmap.html" class=""><span class="n">2</span>roadmap</a><a href="phases.html" class=""><span class="n">3</span>phases</a><a href="evidence.html" class=""><span class="n">4</span>evidence</a><a href="docs.html" class="on"><span class="n">5</span>docs</a></nav>

<main>
<section><div class="marker">DOC / {name}</div><div class="doc">
"""

CHROME_TAIL = """</div></section>
</main>
  <div class="statusline"><span><b>DOC · {name}</b></span><span>: cmd &nbsp; ? help</span></div>
</div>
<footer>
  <div class="wrap" style="padding:0">
    <span>APERANT TUI — vendored runtime, zero mocks, gate-proven.</span>
    &nbsp;<a href="https://github.com/krzemienski/aperant-tui">github.com/krzemienski/aperant-tui</a>
    &nbsp;· upstream <a href="https://github.com/AndyMik90/Aperant">AndyMik90/Aperant</a> @ 20250db0
  </div>
</footer>
</div>
</body>
</html>
"""


def md_to_fragment(md_path: Path) -> str:
    r = subprocess.run(
        ["pandoc", "-f", "gfm", "-t", "html", str(md_path)],
        capture_output=True, text=True, check=True,
    )
    return r.stdout


def build_doc(md_path: Path, out_name: str, title: str, gated: int, date: str) -> None:
    body = md_to_fragment(md_path)
    html = (
        CHROME_HEAD.format(title=title, name=out_name, gated=gated, date=date)
        + body
        + CHROME_TAIL.format(name=out_name)
    )
    (DOCS / f"doc-{out_name}.html").write_text(html)
    print(f"built doc-{out_name}.html from {md_path.relative_to(ROOT)}")


def main() -> None:
    date = datetime.date.today().isoformat()
    # gated phase count derived from ROADMAP status table (real source)
    roadmap = (DOCS / "plan" / "ROADMAP.md").read_text()
    gated = len(re.findall(r"\*\*PASSED\*\*", roadmap))
    built = []
    for md in sorted((DOCS / "plan").glob("*.md")) + sorted((DOCS / "plan" / "phases").glob("*.md")):
        name = md.stem
        build_doc(md, name, name, gated, date)
        built.append(name)
    for extra in ["VENDORED-PATCHES.md", "README.md", "VENDORED.md"]:
        p = ROOT / extra
        if p.exists():
            build_doc(p, p.stem, p.stem, gated, date)
            built.append(p.stem)
    print("docs built:", ", ".join(built))


if __name__ == "__main__":
    sys.exit(main())
