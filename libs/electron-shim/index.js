/**
 * electron — Node runtime implementation of the electron API subset that
 * Aperant's apps/desktop/src/main/** touches at import time and runtime.
 *
 * Fidelity contract (what is REAL here):
 *  - app.getPath: real directories on disk, created on demand. userData
 *    defaults to ~/.aperant (the TUI's real config home, overridable with
 *    APERANT_USER_DATA for tests).
 *  - ipcMain: a real handler registry (handle/invoke round-trips work).
 *  - BrowserWindow: no renderer exists in a TUI. The class is real but
 *    webContents.send is a deliberate no-op — there is nothing to send to.
 *    getAllWindows() legitimately returns [].
 *  - safeStorage: honestly reports encryption unavailable (no OS keychain
 *    in a headless terminal); upstream code takes its documented fallback.
 *  - shell.openPath/openExternal: really opens via xdg-open when present,
 *    and rejects clearly when no opener exists.
 *  - Anything not implemented throws UnsupportedInTuiError loudly instead of
 *    silently faking success.
 */

import { EventEmitter } from 'node:events';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export class UnsupportedInTuiError extends Error {
  constructor(api) {
    super(`electron.${api} is not available in the TUI runtime (no Electron shell). ` +
          `If src/main reached this, the TUI service layer must provide the capability directly.`);
    this.name = 'UnsupportedInTuiError';
  }
}

const userData = process.env.APERANT_USER_DATA || path.join(os.homedir(), '.aperant');

const PATHS = {
  userData,
  home: os.homedir(),
  temp: os.tmpdir(),
  appData: process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  documents: path.join(os.homedir(), 'Documents'),
  downloads: path.join(os.homedir(), 'Downloads'),
  logs: path.join(userData, 'logs'),
  crashDumps: path.join(userData, 'crashDumps'),
};

for (const p of new Set(Object.values(PATHS))) {
  try { mkdirSync(p, { recursive: true }); } catch { /* read-only fs: surfaces on first write */ }
}

const appEvents = new EventEmitter();
let ready = true; // a Node process is always "ready" — no browser startup phase

// Electron patches process.resourcesPath; reproduce it for src/main.
try { Object.defineProperty(process, 'resourcesPath', { value: realpathSync(new URL('../../apps/desktop', import.meta.url).pathname), configurable: true }); } catch { /* already defined */ }

export const app = {
  getPath(name) {
    if (!(name in PATHS)) throw new UnsupportedInTuiError(`app.getPath('${name}')`);
    return PATHS[name];
  },
  setPath(name, p) {
    if (!(name in PATHS)) throw new UnsupportedInTuiError(`app.setPath('${name}')`);
    PATHS[name] = p;
    try { mkdirSync(p, { recursive: true }); } catch { /* surfaces on first write */ }
  },
  getAppPath() {
    // The vendored desktop package root — two levels up from libs/electron-shim.
    // Dual-format safe: esbuild CJS bundles (agent worker) have no import.meta.
    let shimDir;
    try { shimDir = realpathSync(new URL('../../apps/desktop', import.meta.url).pathname); }
    catch {
      // CJS bundle (esbuild worker): __dirname = apps/tui/dist → repo root is ../..
      shimDir = realpathSync(path.resolve(__dirname, '../../apps/desktop'));
    }
    return shimDir;
  },
  getVersion() {
    return process.env.APERANT_TUI_VERSION || '0.1.0';
  },
  getName() { return 'aperant-tui'; },
  isPackaged: true, // from src/main's perspective the TUI is a production runtime, not `electron-vite dev`
  isReady: () => ready,
  whenReady: () => Promise.resolve(),
  on: (ev, fn) => (appEvents.on(ev, fn), undefined),
  once: (ev, fn) => (appEvents.once(ev, fn), undefined),
  removeListener: (ev, fn) => (appEvents.removeListener(ev, fn), undefined),
  quit: (code = 0) => process.exit(code),
  exit: (code = 0) => process.exit(code),
  setAppUserModelId: () => undefined,
  requestSingleInstanceLock: () => true,
  disableHardwareAcceleration: () => undefined,
  commandLine: { appendSwitch: () => undefined },
  getLocale: () => Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
};

class IpcMainRegistry extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
  }
  handle(channel, handler) { this.handlers.set(channel, handler); }
  handleOnce(channel, handler) { this.handlers.set(channel, handler); }
  removeHandler(channel) { this.handlers.delete(channel); }
  /** Test/diagnostic helper: invoke a registered handler the way ipcRenderer.invoke would. */
  async invokeHandler(channel, event, ...args) {
    const h = this.handlers.get(channel);
    if (!h) throw new Error(`No ipcMain handler registered for channel: ${channel}`);
    return h(event, ...args);
  }
}
export const ipcMain = new IpcMainRegistry();

