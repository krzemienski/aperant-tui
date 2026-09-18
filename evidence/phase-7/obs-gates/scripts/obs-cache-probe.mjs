// P3.5.7 cache-hit accounting probe: drive real calls through the live
// router at 127.0.0.1:20128 using the SAME @ai-sdk/anthropic factory
// pattern the production code uses (factory.ts:59-72), and inspect the
// raw usage object for non-zero cache-read/cache-creation tokens.
//
// Strategy: send TWO calls with an IDENTICAL long system prompt (prompt
// caching only shows cache-read hits on a SECOND call against a cached
// prefix). Try the `cc/claude-*` routes first since those are Anthropic
// models proxied through this router (prompt caching is an Anthropic
// Messages API feature - cache_control blocks).
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const ROUTER_BASE = 'http://127.0.0.1:20128/v1';
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;

const CANDIDATE_MODELS = [
  'cc/claude-sonnet-5',
  'cc/claude-haiku-4-5-20251001',
  'cc/claude-opus-5',
];

// A long, identical system prompt so a cache write on call 1 could be read
// on call 2 (Anthropic prompt caching requires >=1024 tokens for cache_control
// to actually cache, so pad generously).
const LONG_SYSTEM = 'You are a helpful assistant. '.repeat(400); // ~2800 words, well over 1024 tok

function extractCacheFields(usage) {
  if (!usage) return {};
  return {
    promptTokens: usage.promptTokens ?? usage.inputTokens,
    completionTokens: usage.completionTokens ?? usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? usage.inputTokenDetails?.cacheReadTokens,
    cacheCreationTokens: usage.cacheCreationTokens ?? usage.inputTokenDetails?.cacheWriteTokens,
    rawKeys: Object.keys(usage),
  };
}

async function probeModel(modelId) {
  const provider = createAnthropic({
    apiKey: AUTH_TOKEN,
    baseURL: ROUTER_BASE,
  });
  const model = provider(modelId);

  const results = { modelId, calls: [] };
  try {
    for (let i = 0; i < 2; i++) {
      const t0 = Date.now();
      const res = await generateText({
        model,
        system: LONG_SYSTEM,
        prompt: `Call number ${i + 1}. Reply with just the number.`,
        providerOptions: {
          anthropic: {
            cacheControl: { type: 'ephemeral' },
          },
        },
      });
      const durationMs = Date.now() - t0;
      results.calls.push({
        callIndex: i + 1,
        durationMs,
        text: (res.text || '').slice(0, 60),
        usage: extractCacheFields(res.usage),
        rawUsageJSON: JSON.stringify(res.usage),
        rawProviderMetadata: res.providerMetadata ? JSON.stringify(res.providerMetadata) : null,
      });
    }
    results.ok = true;
  } catch (err) {
    results.ok = false;
    results.error = err instanceof Error ? err.message : String(err);
  }
  return results;
}

const allResults = [];
for (const m of CANDIDATE_MODELS) {
  console.error(`probing ${m}...`);
  const r = await probeModel(m);
  allResults.push(r);
}

console.log(JSON.stringify(allResults, null, 2));
