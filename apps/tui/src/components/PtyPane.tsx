/**
 * PtyPane — terminal-in-terminal.
 *
 * node-pty (via @main/terminal/pty-manager, unmodified) -> @xterm/headless
 * screen buffer -> Ink <Text> rows. Performance guards (spec Part 3):
 *   1. run-length coalescing — adjacent cells with identical attrs merge
 *   2. 16 ms frame throttle — PTY bursts coalesce into <=60fps renders
 *   3. dirty-row tracking — row content hashed; unchanged rows skip render
 *   4. scrollback cap — 10,000 lines, matching the desktop buffer setting
 */
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { createRequire } from 'node:module';
// @xterm/headless ships a UMD main (no exports map); ESM named imports fail
// static analysis on it, so load it through createRequire. Types still come
// from the package's own typings.
const { Terminal } = createRequire(import.meta.url)('@xterm/headless') as typeof import('@xterm/headless');
type TerminalInstance = InstanceType<typeof Terminal>;
import type { Theme } from '../theme/themes';
import { xterm256Hex } from '../util/truecolor';
import * as termSvc from '../services/terminal-service';

export const SCROLLBACK_CAP = 10_000;
export const FRAME_MS = 16;

interface CellAttrs { fg: string; bg: string; bold: boolean; dim: boolean; inverse: boolean; }
export interface Run { text: string; attrs: CellAttrs; }
export interface Row { runs: Run[]; hash: string; }

export interface XCell {
  getChars(): string; getFgColorMode(): number; getFgColor(): number;
  getBgColorMode(): number; getBgColor(): number;
  isBold(): number; isDim(): number; isInverse(): number;
}

function cellAttrs(cell: XCell | undefined, theme: Theme): CellAttrs {
  if (!cell) return { fg: theme.text, bg: theme.bg, bold: false, dim: false, inverse: false };
  let fg = theme.text, bg = theme.bg;
  const fgMode = cell.getFgColorMode(), bgMode = cell.getBgColorMode();
  if (fgMode === 2) fg = '#' + cell.getFgColor().toString(16).padStart(6, '0');
  else if (fgMode === 1) fg = xterm256Hex(cell.getFgColor());
  if (bgMode === 2) bg = '#' + cell.getBgColor().toString(16).padStart(6, '0');
  else if (bgMode === 1) bg = xterm256Hex(cell.getBgColor());
  return { fg, bg, bold: !!cell.isBold(), dim: !!cell.isDim(), inverse: !!cell.isInverse() };
}

const sameAttrs = (a: CellAttrs, b: CellAttrs) =>
  a.fg === b.fg && a.bg === b.bg && a.bold === b.bold && a.dim === b.dim && a.inverse === b.inverse;

/** Read the visible viewport with run-length coalescing + per-row hashes. */
export function readBuffer(term: TerminalInstance, theme: Theme): Row[] {
  const buf = term.buffer.active;
  const rows: Row[] = [];
  for (let y = 0; y < term.rows; y++) {
    const line = buf.getLine(buf.viewportY + y);
    const runs: Run[] = [];
    let hash = '';
    if (line) {
      let cur: Run | null = null;
      for (let x = 0; x < term.cols; x++) {
        const cell = line.getCell(x) as XCell | undefined;
        const ch = cell?.getChars() || ' ';
        const attrs = cellAttrs(cell, theme);
        hash += ch;
        if (cur && sameAttrs(cur.attrs, attrs)) cur.text += ch;
        else { cur = { text: ch, attrs }; runs.push(cur); }
      }
    }
    rows.push({ runs, hash });
  }
  return rows;
}

const MemoRow = memo(function Row({ row }: { row: Row }) {
  return (
    <Text wrap="truncate-end">
      {row.runs.map((r, i) => (
        <Text key={i} color={r.attrs.fg} backgroundColor={r.attrs.bg} bold={r.attrs.bold} dimColor={r.attrs.dim} inverse={r.attrs.inverse}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
}, (prev, next) => prev.row.hash === next.row.hash);

interface PtyPaneProps {
  cwd: string;
  theme: Theme;
  focused: boolean;
  title: string;
  onExit?: (code: number) => void;
  /** Exposed for tests/zoom: the raw PTY write channel. */
  onReady?: (t: termSvc.TuiTerminal) => void;
}

export function PtyPane({ cwd, theme, focused, title, onExit, onReady }: PtyPaneProps) {
  const { stdout } = useStdout();
  const cols = Math.max(20, (stdout?.columns ?? 80) - 4);
  const rows = Math.max(4, (stdout?.rows ?? 24) - 10);
  const [frame, setFrame] = useState<Row[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const stateRef = useRef<{ term: TerminalInstance; t: termSvc.TuiTerminal; pending: string[]; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  useEffect(() => {
    const term = new Terminal({ cols, rows, scrollback: SCROLLBACK_CAP, allowProposedApi: true });
    const t = termSvc.spawnShell(cwd, cols, rows);
    const st = { term, t, pending: [] as string[], timer: null as ReturnType<typeof setTimeout> | null };
    stateRef.current = st;

    // Guard 2: frame throttle — coalesce PTY bursts into <=60fps buffer writes.
    const flush = () => {
      st.timer = null;
      if (!st.pending.length) return;
      const chunk = st.pending.join('');
      st.pending = [];
      term.write(chunk, () => setFrame(readBuffer(term, theme)));
    };
    const dataOff = termSvc.onData(t, (data) => {
      st.pending.push(data);
      if (!st.timer) st.timer = setTimeout(flush, FRAME_MS);
    });
    const exitOff = termSvc.onExit(t, (code) => { setExitCode(code); onExit?.(code); });
    onReady?.(t);

    return () => {
      if (st.timer) clearTimeout(st.timer);
      dataOff.dispose();
      exitOff.dispose();
      termSvc.kill(t);
      term.dispose();
      stateRef.current = null;
    };
  }, [cwd]);

  useEffect(() => {
    const st = stateRef.current;
    if (st) termSvc.resize(st.t, cols, rows);
  }, [cols, rows]);

  useInput((input, key) => {
    const st = stateRef.current;
    if (!st) return;
    const bytes = termSvc.encodeKey(input, key);
    if (bytes) termSvc.write(st.t, bytes);
  }, { isActive: focused && exitCode === null });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {exitCode !== null ? (
        <Text color={theme.faint}>process exited (code {exitCode}) — pane closed</Text>
      ) : (
        frame.map((row, y) => <MemoRow key={y} row={row} />)
      )}
    </Box>
  );
}
