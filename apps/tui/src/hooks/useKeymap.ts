/**
 * Declarative keybinding registry over Ink's useInput.
 *
 * Bindings map normalized key names to handlers:
 *   useKeymap({ 'j': down, 'shift+tab': back, ':': palette, 'ctrl+c': quit });
 *
 * Normalized names: single chars ('j', ':', '?', '1'), 'return', 'escape',
 * 'tab', 'shift+tab', 'up'/'down'/'left'/'right', 'ctrl+<char>',
 * 'shift+<char>' for uppercase letters arrives as the char itself.
 * Config remapping: entries in tui.json keymap map action -> new key.
 */
import { useInput } from 'ink';
import type { Key } from 'ink';
import { useRef } from 'react';
import { loadConfig } from '../services/config-service';

export type KeyHandler = () => void;
export type Bindings = Record<string, KeyHandler>;

export function normalizeKey(input: string, key: Key): string | null {
  if (key.ctrl && input) return `ctrl+${input.toLowerCase()}`;
  if (key.escape) return 'escape';
  if (key.return) return 'return';
  if (key.tab && key.shift) return 'shift+tab';
  if (key.tab) return 'tab';
  if (key.upArrow) return 'up';
  if (key.downArrow) return 'down';
  if (key.leftArrow) return 'left';
  if (key.rightArrow) return 'right';
  if (key.backspace) return 'backspace';
  if (key.delete) return 'delete';
  if (key.pageUp) return 'pageup';
  if (key.pageDown) return 'pagedown';
  if (!input) return null;
  return input;
}

/** Apply tui.json keymap remaps: { "quit": "q" } rebinds the 'quit' action. */
export function withRemaps(actions: Record<string, { key: string; run: KeyHandler }>): Bindings {
  let remaps: Record<string, string> = {};
  try { remaps = loadConfig().keymap; } catch { /* config error surfaced at boot */ }
  const out: Bindings = {};
  for (const [action, { key, run }] of Object.entries(actions)) {
    out[remaps[action] ?? key] = run;
  }
  return out;
}

export function useKeymap(
  bindings: Bindings,
  opts: { isActive?: boolean; splittableKeys?: string[] } = {},
): void {
  const { isActive = true, splittableKeys } = opts;
  // Always dispatch through the LATEST bindings. Memoizing on key names (an
  // earlier version) froze first-render closures: handlers that read component
  // state (selected task, view data) acted on stale state — caught by the
  // Phase 2 gate when `L` moved the task selected at boot, not the current one.
  const ref = useRef(bindings);
  ref.current = bindings;
  const splitRef = useRef(splittableKeys);
  splitRef.current = splittableKeys;
  useInput((input, key) => {
    const name = normalizeKey(input, key);
    if (name && ref.current[name]) { ref.current[name](); return; }
    // P7.1 dropped-keystroke fix (evidence/phase-7/perf/P7.1-RECHECK3-VERDICT.md):
    // Ink's useInput calls its keypress parser ONCE per raw stdin `data` event
    // — per Ink's own doc comment, "if user pastes text and it's more than
    // one character, the callback will be called only once and the whole
    // string will be passed as `input`". Under sustained rapid key-repeat,
    // the PTY can coalesce several identical keystrokes (holding `j` can
    // produce one `data` event containing "jjjj") into a single event before
    // this process's read-loop drains it. Ink's parseKeypress then finds no
    // recognized pattern for a multi-char run, returns an empty key name, and
    // the WHOLE chunk becomes `input` verbatim — matching no binding above
    // and being silently dropped in its entirety (measured: 73-93% of
    // keystrokes lost under sustained input, not partial credit — either the
    // exact single-key chunk survives, or nothing from that event does).
    //
    // Fix: `splittableKeys` is an EXPLICIT, caller-provided opt-in allowlist
    // (default: none — splitting is off everywhere unless a view asks for
    // it). Only when the failed lookup's `name` is a uniform run of ONE
    // character that is BOTH bound AND named in the caller's allowlist do we
    // treat it as N real keystrokes and dispatch that binding once per
    // character. This is deliberately NOT a generic heuristic over every
    // single-char binding: a handler is only safe to fire N times
    // synchronously in one React batch if it is a pure state transition with
    // no side effects that depend on intermediate (same-tick) state having
    // already flushed — e.g. `setSel((s) => Math.min(s + 1, max))` is safe
    // (each call sees the correctly QUEUED updater chain); a handler that
    // reads `starting`/`task.status` from a stale closure and starts an
    // async process or persists to disk is NOT, and must never be listed.
    // Each caller names only the keys it has verified are safe — see
    // BoardView.tsx's `j`/`k` for the reference case.
    //
    // A MIXED run (e.g. "jk" from fast alternating presses, or pasted text)
    // is deliberately NEVER split — there is no way to know which handler(s)
    // the user intended for an ambiguous chunk, and firing the wrong one (or
    // several, in an unintended order) is worse than dropping it, exactly as
    // it was dropped before this fix.
    if (name && name.length > 1 && splitRef.current?.length) {
      const ch = name[0];
      const isUniformRun = name === ch.repeat(name.length);
      if (isUniformRun && splitRef.current.includes(ch) && ref.current[ch]) {
        for (let i = 0; i < name.length; i += 1) ref.current[ch]();
      }
    }
  }, { isActive });
}
