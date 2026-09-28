/**
 * sdk-schema — the validated boundary between the Claude Agent SDK message
 * stream and Vigil's RunEvent vocabulary.
 *
 * Every schema is a zod v4 LOOSE object: the SDK declares large tails of fields
 * Vigil never reads, and future SDK versions will add more. Unknown extra fields
 * must pass through silently; only a missing/retyped field Vigil actually needs
 * is drift worth reporting.
 *
 * Two layers per message so a malformed message degrades instead of vanishing:
 *   - ENVELOPE — the fields Vigil must have to act at all (parse failure => skip).
 *   - DETAIL   — the fields Vigil reports but can survive without (parse failure
 *                => diagnose and continue with whatever is available).
 *
 * Field-by-field provenance (SDK 0.3.261 typings, and why each field is required
 * vs optional) is recorded in SDK_SHAPES.md. This module imports nothing from
 * session.ts — the dependency runs one way only.
 */
import { z } from "zod";

// ---- diagnostics vocabulary ----

/** One field-level reason a message failed its schema. `path` is dotted/bracketed, e.g. `message.content[0].type`. */
export interface SchemaIssue {
  path: string;
  code: string;
  message: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: SchemaIssue[] };

/** Render a zod issue path as a field path: `a.b[1].c`. An empty path (the whole value) renders as `(root)`. */
export function formatPath(path: PropertyKey[]): string {
  let out = "";
  for (const seg of path) {
    const s = String(seg);
    if (typeof seg === "number" || /^\d+$/.test(s)) out += `[${s}]`;
    else out += out === "" ? s : `.${s}`;
  }
  return out === "" ? "(root)" : out;
}

/** safeParse wrapper that never throws and always yields at least one issue on failure. */
export function parseWith<T>(schema: z.ZodType<T>, schemaName: string, input: unknown): ParseResult<T> {
  let res: z.ZodSafeParseResult<T>;
  try {
    res = schema.safeParse(input);
  } catch (err) {
    // A schema must never take a run down, however hostile the input.
    return { ok: false, issues: [{ path: "(root)", code: "parse_threw", message: `${schemaName} threw: ${String((err as Error)?.message ?? err)}` }] };
  }
  if (res.success) return { ok: true, value: res.data };
  const issues: SchemaIssue[] = res.error.issues.map((i) => ({ path: formatPath(i.path as PropertyKey[]), code: String(i.code ?? "invalid"), message: i.message }));
  return { ok: false, issues: issues.length ? issues : [{ path: "(root)", code: "invalid_type", message: `${schemaName} rejected the input` }] };
}

/** Re-root issue paths under a parent path, e.g. prefixIssues("message.content[2]", [{path:"type"}]) => `message.content[2].type`. */
export function prefixIssues(prefix: string, issues: SchemaIssue[]): SchemaIssue[] {
  return issues.map((i) => ({ ...i, path: i.path === "(root)" ? prefix : `${prefix}.${i.path}` }));
}

