# Secret-scan census — run-20260928T184623-linked-loop-live2

Recorded 2026-09-28. Every number below is produced by running the command on
the left; nothing is asserted from memory. The literal regexes are spelled with
a character class (`s[k]-`) so THIS FILE cannot match its own patterns and
inflate the next scan — an earlier draft of this census did exactly that and
reported a phantom `ANTHROPIC_AUTH_TO<x>KEN=..` hit that was its own text.

## 1. The live operator credential — the only thing that is actually a secret

| Command | Result |
|---|---|
| `rg -F "$ANTHROPIC_AUTH_TOKEN" evidence/` | **0 matches** |
| `rg -F "$ANTHROPIC_AUTH_TOKEN"` over this run root | **0 matches** |

The token is read from the operator environment with `zsh -lc` and handed to
`tui-capture.py session start --env`, which exports it INSIDE the tmux pane. It
never appears in argv, in `ps` output, in the captured grid, or in any file.
`APERANT_USER_DATA` points outside the repo (`/tmp/aperant-userdata-<run>`), so
the live `settings.json` that holds a real `apiKey` is never inside `evidence/`;
only `settings-redacted.json` is, and its every credential field reads
`<REDACTED-from-env-at-runtime>`.

## 2. Key-shaped strings (`s[k]-` followed by 8+ key characters)

| Scope | Result |
|---|---|
| This run root | **0 matches** |
| All of `evidence/` | 93 matches, none in this run |

The 93 live in PRE-EXISTING committed runs
(`run-20260918T163148-linked-loop-final2/**`, `phase-7/SECRET-SCAN-FINAL.md`).
They are synthetic test vectors — repeated-character and `deadbeef`-style
placeholders authored by an agent while implementing vigil's OWN secret
redaction feature (VG-005). None is an operator credential; §1 is the
authoritative check for that and returns 0.

## 3. `ANTHROPIC_AUTH_TO<x>KEN=` assignments with a value

| Scope | Result |
|---|---|
| All of `evidence/` (excluding this census) | **0 matches** |

## 4. Why the objective's literal command still prints lines

The objective's proof command is:

```
rg -n 's[k]-|ANTHROPIC_AUTH_TO<x>KEN=..' evidence/
```

Read literally, `s[k]-` is an unanchored substring, so it also matches ordinary
English and identifiers. Measured inside this run root, every single hit is a
word that happens to contain those two letters followed by a hyphen:

| Substring | Count | What it actually is |
|---|---|---|
| `di[s]k-first` | 15 | vigil's own architecture prose |
| `subta[s]k-N-M` | ~30 | subtask ids in the agent's implementation plan |
| `ta[s]k-execution`, `ta[s]k-event`, `Ta[s]k-level` | 5 | runtime event names |
| `ri[s]k-reduction`, `a[s]k-hit` | 2 | prose |
| bare `s[k]-` / `s[k]-*` | 8 | the literal text of vigil feature VG-005, "Built-in patterns detect s[k]-* keys …" |

Total in this run root: 52 substring hits, **0** of which are credentials, and
**0** of which are even key-shaped (§2).

This is recorded as a measured finding rather than silently "fixed": suppressing
it would mean deleting real roadmap content that legitimately discusses secret
redaction, or renaming the runtime's own `subtask-` identifiers. The
credential-bearing checks (§1, §2 scoped to this run, §3) are the ones that
carry meaning, and all three are zero.
