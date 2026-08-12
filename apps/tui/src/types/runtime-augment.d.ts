/** Runtime globals the Electron shell patches and our shim reproduces. */
declare global {
  namespace NodeJS {
    interface Process {
      /** Electron sets this; the TUI shim sets it to the vendored app path. */
      resourcesPath: string;
    }
  }
  /** Minimal Electron global namespace for preload files that only typecheck in the TUI. */
  namespace Electron {
    type IpcRendererEvent = { sender: unknown; ports: unknown[]; [k: string]: unknown };
    type IpcMainInvokeEvent = { sender: unknown; [k: string]: unknown };
    type Event = { preventDefault(): void; [k: string]: unknown };
    type BrowserWindowConstructorOptions = Record<string, unknown>;
    type OpenDialogOptions = Record<string, unknown>;
    type MessageBoxOptions = Record<string, unknown>;
  }
  /** src/main/sentry.ts references these ambient Sentry types. */
  type SentryBreadcrumb = { message?: string; level?: string; category?: string; data?: Record<string, unknown> };
  type SentryCaptureContext = { level?: string; contexts?: Record<string, unknown>; tags?: Record<string, string> };
}
export {};
