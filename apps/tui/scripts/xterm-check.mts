
import { createRequire } from 'node:module';
const { Terminal } = createRequire(import.meta.url)('@xterm/headless') as any;
const t = new Terminal({ cols: 10, rows: 2, allowProposedApi: true });
t.write('hi', () => { console.log('XTERM_OK row0=' + JSON.stringify(t.buffer.active.getLine(0)!.translateToString(true))); t.dispose(); });
