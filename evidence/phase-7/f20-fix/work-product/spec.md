# F20 — fix-verify (Fix Verification)

## Description

Implement a first-class `--fix-verify` capability in proofpunk-agent: given a fix target (a task worktree under `.auto-claude/worktrees/tasks/<id>/` or HEAD), mechanically re-run the relevant verification battery (validators, gates, regression scenarios) against that target, seal the proof as a genuine fresh evidence run via the real `fresh_evidence.py` subprocess bridge, and map every result to the fixed verdict vocabulary **PASS / FAIL / BLOCKED / UNVERIFIED**. This closes the open pain from execution-ledger rows R1–R5 — especially R2, blocked on "re-run one verification window on HEAD" — where fix verification today is manual, scattered, and unproven.

## Rationale

- Fix verification is currently manual and scattered across validators, gates, and scenario harnesses with no unified verdict or proof artifact.
- R2 of the execution ledger requires a sealed fresh evidence run proving one verification window on HEAD; no single command today produces that.
- The project doctrine demands real subprocess-driven evidence lifecycle (`proofpunk_agent/bridge/evidence.py`), a 1024-byte artifact floor, secret-scan before seal, explicit `--run`, and consent-gated deletion. A dedicated fix-verify module can encode this doctrine once instead of per-fix ad hoc.
- **Budget nuance (R2/AC-10)**: under the landed conservative `_cost_refusal` guard, a 30-min ACTIVE perf window on HEAD projects $250.18 and is REFUSED at the default $3.00 budget (rc=3 before session start). Therefore fix-verify MUST NOT autonomously trigger spend: the default battery is cost-free (local validators/scenarios); any spend-bearing check (a live-session perf window) is opt-in via an explicit operator flag plus an explicit `--max-budget` raise. Fix-verify supplies the mechanism; consent stays with the operator. Idle windows are NOT a substitute (the R2 gate requires ACTIVE session load).

## User Stories

- **US-1**: As an operator landing a fix in a task worktree, I run `proofpunk-agent --fix-verify --target .auto-claude/worktrees/tasks/<id> --run <run-id>` so the relevant battery re-runs and I get a single verdict per check plus an overall verdict, backed by a sealed evidence run.
- **US-2**: As the maintainer closing ledger row R2, I run one command on HEAD with an explicitly raised budget to produce the sealed verification window proof; the ledger row update itself stays human-driven.
- **US-3**: As an auditor, I open the fix-verify report, see the fix target, each battery check with its verdict, and the cited evidence run directory and `step-NN-slug` artifact names, so I can audit the proof chain without re-running anything.
- **US-4**: As an operator, I never see fix-verify auto-select a run by mtime, delete an evidence run, or emit a verdict outside {PASS, FAIL, BLOCKED, UNVERIFIED}.

## Design

### Entrypoint & CLI

- `proofpunk_agent/__main__.py` gains a `--fix-verify` flag (argparse), composing with existing flags (`--project`, `--max-budget`, `--no-plugin`, `--proofpunk-path`, `--evidence-slug`, color/theme flags). `--check`, refusal exit code 2, and all existing behavior unchanged.
- Fix-target flags: `--fix-verify-target <path-or-HEAD>` (default `HEAD`; Q-3: worktree path or HEAD only — no arbitrary refs).
- Mandatory explicit `--run <run-id-or-slug>` for any execution touching existing runs (C-4); no mtime heuristics anywhere in the code path.
- Opt-in spend flags: `--with-perf` (adds the ACTIVE perf window check) — requires the operator to also pass an explicit raised `--max-budget`; if `--with-perf` is given with the default budget, fix-verify emits BLOCKED with a clear reason rather than attempting (and being refused) or silently skipping. `--with-fuzz` adds fuzz scenarios (local, cost-free).
- Headless: fix-verify runs entirely outside the TUI (plain stdout report). This is the minimal headless entry per C-6/F10 — implemented as a non-Textual CLI path in the fix-verify module, not a general F17 headless mode.

### Battery definition (Q-1 default, frozen here)

| Check | Source | Default |
|---|---|---|
| scenario_session | `validation/e2e/scenario_session.py` | on |
| scenario_tools | `validation/e2e/scenario_tools.py` | on |
| scenario_hooks | `validation/e2e/scenario_hooks.py` | on |
| scenario_evidence | `validation/e2e/scenario_evidence.py` | on |
| terminal_matrix | `validation/e2e/terminal_matrix.py` | on |
| keyboard_traversal | `validation/e2e/keyboard_traversal.py` | on |
| secret-scan gate | bridge `check_seal_gate` (7 patterns) | on |
| fuzz_keys / fuzz_paste / fuzz_resize | `validation/e2e/fuzz_*.py` | opt-in (`--with-fuzz`) |
| perf window (ACTIVE, live session) | `validation/perf/driver.py` | opt-in (`--with-perf` + explicit budget raise) |

### Core module

