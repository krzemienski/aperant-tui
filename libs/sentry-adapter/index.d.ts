export type ErrorEvent = { message?: string; type?: string; exception?: { values?: unknown[] }; [k: string]: unknown };
export type EventHint = { originalException?: unknown; [k: string]: unknown };
export function init(options?: { dsn?: string; [k: string]: unknown }): void;
export function captureException(err: unknown, ctx?: unknown): string;
export function captureMessage(msg: string, level?: string): string;
export function setContext(name: string, ctx: unknown): void;
export function setUser(u: unknown): void;
export function addBreadcrumb(b: unknown): void;
export function isInitialized(): boolean;
export function close(): Promise<boolean>;
export function flush(): Promise<boolean>;
export const Severity: { Fatal: string; Error: string; Warning: string; Info: string; Debug: string };
declare const _default: {
  init: typeof init; captureException: typeof captureException; captureMessage: typeof captureMessage;
  setContext: typeof setContext; setUser: typeof setUser; addBreadcrumb: typeof addBreadcrumb;
  isInitialized: typeof isInitialized; close: typeof close; flush: typeof flush; Severity: typeof Severity;
};
export default _default;
