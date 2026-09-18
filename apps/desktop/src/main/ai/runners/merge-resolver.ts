/**
 * Merge Resolver Runner
 * =====================
 *
 * AI-powered merge conflict resolution using Vercel AI SDK.
 * See apps/desktop/src/main/ai/runners/merge-resolver.ts for the TypeScript implementation.
 *
 * Simple single-turn text generation — takes a system prompt describing
 * the merge context and a user prompt with the conflict, returns the resolution.
 *
 * Uses `createSimpleClient()` with no tools.
 *
 * [APERANT-PATCH merge-resolver-stream] (2026-09-17): uses `streamText()` +
 * `fullStream` consumption instead of upstream's `generateText()`. See
 * `resolveMergeConflict()` below for the full mechanism and evidence —
 * this is additive: the call shape (system/prompt, no tools, no output
 * schema) and the public `MergeResolverResult` contract are unchanged;
 * only how the response is CONSUMED differs.
 */

import { streamText } from 'ai';

import { createSimpleClient } from '../client/factory';
import type { ModelShorthand, ThinkingLevel } from '../config/types';

// =============================================================================
// Types
// =============================================================================

/** Configuration for merge conflict resolution */
export interface MergeResolverConfig {
  /** System prompt describing the merge resolution context */
  systemPrompt: string;
  /** User prompt with the conflict to resolve */
  userPrompt: string;
  /** Model shorthand (defaults to 'haiku') */
  modelShorthand?: ModelShorthand;
  /** Thinking level (defaults to 'low') */
  thinkingLevel?: ThinkingLevel;
}

/** Result of a merge resolution */
export interface MergeResolverResult {
  /** Whether the resolution succeeded */
  success: boolean;
  /** Resolved text (empty string if failed) */
  text: string;
  /** Error message if failed */
  error?: string;
}

/** Factory function type for creating a resolver call function */
export type MergeResolverCallFn = (system: string, user: string) => Promise<string>;

// =============================================================================
// Merge Resolver
// =============================================================================

/**
 * Resolve a merge conflict using AI.
 *
 * @param config - Merge resolver configuration
 * @returns Resolution result with the resolved text
 */
/**
 * F-16: this used to call `generateText()` — the AI SDK's non-streaming
 * `doGenerate()` path, which requires the ENTIRE HTTP response body to be
 * exactly one well-formed JSON document
 * (`@ai-sdk/provider-utils/src/response-handler.ts:createJsonResponseHandler`,
 * `safeParseJSON` → throws `APICallError({ message: 'Invalid JSON response' })`
 * on any parse failure, response-handler.ts:133-143).
 *
 * Reproduced directly against the live router (glm/glm-5,
 * http://127.0.0.1:20128/v1) with a `fetch` wrapper that captured the raw
 * response body before SDK parsing: the router replies with
 * `Content-Type: text/event-stream` and a body that is a single valid,
 * schema-conforming Anthropic Messages JSON object (parses cleanly through
 * byte 543 — `type:"message"`, `content:[thinking,text]`, `stop_reason`,
 * `usage`, exactly matching `anthropicResponseSchema`) followed by 14
 * trailing bytes: the literal SSE stream terminator `data: [DONE]\n\n`.
 * This router ALWAYS frames its output as SSE at the transport layer, even
 * for a request with no `stream` field (the Anthropic wire protocol's
 * non-streaming default — confirmed the SDK's outgoing request body never
 * sets `stream: true`). `doGenerate()`'s `safeParseJSON` treats those 14
 * trailing bytes as invalid JSON and rejects the entire — otherwise
 * perfectly correct — response. `doStream()`'s SSE event parser
 * (`parseJsonEventStream`) expects and discards `data: [DONE]` as a normal
 * stream-end marker, so the identical router/model/prompt succeeds via
 * `streamText()` (confirmed: direct repro, `streamText().fullStream`
 * yielded the correct resolved text with 0 errors against the same
 * router). This matches roadmap/insights/ideation, which all stream
 * already and have never hit this defect.
 *
 * Fix: consume the stream instead of the single-shot response. No
 * router-side workaround, no fragile trailing-byte stripping — this
 * routes through the SDK code path already proven correct against this
 * router. Call shape (system/prompt, no tools, no output schema) and the
 * public `MergeResolverResult` contract are unchanged.
 */
export async function resolveMergeConflict(
  config: MergeResolverConfig,
): Promise<MergeResolverResult> {
  const {
    systemPrompt,
    userPrompt,
    modelShorthand = 'haiku',
    thinkingLevel = 'low',
  } = config;

  try {
    const client = await createSimpleClient({
      systemPrompt,
      modelShorthand,
      thinkingLevel,
    });

    const result = streamText({
      model: client.model,
      system: client.systemPrompt,
      prompt: userPrompt,
    });

    let text = '';
    let streamError: string | undefined;
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        text += part.text;
      } else if (part.type === 'error') {
        streamError = part.error instanceof Error ? part.error.message : String(part.error);
      }
    }

    if (streamError) {
      return { success: false, text: '', error: streamError };
    }

    if (text.trim()) {
      return { success: true, text: text.trim() };
    }

    return { success: false, text: '', error: 'Empty response from AI' };
  } catch (error) {
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a merge resolver call function.
 *
 * Returns a function matching the `(system, user) => string` signature
 * used by the AIResolver class. This mirrors Python's `create_claude_resolver()`.
 *
 * @param modelShorthand - Model to use (defaults to 'haiku')
 * @param thinkingLevel - Thinking level (defaults to 'low')
 * @returns Async function that resolves conflicts
 */
export function createMergeResolverFn(
  modelShorthand: ModelShorthand = 'haiku',
  thinkingLevel: ThinkingLevel = 'low',
): MergeResolverCallFn {
  return async (system: string, user: string): Promise<string> => {
    const result = await resolveMergeConflict({
      systemPrompt: system,
      userPrompt: user,
      modelShorthand,
      thinkingLevel,
    });
    return result.text;
  };
}
