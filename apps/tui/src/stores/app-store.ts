/** Global UI state (Zustand 5). */
import { create } from 'zustand';
import { THEME_NAMES, DEFAULT_THEME } from '../theme/themes';
import { loadConfig, updateConfig } from '../services/config-service';

export type ViewName = 'board' | 'term' | 'road' | 'chat' | 'tree' | 'set' | 'agents' | 'logs';
export const VIEWS: ViewName[] = ['board', 'term', 'road', 'chat', 'tree', 'set', 'agents'];

interface AppState {
  view: ViewName;
  previousView: ViewName;
  themeName: string;
  paletteOpen: boolean;
  helpOpen: boolean;
  toast: string | null;
  configError: string | null;
  setView: (v: ViewName) => void;
  setTheme: (name: string) => void;
  cycleTheme: (dir: 1 | -1) => void;
  openPalette: () => void;
  closePalette: () => void;
  toggleHelp: () => void;
  closeOverlays: () => void;
  flash: (msg: string) => void;
}

let bootTheme = DEFAULT_THEME;
let bootConfigError: string | null = null;
try {
  bootTheme = loadConfig().theme;
  if (!THEME_NAMES.includes(bootTheme)) {
    bootConfigError = `unknown theme "${bootTheme}" in tui.json (have: ${THEME_NAMES.join(', ')}) — using ${DEFAULT_THEME}`;
    bootTheme = DEFAULT_THEME;
  }
} catch (err) {
  bootConfigError = err instanceof Error ? err.message : String(err);
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  view: 'board',
  previousView: 'board',
  themeName: bootTheme,
  paletteOpen: false,
  helpOpen: false,
  toast: null,
  configError: bootConfigError,
  setView: (v) => set((s) => ({ view: v, previousView: s.view })),
  setTheme: (name) => {
    if (!THEME_NAMES.includes(name)) {
      get().flash(`unknown theme: ${name} (have: ${THEME_NAMES.join(', ')})`);
      return false as never;
    }
    set({ themeName: name });
    try { updateConfig({ theme: name }); } catch (err) {
      set({ configError: err instanceof Error ? err.message : String(err) });
    }
    get().flash(`theme → ${name}`);
  },
  cycleTheme: (dir) => {
    const i = THEME_NAMES.indexOf(get().themeName);
    const next = THEME_NAMES[(i + dir + THEME_NAMES.length) % THEME_NAMES.length];
    get().setTheme(next);
  },
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  closeOverlays: () => set({ paletteOpen: false, helpOpen: false }),
  flash: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 1800);
  },
}));
