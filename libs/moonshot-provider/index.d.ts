import type { LanguageModelV4, ProviderV3 } from '@ai-sdk/provider';

export declare const MOONSHOT_DEFAULT_BASE_URL: string;
export declare const MOONSHOT_CN_BASE_URL: string;
export declare const MOONSHOT_MODELS: Readonly<Record<string, { contextWindow: number }>>;

export interface MoonshotProviderSettings {
  /** Moonshot platform key ('sk-…') or an agent-gw key ('sk-kimi-…'). */
  apiKey?: string;
  /** Platform or agent-gw base URL. Defaults to https://api.moonshot.ai/v1. */
  baseURL?: string;
  /** Extra request headers sent on every call. */
  headers?: Record<string, string>;
  /** agent-gw chat scope — sent as X-Kimi-Chat-Id. */
  kimiChatId?: string;
  /** agent-gw skill tag — sent as X-Kimi-Skill. */
  kimiSkill?: string;
  /** Provider name used in model ids and errors (default 'moonshot'). */
  name?: string;
  /** Custom fetch implementation. */
  fetch?: typeof fetch;
}

/** Callable provider: moonshot('kimi-k2-0905-preview') → chat language model. */
export interface MoonshotProvider extends ProviderV3 {
  (modelId: string): LanguageModelV4;
  languageModel(modelId: string): LanguageModelV4;
  chatModel(modelId: string): LanguageModelV4;
}

export declare function normalizeMoonshotBaseURL(url?: string): string;
export declare function createMoonshot(options?: MoonshotProviderSettings): MoonshotProvider;
