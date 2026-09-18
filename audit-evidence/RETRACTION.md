# RETRACTION — stale-frame evidence, retracted 2026-09-17

Verified by independent sha256 recomputation (not inherited from a report).
Command: `hashlib.sha256(p.read_bytes())` over each file, this session.

## R1 — Phase-5 "visible streaming" (hunter-seed) is ONE frame, not three

`evidence/phase-5/run-20260917T003750-tuistory-linked/hunter-seed/`

| sha256 (16) | bytes | file |
|---|---|---|
| `2adf16e4b81b88a1` | 130095 | `step-09-road-stream-1.png` |
| `2adf16e4b81b88a1` | 130095 | `step-10-road-stream-2.png` |
| `2adf16e4b81b88a1` | 130095 | `step-11-road-stream-3.png` |

Three samples, zero bits of difference. The `.txt` sidecars are identical too and
all read `RUNNING · features 50% — Running features phase...`.
`COVERAGE-MATRIX.md` records `matched=None` for all three — the captures were
never anchor-gated, so the shutter fired three times on one unchanged screen.

**Retracts:** `evidence/phase-5/.../VERDICT.md:18` criterion 4 "Visible streaming
during generation" for hunter-seed. Status → **UNPROVEN**.

## R2 — Phase-5 "lifecycle persists across restart" (vigil) cannot discriminate

| sha256 (16) | bytes | file |
|---|---|---|
| `3b47f591378c2482` | 141883 | `step-10-board-before-start.png` |
| `3b47f591378c2482` | 141883 | `step-39-lifecycle-after-restart.png` |

A post-restart frame byte-identical to a pre-start frame is *consistent with*
persistence but cannot distinguish it from a stale frame. As evidence it is
non-discriminating.

**Retracts:** `evidence/phase-5/.../VERDICT.md:24` criterion 10. Status →
**UNPROVEN** (re-prove with a mutated, therefore discriminating, state).

## R3 — `functional-evidence/` "generation streaming" is one frame across 57s

| sha256 (16) | bytes | file |
|---|---|---|
| `570cee9663c59320` | 94791 | `gen-glm-t004.png` |
| `570cee9663c59320` | 94791 | `gen-glm-live-t030.png` |
| `570cee9663c59320` | 94791 | `gen-glm-live-t061.png` |
| `c578092d70b96bc9` | 103776 | `gen2-t003.png` |
| `c578092d70b96bc9` | 103776 | `gen2-t004.png` |

Filenames assert t=4s, t=30s, t=61s. Identical bytes. **UNPROVEN.**

## R4 — `routing-settings.png` does not show routing

`ff208d5d8d14cf9e` is byte-identical to `ux-reports/_ctl-theme-b.png` (a theme
control). Its own sidecar `routing-settings.txt:17-18` reads
`provider  not configured`. The frame presented as router proof shows an
unconfigured provider (this is defect **D-A**, not proof).

**Retracts:** any routing claim resting on this file. **UNPROVEN.**

## R5 — retracted vitest figure still cited

`evidence/gate-recheck/CORRECTION.md` retracts the "11 suites / 41 tests failing"
number (masked exit code). `evidence/phase-5/.../VERDICT.md:25,52` still cites it.
Measured this session: `CI=1 npm test` → **exit 0, 9 passed**.

## Disposition

These files are KEPT as failure evidence (never deleted) and are excluded from
any PASS claim. Every retracted criterion is re-proven in
`evidence/phase-6/` with anchor-gated, distinctness-asserted capture.
