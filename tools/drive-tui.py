#!/usr/bin/env python3
# Drive the real TUI in a real PTY, send scripted keystrokes, and record a
# genuine asciinema v2 .cast of the byte stream plus a pyte-rendered final
# screen dump (so the evidence is personally examinable as text).
#
# usage: drive-tui.py <out_prefix> <cols>x<rows> <script.json> -- cmd...
# script.json: [["sleep", 0.6], ["key", "2"], ["type", ":theme matrix"], ...]
# Exit code: the TUI's exit code.
import json, os, sys, time
import pexpect, pyte

def main():
    out_prefix, dims, script_path = sys.argv[1], sys.argv[2], sys.argv[3]
    assert sys.argv[4] == "--"
    cmd = sys.argv[5:]
    cols, rows = map(int, dims.split("x"))
    script = json.load(open(script_path))

    env = dict(os.environ)
    cast = {"version": 2, "width": cols, "height": rows, "timestamp": int(time.time()),
            "env": {"TERM": env.get("TERM", "xterm-256color"), "COLORTERM": env.get("COLORTERM", "")},
            "title": " ".join(cmd)}
    events = []
    screen = pyte.Screen(cols, rows)
    stream = pyte.ByteStream(screen)
    t0 = time.monotonic()

    child = pexpect.spawn(cmd[0], cmd[1:], dimensions=(rows, cols), env=env, encoding=None, timeout=30)
    all_bytes = bytearray()

    def drain(timeout=0.05):
        while True:
            try:
                chunk = child.read_nonblocking(size=65536, timeout=timeout)
            except pexpect.TIMEOUT:
                break
            except pexpect.EOF:
                return False
            events.append([round(time.monotonic() - t0, 6), "o", chunk.decode("utf-8", "replace")])
            all_bytes.extend(chunk)
            stream.feed(chunk)
            timeout = 0.01
        return True

    alive = True
    for step in script:
        if not alive:
            break
        if step[0] == "sleep":
            time.sleep(step[1])
        elif step[0] == "key":
            mapping = {"esc": b"\x1b", "enter": b"\r", "tab": b"\t", "shift+tab": b"\x1b[Z",
                       "up": b"\x1b[A", "down": b"\x1b[B", "left": b"\x1b[D", "right": b"\x1b[C",
                       "ctrl+c": b"\x03", "backspace": b"\x7f"}
            child.send(mapping.get(step[1], step[1].encode()))
            time.sleep(0.12)
        elif step[0] == "type":
            for ch in step[1]:
                child.send(ch.encode())
                time.sleep(0.02)
        elif step[0] == "marker":
            events.append([round(time.monotonic() - t0, 6), "m", step[1]])
        alive = drain() and child.isalive()

    deadline = time.monotonic() + 5
    while child.isalive() and time.monotonic() < deadline:
        if not drain(0.2):
            break
    drain(0.3)
    if child.isalive():
        child.close(force=True)

    with open(out_prefix + ".cast", "w") as f:
        f.write(json.dumps(cast) + "\n")
        for ev in events:
            f.write(json.dumps(ev) + "\n")
    with open(out_prefix + ".screen.txt", "w") as f:
        f.write("\n".join(line.rstrip() for line in screen.display))
    with open(out_prefix + ".raw.log", "wb") as f:
        f.write(bytes(all_bytes))
    print(f"cast={out_prefix}.cast events={len(events)} bytes={len(all_bytes)} exit={child.exitstatus}")
    sys.exit(child.exitstatus or 0)

if __name__ == "__main__":
    main()