- New module `proofpunk_agent/fixverify/` (e.g. `__init__.py`, `battery.py`, `runner.py`, `report.py`, `verdicts.py`):
  - `verdicts.py`: the fixed vocabulary enum + mapping helpers. Only tokens PASS/FAIL/BLOCKED/UNVERIFIED.
  - `battery.py`: battery definition/selection from CLI flags; each check is a descriptor (name, command/bridge-call, cost-bearing?).
  - `runner.py`: orchestrates checks against the fix target, drives the evidence lifecycle **exclusively through `EvidenceBridge`** (`run_init` / `run_next_step` / `run_seal(force=...)` / `run_validate`): init a fresh run (`--evidence-slug` respected, slug default `fix-verify`), record each battery check as a `step-NN-slug` artifact (capture command, stdout/stderr, verdict into an artifact ≥ 1024 bytes — pad with structured metadata, never filler bytes), run `check_seal_gate` before any seal, seal, then `run_validate`.
  - `report.py`: renders the fix-verification report (target, per-check verdicts, evidence run dir + artifact names, `--` for missing values). Written both to stdout and as an artifact in the evidence run. No invented numbers or fake paths (C-10).

### Verdict mapping & exit codes (Q-2 default)

- Per-check verdicts and an overall verdict from {PASS, FAIL, BLOCKED, UNVERIFIED}:
  - check exit 0 + valid artifact → PASS
  - check exit non-zero → FAIL
  - runner failure, missing/undersized artifact, secret detected pre-seal, ambiguous target, spend-flag without budget → BLOCKED
  - target/run ambiguous, check could not execute, or result indeterminate → UNVERIFIED
- Exit codes: 0 = all PASS; 1 = any FAIL/BLOCKED/UNVERIFIED; 2 = refusal (unchanged contract). No F18 structured codes.

### Doctrine

- All lifecycle ops shell out to real `fresh_evidence.py` via `proofpunk_agent/bridge/evidence.py`; zero reimplementation (extend the bridge only if a needed hook is missing).
- 1024-byte floor: undersized artifact → step/run invalid, never sealed PASS.
- Secret-scan gate strictly before seal.
- No deletion of any evidence run; deletion stays consent-gated.
- Fail-closed everywhere (NFR-3).

## Acceptance Criteria

- [ ] AC-1: `--fix-verify` against a task worktree or HEAD re-runs the configured battery and creates a real evidence run directory `e2e-evidence/run-<ts>-<slug>/` via the `fresh_evidence.py` subprocess bridge (directory exists, created by subprocess, artifacts named `step-NN-slug`).
- [ ] AC-2: Every artifact in the fix-verify evidence run is ≥ 1024 bytes; runs with undersized artifacts are not sealed PASS.
- [ ] AC-3: Fix-verify refuses to operate without an explicit `--run` (or equivalent explicit target/flag) selection; no mtime-based run auto-selection exists in the code path.
- [ ] AC-4: Secret-scan gate executes before any seal; a detected secret blocks sealing with verdict BLOCKED (or FAIL per doctrine) and non-zero exit.
- [ ] AC-5: All verdicts in report/stdout/artifacts are exclusively from {PASS, FAIL, BLOCKED, UNVERIFIED}; grep over outputs finds no other verdict token.
- [ ] AC-6: Report identifies the fix target, lists each battery check with its verdict, cites evidence run directory and artifact names, renders missing values as `--`.
- [ ] AC-7: Fail-closed proven: induced battery failure and induced missing-artifact condition each yield FAIL/BLOCKED/UNVERIFIED respectively, never PASS.
- [ ] AC-8: Existing CLI behavior unchanged: `--check` exit 0/2, refusal exit 2, `--resume`/`--max-budget`/`--project`/`--no-plugin` all still work.
- [ ] AC-9: New validation coverage (scenario or `scenario_evidence.py` extension) demonstrates PASS, FAIL, and BLOCKED/UNVERIFIED fix-verify verdict paths end-to-end.
- [ ] AC-10: Demo: one fix-verify run on HEAD produces a sealed fresh evidence run sufficient to close R2's "re-run one verification window on HEAD" (with `--with-perf` + explicit raised `--max-budget` passed by the operator; ledger row update stays human-driven per Q-4).
- [ ] AC-11: No evidence run is deleted by fix-verify; any deletion path remains consent-gated.
- [ ] AC-12: Headless execution added minimally and documented; nothing assumes pre-existing headless mode (F17/N4).

## Implementation Plan Reference

Phased plan in `implementation_plan.json`: (1) core fix-verify module + battery runner, (2) CLI wiring + verdict mapping + report, (3) evidence sealing integration, (4) validation coverage + regression proof. Implemented in worktree `.auto-claude/worktrees/tasks/999-f20-fix-verify/`.

## Open Questions

Resolved per recommended defaults (frozen): Q-1 default battery as tabled above; Q-2 plain 0/1/2 exit codes; Q-3 worktree-or-HEAD targets only; Q-4 report-only, no ledger write-back. Revisit only if maintainer overrides.