/** A truncated, always-safe rendering of an offending message for a diagnostic event. */
export function sampleOf(input: unknown, max = 300): string {
  let s: string;
  try {
    s = JSON.stringify(input, (_k, v: unknown) => (typeof v === "bigint" ? String(v) : v)) ?? String(input);
  } catch {
    try {
      s = String(input);
    } catch {
      s = "(unserialisable)";
    }
  }
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ---- the outermost gate ----

/** Every incoming message is parsed through this first; `type` drives the dispatch. */
export const SdkEnvelopeSchema = z.looseObject({ type: z.string() });
export type SdkEnvelope = z.infer<typeof SdkEnvelopeSchema>;

// ---- system ----

/** `system`/`init`. session_id/model/cwd are SDK-required; tools is too, but Vigil already defaults it. */
export const SystemInitSchema = z.looseObject({ session_id: z.string(), model: z.string(), tools: z.array(z.string()).default([]), cwd: z.string() });
export type SystemInit = z.infer<typeof SystemInitSchema>;

/** `system`/`status`|`notification`|`api_retry`|`compact_boundary`. `text` exists only on `notification`, so it must stay optional. */
export const SystemStatusSchema = z.looseObject({ subtype: z.string(), text: z.string().optional() });
export type SystemStatus = z.infer<typeof SystemStatusSchema>;

// ---- stream_event ----

/** `delta` exists only on content_block_delta / message_delta, and `text` only on a text_delta. */
const StreamDeltaSchema = z.looseObject({ type: z.string(), text: z.string().optional() });

export const StreamEventSchema = z.looseObject({
  event: z.looseObject({ type: z.string(), delta: StreamDeltaSchema.optional() }),
  parent_tool_use_id: z.string().nullable().default(null),
});
export type StreamEventMessage = z.infer<typeof StreamEventSchema>;

// ---- assistant ----

/**
 * One BetaContentBlock. `type` is required on all 17 union members; text/id/name/input
 * are per-member, so they are optional here — the 15 block kinds Vigil ignores must
 * parse clean rather than diagnose.
 */
export const AssistantBlockSchema = z.looseObject({ type: z.string(), text: z.string().optional(), id: z.string().optional(), name: z.string().optional(), input: z.unknown().optional() });
export type AssistantBlock = z.infer<typeof AssistantBlockSchema>;

/** Full assistant message — the fast path: if it parses, every block is usable. */
export const AssistantMessageSchema = z.looseObject({
  message: z.looseObject({ content: z.array(AssistantBlockSchema) }),
  parent_tool_use_id: z.string().nullable().default(null),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

/**
 * Degrade path for an assistant message with one bad block: validates that
 * `message.content` is an array (SDK-required) without judging its members, so the
 * caller can parse each block with AssistantBlockSchema and skip only the bad ones.
 */
export const AssistantEnvelopeSchema = z.looseObject({
  message: z.looseObject({ content: z.array(z.unknown()) }),
  parent_tool_use_id: z.string().nullable().default(null),
});
export type AssistantEnvelope = z.infer<typeof AssistantEnvelopeSchema>;

// ---- tool_progress ----

/** `tool_use_id` is required: session.ts slices it, and an absent one would throw out of handle(). */
export const ToolProgressSchema = z.looseObject({ tool_use_id: z.string(), elapsed_time_seconds: z.number().default(0), heartbeat: z.boolean().optional() });
export type ToolProgressMessage = z.infer<typeof ToolProgressSchema>;

// ---- user (tool results) ----

/** Nested tool_result content: only TextBlockParam carries `text`, so both members stay optional. */
const UserResultContentSchema = z.union([z.string(), z.array(z.looseObject({ type: z.string().optional(), text: z.string().optional() }))]);

const UserContentBlockSchema = z.looseObject({ type: z.string(), tool_use_id: z.string().optional(), content: UserResultContentSchema.optional(), is_error: z.boolean().optional() });

/** `message.content` is genuinely `string | Array<ContentBlockParam>` in the SDK. */
export const UserMessageSchema = z.looseObject({ message: z.looseObject({ content: z.union([z.string(), z.array(UserContentBlockSchema)]) }) });
export type UserMessage = z.infer<typeof UserMessageSchema>;

// ---- result ----

/** The minimum Vigil needs to emit a session.result at all. */
export const ResultEnvelopeSchema = z.looseObject({ subtype: z.string(), is_error: z.boolean().optional() });
export type ResultEnvelope = z.infer<typeof ResultEnvelopeSchema>;

const UsageSchema = z.looseObject({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
});

const ModelUsageSchema = z.looseObject({ costUSD: z.number().optional(), inputTokens: z.number().optional(), outputTokens: z.number().optional() });

/**
 * Everything the result reports but the run can survive without. All optional by
 * design: a detail failure must still leave a degraded session.result emittable.
 * An absent total_cost_usd means "unknown" (=> null + a diagnostic), never 0.
 */
export const ResultDetailSchema = z.looseObject({
  total_cost_usd: z.number().optional(),
  duration_ms: z.number().optional(),
  num_turns: z.number().optional(),
  usage: UsageSchema.optional(),
  modelUsage: z.record(z.string(), ModelUsageSchema).optional(),
  errors: z.array(z.string()).optional(),
  result: z.string().optional(),
});
export type ResultDetail = z.infer<typeof ResultDetailSchema>;

// ---- rate_limit_event ----

/**
 * `rate_limit_info.status` is SDK-required, so a missing one is real drift.
 * `unifiedWindows` does NOT exist in 0.3.261 (see SDK_SHAPES.md §8) — it is kept
 * optional so today's (dead) render path still compiles and would light up again
 * if a future SDK reintroduces it, without diagnosing on its absence.
 */
export const RateLimitEventSchema = z.looseObject({
  rate_limit_info: z.looseObject({
    status: z.string(),
    rateLimitType: z.string().optional(),
    utilization: z.number().optional(),
    resetsAt: z.number().optional(),
    unifiedWindows: z.record(z.string(), z.looseObject({ utilization: z.number().optional() })).optional(),
  }),
});
export type RateLimitEvent = z.infer<typeof RateLimitEventSchema>;
