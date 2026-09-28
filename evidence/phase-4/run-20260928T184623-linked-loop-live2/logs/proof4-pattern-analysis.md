# Proof-4 pattern analysis — measured, with a canary test

I had asserted twice that 'no narrower regex is a drop-in replacement' and
that the literal clause would cost '242 files', without measuring either.
Both are now measured. One was slightly wrong.

## Candidate patterns over ALL of evidence/

| Pattern | hits in evidence/ | catches a real credential? |
|---|---|---|
| `s[k]-ant-[A-Za-z0-9_-]{20,}` | **0** | YES (canary hit) |
| `ANTHROPIC_AUTH_TO[K]EN=[A-Za-z0-9]` | **0** | YES (canary hit) |
| `s[k]-[A-Za-z0-9]{32,}` | 0 | NO — misses a real key (rejected) |
| `s[k]-[A-Za-z0-9-]{20,}` | 41 | YES |

Canary method: wrote the LIVE token, an ANTHROPIC_AUTH_TO<x>KEN= assignment,
and a realistic s[k]-ant-api03-... key to a temp file outside the repo, then
ran each pattern against it. A pattern that returns 0 on evidence/ is only
useful if it still fires on a genuine leak — s[k]-[A-Za-z0-9]{32,} does not,
so it is rejected despite scoring 0.

## So a discriminating replacement DOES exist

  rg -n 's[k]-ant-[A-Za-z0-9_-]{20,}|ANTHROPIC_AUTH_TO[K]EN=[A-Za-z0-9]' evidence/

returns **0 lines** today and still catches the canary. This corrects my
earlier claim that no narrower pattern works over evidence/ as a whole.

## The 41 hits of the looser variant

All in PRE-EXISTING runs (phase-4/run-20260918..., phase-5, phase-6,
phase-7). **0 in this run's root.** Inspected: they are synthetic vectors
authored while implementing vigil's OWN redaction feature (VG-005) —
s[k]-abc123DEF456ghi789jkl, 'hunter2-literal-token', OPENAI_KEY_USE
s[k]-abcdefghijklmnop0123456789 — each shown in a tool-result being
correctly replaced by [redacted:<hash>].

## Corrected cost of satisfying the clause literally

  files containing a literal-clause hit, ALL evidence/ : 243  (I said 242)
  of which are in THIS run                            :   9

The 9 include agent-events.jsonl, console.log and the agent's own
implementation_plan-006.json — the artifacts that ARE the proof for
criteria 1-5. Editing them to satisfy a substring regex would falsify the
evidence, which is why this is surfaced as a decision rather than done.
