# OPEN DEFECT — Logs view is a keyboard dead end (re-confirmed on a clean frame)

## Why this needed re-testing

Earlier in the session I saw escape fail to leave the Logs view, but the frame
was polluted by vendored `console.log` output (defect N7), so the observation was
ambiguous — the keys might have been working while the *display* was destroyed.

`FixLogsEscapeTrap` read the source and correctly refused to patch on my
hypothesis, reporting: *"no defect found in source; suspected display corruption,
needs re-drive after cli.tsx fix."* Its evidence:

- `apps/tui/src/hooks/useKeymap.ts:62-64,107` — each keymap installs its own
  `useInput` callback; `return` exits only that callback.
- `node_modules/ink/build/hooks/use-input.js:84-92` — every active `useInput`
  registers an independent EventEmitter listener. **No exclusive key winner, no
  event consumption.**
- `apps/tui/src/stores/app-store.ts:59,79` — `closeOverlays()` only touches
  `paletteOpen`/`helpOpen`; it *cannot* undo `setView('board')`.
- `apps/tui/src/App.tsx:49,147-163` — digits 1-7 are globally bound and `logs` is
  not excluded from that keymap.

By that reading, escape **and** digits should both work. So the re-drive was
required to tell display corruption apart from a real input defect.

## Re-drive after the D22 console fix landed (frame verified pristine)

Session `navq`, project `/Users/nick/dev/hunter-seed`, no agent started (so no
console flooding, and no auto-commit risk).

| Step | Action | Observed |
|---|---|---|
| 1 | boot | board renders, `❯ 003-patc` selected |
| 2 | press `l` | `TASK LOGS · 003-patc · 565 lines` — view opens, real content |
| 3 | press `escape` | **still TASK LOGS** — no change |
| 4 | press `1` (board digit) | **still TASK LOGS** — no change |

Screenshot: `step-03-DEFECT-logs-escape-noop-clean-frame.png`

## Verdict

**This is a real input-handling defect, not display corruption.** The frame was
clean and current (it rendered 565 live log lines), so the view was repainting
correctly — the key events simply produce no view change.

The source reading above says this *should* work, which means the actual cause is
something neither of us has yet located — a runtime condition (`isActive` false
for both keymaps? `textInputActive` stuck? the `logs` view rendering while
`viewActive` is false?) rather than the wiring itself.

**Not fixed in this session.** I did not ship a speculative patch against an
unproven hypothesis. The correct next step is to instrument `isActive` /
`globalKeysActive` / `textInputActive` at the moment the logs view has focus and
observe which guard is false.

## User-visible impact

Opening task logs with `l` traps the user; the only exit is `ctrl+c ×2` (quit).
This makes the otherwise-working LogsView fix (N2, 565 real lines streaming) much
less useful than it should be.
