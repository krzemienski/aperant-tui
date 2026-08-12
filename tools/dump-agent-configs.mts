/**
 * Dump vendored AGENT_CONFIGS entries as JSON — used by gates to byte-match
 * what the INSPECT view renders against the actual vendored registry.
 * Usage: node --import tsx tools/dump-agent-configs.mts [type ...]
 */
import { AGENT_CONFIGS } from '../apps/desktop/src/main/ai/config/agent-configs';

const types = process.argv.slice(2);
const out: Record<string, unknown> = {};
for (const t of types.length ? types : Object.keys(AGENT_CONFIGS)) {
  out[t] = (AGENT_CONFIGS as Record<string, unknown>)[t] ?? null;
}
console.log(JSON.stringify(out));
