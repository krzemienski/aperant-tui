#!/usr/bin/env node
/**
 * aperant bin — cwd-independent launcher.
 * Pins TSX_TSCONFIG_PATH to the package's own tsconfig so @main/* and
 * @shared/* resolve no matter which directory the user runs `aperant` from
 * (the whole point of the tool: run it inside YOUR project).
 */
process.env.TSX_TSCONFIG_PATH = new URL('../tsconfig.json', import.meta.url).pathname;
const { tsImport } = await import('tsx/esm/api');
await tsImport('../src/cli.tsx', import.meta.url);
