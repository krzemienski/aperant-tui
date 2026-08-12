/**
 * REAL protocol proof for @aperant/moonshot-provider.
 *
 * No mocks: each test spins a real node:http server on 127.0.0.1 implementing
 * the OpenAI chat-completions wire protocol (JSON + SSE) and drives the
 * provider through the real AI SDK (generateText / streamText). The server
 * records exactly what arrived (auth header, agent-gw headers, URL, body) so
 * the tests assert the actual wire behavior, and failure cases assert that
 * bad credentials / malformed payloads surface as clear errors.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { generateText, streamText, APICallError } from 'ai';
import { createMoonshot, normalizeMoonshotBaseURL, MOONSHOT_DEFAULT_BASE_URL } from '@aperant/moonshot-provider';

interface SeenRequest {
  method: string;
  url: string;
  authorization?: string;
  kimiChatId?: string;
  body: { model?: string; stream?: boolean; messages?: Array<{ role: string }> };
}

let server: http.Server;
let baseURL: string;
let lastSeen: SeenRequest | null = null;
let behavior: 'ok' | 'reject-401' | 'garbage' = 'ok';

const CHAT_REPLY = {
  id: 'chatcmpl-test-1',
  object: 'chat.completion',
  created: 1755000000,
  model: 'kimi-k2-0905-preview',
  choices: [
    { index: 0, message: { role: 'assistant', content: 'PONG' }, finish_reason: 'stop' },
  ],
  usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 },
};

function sseChunks(text: string): string {
  const frame = (delta: Record<string, unknown>, finish: string | null) =>
    `data: ${JSON.stringify({
      id: 'chatcmpl-test-sse', object: 'chat.completion.chunk', created: 1755000000,
      model: 'kimi-k2-0905-preview',
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  return frame({ role: 'assistant', content: text }, null) + frame({}, 'stop') + 'data: [DONE]\n\n';
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body: SeenRequest['body'] = {};
      try { body = JSON.parse(raw); } catch { /* recorded as {} */ }
      lastSeen = {
        method: req.method ?? '',
        url: req.url ?? '',
        authorization: req.headers.authorization,
        kimiChatId: req.headers['x-kimi-chat-id'] as string | undefined,
        body,
      };
      if (behavior === 'reject-401') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid Authentication', type: 'invalid_authentication' } }));
        return;
      }
      if (behavior === 'garbage') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('<html>not json</html>');
        return;
      }
      if (body.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end(sseChunks('PONG'));
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(CHAT_REPLY));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe('normalizeMoonshotBaseURL', () => {
  it('defaults to the Moonshot platform URL', () => {
    expect(normalizeMoonshotBaseURL('')).toBe(MOONSHOT_DEFAULT_BASE_URL);
    expect(normalizeMoonshotBaseURL(undefined)).toBe(MOONSHOT_DEFAULT_BASE_URL);
  });
  it('appends /v1 to agent-gw service roots and strips trailing slashes', () => {
    expect(normalizeMoonshotBaseURL('https://agent-gw.kimi.com/coding')).toBe('https://agent-gw.kimi.com/coding/v1');
    expect(normalizeMoonshotBaseURL('https://agent-gw.kimi.com/coding/')).toBe('https://agent-gw.kimi.com/coding/v1');
    expect(normalizeMoonshotBaseURL('https://api.moonshot.ai/v1/')).toBe('https://api.moonshot.ai/v1');
  });
});

describe('createMoonshot — real HTTP round-trips', () => {
  it('generateText sends real auth + agent-gw headers and parses the reply', async () => {
    behavior = 'ok';
    const moonshot = createMoonshot({ apiKey: 'sk-test-real-key', baseURL, kimiChatId: 'chat-abc-123' });
    const result = await generateText({
      model: moonshot('kimi-k2-0905-preview'),
      messages: [{ role: 'user', content: 'ping' }],
    });
    expect(result.text).toBe('PONG');
    expect(lastSeen?.method).toBe('POST');
    expect(lastSeen?.url).toBe('/v1/chat/completions'); // bare host baseURL is normalized to /v1
    expect(lastSeen?.authorization).toBe('Bearer sk-test-real-key');
    expect(lastSeen?.kimiChatId).toBe('chat-abc-123');
    expect(lastSeen?.body.model).toBe('kimi-k2-0905-preview');
    expect(lastSeen?.body.messages?.[0]?.role).toBe('user');
  });

  it('streamText consumes a real SSE stream', async () => {
    behavior = 'ok';
    const moonshot = createMoonshot({ apiKey: 'sk-test-real-key', baseURL });
    const result = streamText({
      model: moonshot('kimi-k2-0905-preview'),
      messages: [{ role: 'user', content: 'ping' }],
    });
    let text = '';
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') text += part.text;
    }
    expect(text).toBe('PONG');
    expect(lastSeen?.body.stream).toBe(true);
  });

  it('rejected credentials surface a real 401 APICallError', async () => {
    behavior = 'reject-401';
    const moonshot = createMoonshot({ apiKey: 'sk-bad-key', baseURL });
    const err = await generateText({
      model: moonshot('kimi-k2-0905-preview'),
      messages: [{ role: 'user', content: 'ping' }],
      maxRetries: 0,
    }).catch((e: unknown) => e);
    expect(APICallError.isInstance(err)).toBe(true);
    expect((err as InstanceType<typeof APICallError>).statusCode).toBe(401);
  });

  it('malformed upstream payloads fail clearly, not silently', async () => {
    behavior = 'garbage';
    const moonshot = createMoonshot({ apiKey: 'sk-test-real-key', baseURL });
    const err = await generateText({
      model: moonshot('kimi-k2-0905-preview'),
      messages: [{ role: 'user', content: 'ping' }],
      maxRetries: 0,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String((err as Error).message).length).toBeGreaterThan(0);
    behavior = 'ok';
  });
});
