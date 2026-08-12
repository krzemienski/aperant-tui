/** Type surface for the electron shim — the subset src/main uses. */
import { EventEmitter } from 'node:events';

export class UnsupportedInTuiError extends Error { constructor(api: string); }

export interface AppShim extends Pick<EventEmitter, 'on' | 'once' | 'removeListener'> {
  getPath(name: string): string;
  setPath(name: string, p: string): void;
  getAppPath(): string;
  getVersion(): string;
  getName(): string;
  isPackaged: boolean;
  isReady(): boolean;
  whenReady(): Promise<void>;
  quit(code?: number): void;
  exit(code?: number): void;
  setAppUserModelId(id: string): void;
  requestSingleInstanceLock(): boolean;
  disableHardwareAcceleration(): void;
  commandLine: { appendSwitch(name: string, value?: string): void };
  getLocale(): string;
}
export const app: AppShim;

export interface IpcMainShim extends EventEmitter {
  handle(channel: string, handler: (event: unknown, ...args: unknown[]) => unknown): void;
  handleOnce(channel: string, handler: (event: unknown, ...args: unknown[]) => unknown): void;
  removeHandler(channel: string): void;
  invokeHandler(channel: string, event: unknown, ...args: unknown[]): Promise<unknown>;
}
export const ipcMain: IpcMainShim;

export const ipcRenderer: {
  invoke(channel: string, ...args: unknown[]): Promise<never>;
  send(channel: string, ...args: unknown[]): never;
  on(channel: string, listener: (...args: any[]) => void): void;
  once(channel: string, listener: (...args: any[]) => void): void;
  removeListener(channel: string, listener: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
};

export interface WebContentsShim extends EventEmitter {
  send(channel: string, ...args: unknown[]): boolean;
  isDestroyed(): boolean;
  readonly id: number;
}
export class BrowserWindow extends EventEmitter {
  webContents: WebContentsShim;
  isDestroyed(): boolean;
  static getAllWindows(): BrowserWindow[];
  static getFocusedWindow(): BrowserWindow | null;
  static fromWebContents(wc: unknown): BrowserWindow | null;
}

export const safeStorage: {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
};

export const shell: {
  openPath(path: string): Promise<string>;
  openExternal(url: string): Promise<void>;
  showItemInFolder(path: string): void;
  trashItem(path: string): Promise<void>;
};

export const dialog: {
  showOpenDialog(options?: unknown): Promise<never>;
  showSaveDialog(options?: unknown): Promise<never>;
  showMessageBox(options?: unknown): Promise<never>;
};

export class Notification extends EventEmitter {
  constructor(options?: { title?: string; body?: string });
  title: string; body: string;
  static isSupported(): boolean;
  show(): void;
}

export const nativeImage: { createFromPath(p: string): { isEmpty(): boolean } };
export const clipboard: { readText(): string; writeText(t: string): void };
export const session: { defaultSession: { webRequest: { onBeforeSendHeaders(cb: unknown): void } } };
export const net: { fetch: typeof fetch };
export const screen: { getPrimaryDisplay(): { workAreaSize: { width: number; height: number } } };
export const desktopCapturer: { getSources(opts: unknown): Promise<never> };
export const Menu: { setApplicationMenu(m: unknown): void; buildFromTemplate(t: unknown[]): unknown };
export class MenuItem {}
export class Tray { constructor(image: unknown); }
export const powerMonitor: EventEmitter;
export const contextBridge: { exposeInMainWorld(key: string, api: unknown): void };
