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

export function useKeymap(bindings: Bindings, opts: { isActive?: boolean } = {}): void {
  const { isActive = true } = opts;
  // Always dispatch through the LATEST bindings. Memoizing on key names (an
  // earlier version) froze first-render closures: handlers that read component
  // state (selected task, view data) acted on stale state — caught by the
  // Phase 2 gate when `L` moved the task selected at boot, not the current one.
  const ref = useRef(bindings);
  ref.current = bindings;
  useInput((input, key) => {
    const name = normalizeKey(input, key);
    if (name && ref.current[name]) ref.current[name]();
  }, { isActive });
}