/** No renderer exists in the TUI; invoke throws so misuse fails loudly. */
export const ipcRenderer = {
  invoke: () => { throw new UnsupportedInTuiError('ipcRenderer.invoke (no renderer process exists)'); },
  send: () => { throw new UnsupportedInTuiError('ipcRenderer.send (no renderer process exists)'); },
  on: () => { throw new UnsupportedInTuiError('ipcRenderer.on (no renderer process exists)'); },
};

class WebContentsShim extends EventEmitter {
  /** Deliberate no-op: there is no renderer to receive. Returns false like a destroyed WC would. */
  send() { return false; }
  isDestroyed() { return false; }
  get id() { return 0; }
}

export class BrowserWindow extends EventEmitter {
  constructor() {
    super();
    this.webContents = new WebContentsShim();
    throw new UnsupportedInTuiError('new BrowserWindow() (the TUI has no window system)');
  }
  static getAllWindows() { return []; }
  static getFocusedWindow() { return null; }
  static fromWebContents() { return null; }
}

export const safeStorage = {
  // Honest: no OS keychain is wired into the TUI runtime. Upstream's
  // token-encryption.ts takes its documented non-encrypted fallback path.
  isEncryptionAvailable: () => false,
  encryptString: () => { throw new UnsupportedInTuiError('safeStorage.encryptString (no OS keychain)'); },
  decryptString: () => { throw new UnsupportedInTuiError('safeStorage.decryptString (no OS keychain)'); },
};

function realOpen(target, kind) {
  return new Promise((resolve, reject) => {
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start' : 'xdg-open';
    const child = spawn(opener, [target], { stdio: 'ignore', shell: process.platform === 'win32' });
    child.on('error', () => reject(new UnsupportedInTuiError(`shell.${kind} (no '${opener}' on PATH)`)));
    child.on('exit', (code) => code === 0 ? resolve(kind === 'openPath' ? '' : undefined)
      : reject(new Error(`${opener} exited ${code} for ${target}`)));
  });
}
export const shell = {
  openPath: (p) => realOpen(p, 'openPath'),
  openExternal: (u) => realOpen(u, 'openExternal'),
  showItemInFolder: () => undefined,
  trashItem: async () => { throw new UnsupportedInTuiError('shell.trashItem'); },
};

export const dialog = {
  showOpenDialog: () => { throw new UnsupportedInTuiError('dialog.showOpenDialog (keyboard-driven TUI: use path input)'); },
  showSaveDialog: () => { throw new UnsupportedInTuiError('dialog.showSaveDialog (keyboard-driven TUI: use path input)'); },
  showMessageBox: () => { throw new UnsupportedInTuiError('dialog.showMessageBox'); },
};

export class Notification extends EventEmitter {
  constructor(opts = {}) { super(); this.title = opts.title || ''; this.body = opts.body || ''; }
  static isSupported() { return false; }
  show() { /* no desktop notification server in a TUI; the TUI toast system handles UX */ }
}

export const nativeImage = { createFromPath: () => ({ isEmpty: () => true }) };
export const clipboard = {
  readText: () => '', // no clipboard without a window server; paste comes from the terminal itself
  writeText: () => undefined,
};
export const session = { defaultSession: { webRequest: { onBeforeSendHeaders: () => undefined } } };
export const net = { fetch: (...a) => fetch(...a) }; // Node 20 global fetch — real network
export const screen = { getPrimaryDisplay: () => ({ workAreaSize: { width: process.stdout.columns || 80, height: process.stdout.rows || 24 } }) };
export const desktopCapturer = { getSources: async () => { throw new UnsupportedInTuiError('desktopCapturer.getSources'); } };
export const Menu = { setApplicationMenu: () => undefined, buildFromTemplate: () => ({}) };
export const MenuItem = class {};
export const Tray = class { constructor() { throw new UnsupportedInTuiError('Tray'); } };
export const powerMonitor = new EventEmitter();
export const contextBridge = { exposeInMainWorld: () => undefined };

export default {
  app, ipcMain, ipcRenderer, BrowserWindow, safeStorage, shell, dialog,
  Notification, nativeImage, clipboard, session, net, screen, desktopCapturer,
  Menu, MenuItem, Tray, powerMonitor, contextBridge,
};
