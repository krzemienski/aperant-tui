// P3.5.7 focused probe: glm/glm-4.7 is the only route that returned a live
// 200 in the sweep (cc/* had a revoked OAuth token; kimi/minimax were
// quota/rate limited). Drive TWO calls with an IDENTICAL long cached system
// prefix (cache_control: ephemeral) to see whether prompt caching on this
// route ever reports non-zero cache_read_input_tokens on the second call.
const ROUTER_BASE = 'http://127.0.0.1:20128/v1';
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;
const MODEL = 'glm/glm-4.7';

const LONG_SYSTEM_TEXT = 'You are a terse assistant that only replies with a single word. '.repeat(150); // ~1900 words > 1024 tok threshold

async function call(i) {
  const t0 = Date.now();
  const res = await fetch(`${ROUTER_BASE}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': AUTH_TOKEN,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 20,
      system: [{ type: 'text', text: LONG_SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Call ${i}. Reply with just the number ${i}.` }],
    }),
  });
  const durationMs = Date.now() - t0;
  const bodyText = await res.text();
  let usage = null;
  try {
    // Router sometimes appends "data: [DONE]" after the JSON body (seen in raw probe)
    const jsonPart = bodyText.split('\ndata: [DONE]')[0];
    usage = JSON.parse(jsonPart).usage;
  } catch { /* leave null, report raw */ }
  return { callIndex: i, status: res.status, durationMs, usage, rawBodySnippet: bodyText.slice(0, 400) };
}

const results = [];
for (let i = 1; i <= 3; i++) {
  results.push(await call(i));
  // small delay between calls; caching windows are short-lived (~5min) so this is well within it
  await new Promise((r) => setTimeout(r, 500));
}

console.log(JSON.stringify({ model: MODEL, results }, null, 2));
