/**
 * Terminal service — wraps the vendored @main/terminal/pty-manager:
 * real node-pty spawns, real shells, real resize/kill. No emulation of the PTY itself.
 */
import { randomUUID } from 'node:crypto';
import { spawnPtyProcess, writeToPty, resizePty, killPty } from '@main/terminal/pty-manager';
import type { TerminalProcess } from '@main/terminal/types';

export interface TuiTerminal {
  proc: TerminalProcess;
}

export function spawnShell(cwd: string, cols: number, rows: number, profileEnv?: Record<string, string>): TuiTerminal {
  const { pty, shellType } = spawnPtyProcess(cwd, cols, rows, profileEnv);
  const proc: TerminalProcess = {
    id: randomUUID(),
    pty,
    isCLIMode: false,
    cwd,
    projectPath: cwd,
    outputBuffer: '',
    title: 'shell',
    shellType,
    hasExited: false,
  };
  return { proc };
}

export function write(t: TuiTerminal, data: string): void {
  if (t.proc.hasExited) return;
  writeToPty(t.proc, data);
}

export function resize(t: TuiTerminal, cols: number, rows: number): boolean {
  if (t.proc.hasExited) return false;
  return resizePty(t.proc, cols, rows);
}

export function kill(t: TuiTerminal): void {
  killPty(t.proc);
}

export function onData(t: TuiTerminal, cb: (data: string) => void): { dispose: () => void } {
  return t.proc.pty.onData(cb);
}

export function onExit(t: TuiTerminal, cb: (code: number) => void): { dispose: () => void } {
  return t.proc.pty.onExit(({ exitCode }) => { t.proc.hasExited = true; cb(exitCode); });
}

/** Map an Ink key event to terminal bytes for the PTY. */
export function encodeKey(input: string, key: import('ink').Key): string | null {
  if (key.ctrl && input) {
    const c = input.toLowerCase();
    if (c >= 'a' && c <= 'z') return String.fromCharCode(c.charCodeAt(0) - 96);
    if (c === ' ') return '\0';
    return null;
  }
  if (key.return) return '\r';
  if (key.escape) return '\x1b';
  if (key.backspace) return '\x7f';
  if (key.delete) return '\x1b[3~';
  if (key.tab) return key.shift ? '\x1b[Z' : '\t';
  if (key.upArrow) return '\x1b[A';
  if (key.downArrow) return '\x1b[B';
  if (key.rightArrow) return '\x1b[C';
  if (key.leftArrow) return '\x1b[D';
  if (key.pageUp) return '\x1b[5~';
  if (key.pageDown) return '\x1b[6~';
  if (input) return input;
  return null;
}
