/**
 * @aperant/moonshot-provider
 *
 * Moonshot AI (Kimi) provider for the Vercel AI SDK.
 *
 * Moonshot's public API (https://api.moonshot.ai/v1) and Kimi's agent-gw
 * deployments both speak the OpenAI chat-completions wire protocol, so this
 * package builds on @ai-sdk/openai-compatible and adds:
 *
 *  - correct Moonshot defaults (base URL, provider name 'moonshot')
 *  - agent-gw header support: X-Kimi-Chat-Id and X-Kimi-Skill
 *  - agent-gw base-URL normalization ('…/coding' → '…/coding/v1')
 *  - known-model metadata for UI surfaces
 *
 * Auth failures, rate limits and malformed responses are surfaced as AI SDK
 * APICallError instances with the upstream status code and body — callers get
 * the real upstream error, never a synthesized one.
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/** Moonshot AI public platform endpoint (OpenAI-compatible). */
export const MOONSHOT_DEFAULT_BASE_URL = 'https://api.moonshot.ai/v1';

/** Moonshot AI China region endpoint. */
export const MOONSHOT_CN_BASE_URL = 'https://api.moonshot.cn/v1';

/**
 * Known Moonshot/Kimi model metadata (id → context window tokens).
 * Informational only; the provider accepts any model id the endpoint serves.
 */
export const MOONSHOT_MODELS = Object.freeze({
  'kimi-k2-0905-preview': { contextWindow: 262144 },
  'kimi-k2-turbo-preview': { contextWindow: 262144 },
  'kimi-latest': { contextWindow: 131072 },
  'moonshot-v1-8k': { contextWindow: 8192 },
  'moonshot-v1-32k': { contextWindow: 32768 },
  'moonshot-v1-128k': { contextWindow: 131072 },
});

/**
 * Normalize a base URL for the chat-completions endpoint.
 * Accepts a full versioned URL ('https://api.moonshot.ai/v1') or an agent-gw
 * service root ('https://host/coding'); the latter gets '/v1' appended.
 */
export function normalizeMoonshotBaseURL(url) {
  let u = String(url || '').replace(/\/+$/, '');
  if (!u) return MOONSHOT_DEFAULT_BASE_URL;
  if (!/\/v\d+$/.test(u)) u += '/v1';
  return u;
}

/**
 * Create a Moonshot (Kimi) provider instance.
 *
 * @param {object}  [options]
 * @param {string}  [options.apiKey]      Moonshot platform key ('sk-…') or an
 *                                        agent-gw key ('sk-kimi-…').
 * @param {string}  [options.baseURL]     Platform or agent-gw base URL.
 *                                        Defaults to https://api.moonshot.ai/v1.
 * @param {Record<string,string>} [options.headers]  Extra request headers.
 * @param {string}  [options.kimiChatId]  agent-gw chat scope — sent as
 *                                        X-Kimi-Chat-Id on every request.
 * @param {string}  [options.kimiSkill]   agent-gw skill tag — sent as X-Kimi-Skill.
 * @param {string}  [options.name]        Provider name (default 'moonshot').
 * @param {typeof fetch} [options.fetch]  Custom fetch implementation.
 * @returns an AI SDK provider (callable, ProviderV3/V4-compatible) whose
 *          language models speak chat completions at {baseURL}/chat/completions.
 */
export function createMoonshot(options = {}) {
  const {
    apiKey,
    baseURL,
    headers,
    kimiChatId,
    kimiSkill,
    name = 'moonshot',
    fetch: customFetch,
  } = options;

  const mergedHeaders = { ...(headers || {}) };
  if (kimiChatId && mergedHeaders['X-Kimi-Chat-Id'] === undefined) {
    mergedHeaders['X-Kimi-Chat-Id'] = kimiChatId;
  }
  if (kimiSkill && mergedHeaders['X-Kimi-Skill'] === undefined) {
    mergedHeaders['X-Kimi-Skill'] = kimiSkill;
  }

  return createOpenAICompatible({
    name,
    apiKey,
    baseURL: normalizeMoonshotBaseURL(baseURL),
    headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
    fetch: customFetch,
  });
}
