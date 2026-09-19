#!/usr/bin/env node
/**
 * Render a tmux ANSI capture (`capture-pane -p -e`) to a real PNG plus a paired
 * .html, so terminal colour survives and the text stays selectable/greppable.
 *
 * Why not screenshot the terminal app directly: the pane is the render target
 * and headless capture must not depend on a GUI being present. ANSI -> HTML ->
 * headless Chromium at deviceScaleFactor 2 keeps the exact frame the app drew.
 *
 * Requires `ansi-to-html` (evidence tooling only, not a runtime dependency):
 *   npm i --no-save ansi-to-html
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import Convert from 'ansi-to-html';

const [, , ansiPath, outPng, title = ''] = process.argv;
if (!ansiPath || !outPng) {
  console.error('usage: ansi-to-png.mjs <capture.ansi> <out.png> [title]');
  process.exit(2);
}

const convert = new Convert({
  fg: '#c0caf5',
  bg: '#1a1b26',
  newline: true,
  escapeXML: true,
  colors: {
    0: '#15161e', 1: '#f7768e', 2: '#9ece6a', 3: '#e0af68',
    4: '#7aa2f7', 5: '#bb9af7', 6: '#7dcfff', 7: '#a9b1d6',
    8: '#414868', 9: '#f7768e', 10: '#9ece6a', 11: '#e0af68',
    12: '#7aa2f7', 13: '#bb9af7', 14: '#7dcfff', 15: '#c0caf5',
  },
});

const body = convert.toHtml(readFileSync(ansiPath, 'utf8'));
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; background:#1a1b26; }
  .title { font:600 13px ui-monospace,Menlo,monospace; color:#7dcfff;
           padding:8px 12px; border-bottom:1px solid #414868; }
  pre { margin:0; padding:12px; background:#1a1b26; color:#c0caf5;
        font:13px/1.32 ui-monospace,"JetBrains Mono",Menlo,monospace;
        white-space:pre; display:inline-block; }
</style>${title ? `<div class="title">${title}</div>` : ''}<pre>${body}</pre>`;

const htmlPath = `${outPng}.html`;
writeFileSync(htmlPath, html);

const chrome = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].find((p) => { try { readFileSync(p); return true; } catch { return false; } });

if (!chrome) {
  console.error('no chromium found; wrote HTML only:', htmlPath);
  process.exit(3);
}

execFileSync(chrome, [
  '--headless', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--window-size=1680,1100',
  `--screenshot=${outPng}`,
  // Must be absolute: a relative path yields ERR_INVALID_URL and Chromium
  // screenshots its own error page instead of the frame.
  pathToFileURL(htmlPath).href,
], { stdio: 'ignore' });

// Pair a plain-text sidecar so evidence can be grepped for real content,
// not just eyeballed — the audit step needs the data, not the container.
writeFileSync(`${outPng}.txt`, readFileSync(ansiPath, 'utf8').replace(/\u001b\[[0-9;]*m/g, ''));
console.log(outPng);
