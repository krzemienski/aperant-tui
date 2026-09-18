// Diagnostic: raw fetch to the router's Anthropic-compatible messages
// endpoint to see the actual error body (Service Unavailable was too vague).
const ROUTER_BASE = 'http://127.0.0.1:20128/v1';
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;

const CANDIDATE_MODELS = [
  'cc/claude-haiku-4-5-20251001',
  'glm/glm-4.7',
  'kimi/kimi-k2.5',
  'minimax/MiniMax-M2.1',
];

for (const modelId of CANDIDATE_MODELS) {
  try {
    const res = await fetch(`${ROUTER_BASE}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': AUTH_TOKEN,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 20,
        system: [{ type: 'text', text: 'You are terse. '.repeat(200), cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: 'Say OK.' }],
      }),
    });
    const bodyText = await res.text();
    console.log(JSON.stringify({ modelId, status: res.status, bodySnippet: bodyText.slice(0, 500) }));
  } catch (err) {
    console.log(JSON.stringify({ modelId, error: err instanceof Error ? err.message : String(err) }));
  }
}
