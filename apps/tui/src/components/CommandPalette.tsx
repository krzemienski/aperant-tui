/**
 * Vim-style ':' command palette. Every command listed here is REAL — an
 * unknown or unimplemented command fails with a clear error, never a no-op.
 */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { Theme } from '../theme/themes';
import { THEME_NAMES } from '../theme/themes';
import { useAppStore, type ViewName } from '../stores/app-store';

export interface PaletteContext {
  openProject: (path: string) => void;
  quit: () => void;
}

const VIEW_CMDS: Record<string, ViewName> = {
  board: 'board', b: 'board',
  term: 'term', t: 'term',
  road: 'road', r: 'road',
  chat: 'chat', i: 'chat',
  tree: 'tree', w: 'tree',
  set: 'set', s: 'set',
  agents: 'agents', ag: 'agents',
  logs: 'logs',
};

export function runCommand(raw: string, ctx: PaletteContext): void {
  const store = useAppStore.getState();
  const v = raw.trim().toLowerCase();
  if (!v) return;
  if (v.startsWith('theme ')) {
    const name = v.split(/\s+/)[1];
    store.setTheme(name); // unknown theme → real error toast inside setTheme
    return;
  }
  if (VIEW_CMDS[v]) { store.setView(VIEW_CMDS[v]); return; }
  if (v.startsWith('project ')) { ctx.openProject(raw.trim().slice(8)); return; }
  if (v === 'q' || v === 'quit') { ctx.quit(); return; }
  if (v === 'themes') { store.flash(`themes: ${THEME_NAMES.join(' · ')}`); return; }
  store.flash(`unknown command: :${v}`);
}

export function CommandPalette({ theme: c, ctx }: { theme: Theme; ctx: PaletteContext }) {
  const [val, setVal] = useState('');
  const closePalette = useAppStore((s) => s.closePalette);
  return (
    <Box borderStyle="single" borderColor={c.accent} paddingX={1}>
      <Text color={c.accent}>:</Text>
      <TextInput
        value={val}
        onChange={setVal}
        placeholder={`theme ${THEME_NAMES.join('|')} │ board │ term │ road │ chat │ tree │ set │ agents │ q`}
        onSubmit={(v) => { closePalette(); runCommand(v, ctx); }}
      />
    </Box>
  );
}
