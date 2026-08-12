import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, '../desktop/src');

export default defineConfig({
  resolve: {
    alias: {
      '@main': path.join(desktop, 'main'),
      '@shared': path.join(desktop, 'shared'),
      '@tui': here,
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
