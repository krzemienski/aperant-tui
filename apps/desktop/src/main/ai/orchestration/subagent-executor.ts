/**
 * SubagentExecutor
 * ================
 *
 * Implements the SubagentExecutor interface from spawn-subagent.ts.
 * Runs nested streamText() sessions for specialist subagents.
 *
 * Key design decisions:
 * - [APERANT-PATCH subagent-executor-stream] (2026-09-18): uses `streamText()`
 *   + `fullStream` consumption instead of upstream's `generateText()`. See
 *   `SubagentExecutorImpl.spawn()` below for the full mechanism and evidence.
 *   This is the same F-16 defect class already fixed once in this codebase
 *   (`merge-resolver.ts`, `merge-resolver-stream`, 2026-09-17): the
 *   operator's Anthropic-compatible router always frames HTTP responses as
 *   SSE — `Content-Type: text/event-stream`, body terminated by the literal
 *   14-byte `data: [DONE]\n\n` — even for requests that never set
 *   `stream: true`. `generateText()`'s non-streaming `doGenerate()` requires
 *   the ENTIRE body to parse as one JSON document
 *   (`@ai-sdk/provider-utils/src/response-handler.ts:createJsonResponseHandler`
 *   → `safeParseJSON`) and rejects the whole response over those trailing
 *   bytes with `APICallError({ message: 'Invalid JSON response' })`.
 *   `doStream()`'s SSE parser expects and discards that terminator
 *   normally. Confirmed live: every `SpawnSubagent` call in
 *   `evidence/phase-7/subagent-proof/` failed identically with this exact
 *   message (4/4 attempts, both `complexity_assessor` and `spec_gatherer`)
 *   before this fix. Additive to the vendored contract: `SubagentExecutor`,
 *   `SubagentSpawnParams`, `SubagentResult` (all from `spawn-subagent.ts`)
 *   and `SubagentExecutorConfig` are unchanged; only the internal SDK call
 *   primitive and result-extraction mechanism differ. Structured output
 *   (`Output.object({ schema })`) is preserved exactly: this exact AI SDK
 *   build (`ai@^7.0.62`, confirmed by reading `node_modules/ai/dist/index.d.ts`)
 *   exposes `StreamTextResult.output: PromiseLike<InferCompleteOutput<OUTPUT>>`
 *   and `StreamTextResult.steps: PromiseLike<Array<StepResult>>` — the same
 *   `output`-config shape and the same parsed-object contract `generateText()`
 *   uses, just promise-wrapped because the stream must finish first. No
 *   behavior degradation: subagents using `expectStructuredOutput` still get
 *   a schema-parsed `structuredOutput` object, not raw text.
 * - Subagents get their own tool set from AGENT_CONFIGS (excluding SpawnSubagent).
 * - Inherits allowedWritePaths from parent context for write containment.
 * - Step budget is capped at SUBAGENT_MAX_STEPS (default 100).
 */

import { streamText, Output, stepCountIs } from 'ai';
import type { LanguageModel, Tool as AITool } from 'ai';
import type { ZodSchema } from 'zod';

import type { SubagentExecutor, SubagentSpawnParams, SubagentResult } from '../tools/builtin/spawn-subagent';
import type { ToolContext } from '../tools/types';
import type { ToolRegistry } from '../tools/registry';
import type { AgentType } from '../config/agent-configs';
import { getAgentConfig } from '../config/agent-configs';
import { ComplexityAssessmentOutputSchema } from '../schema/output/complexity-assessment.output';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of tool-use steps for a subagent */
const SUBAGENT_MAX_STEPS = 100;

// ---------------------------------------------------------------------------
// Agent type resolution helpers
// ---------------------------------------------------------------------------

/**
 * Map subagent type strings to the AgentType union.
 * Some subagent types map directly, others need translation.
 */
function resolveAgentType(subagentType: string): AgentType {
  const directMap: Record<string, AgentType> = {
    complexity_assessor: 'spec_gatherer', // Uses spec_gatherer tools + complexity assessor prompt
    spec_discovery: 'spec_discovery',
    spec_gatherer: 'spec_gatherer',
    spec_researcher: 'spec_researcher',
    spec_writer: 'spec_writer',
    spec_critic: 'spec_critic',
    spec_validation: 'spec_validation',
    planner: 'planner',
    coder: 'coder',
    qa_reviewer: 'qa_reviewer',
    qa_fixer: 'qa_fixer',
  };
  return directMap[subagentType] ?? 'spec_gatherer';
}

/**
 * Map subagent type to the prompt file name.
 */
function resolvePromptName(subagentType: string): string {
  const promptMap: Record<string, string> = {
    complexity_assessor: 'complexity_assessor',
    spec_discovery: 'spec_gatherer',
    spec_gatherer: 'spec_gatherer',
    spec_researcher: 'spec_researcher',
    spec_writer: 'spec_writer',
    spec_critic: 'spec_critic',
    spec_validation: 'spec_writer',
    planner: 'planner',
    coder: 'coder',
    qa_reviewer: 'qa_reviewer',
    qa_fixer: 'qa_fixer',
  };
  return promptMap[subagentType] ?? 'spec_writer';
}

/** Agent types that use Output.object() for structured output */
const STRUCTURED_OUTPUT_AGENTS: Partial<Record<string, ZodSchema>> = {
  complexity_assessor: ComplexityAssessmentOutputSchema,
};

// ---------------------------------------------------------------------------
// SubagentExecutorConfig
// ---------------------------------------------------------------------------

export interface SubagentExecutorConfig {
  /** Language model for subagent sessions */
  model: LanguageModel;
  /** Tool registry containing all builtin tools */
  registry: ToolRegistry;
  /** Base tool context (cwd, projectDir, specDir, securityProfile) */
  baseToolContext: ToolContext;
  /** Function to load and assemble a system prompt for a given prompt name */
  loadPrompt: (promptName: string) => Promise<string>;
  /** Abort signal from the parent orchestrator */
  abortSignal?: AbortSignal;
  /** Optional callback for subagent stream events.
   * [APERANT-PATCH agentic-orchestration-optin] (2026-09-17): `subagentId`
   * added as a third param so callers (worker.ts) can emit a stable,
   * per-spawn identity for graph-node construction downstream (spec
   * P3.5.11). Additive: existing 2-arg callback shapes still satisfy this
   * type as long as they ignore the extra arg — no existing caller reads
   * a 3rd param, so nothing breaks; the only real caller (worker.ts) is
   * updated in this same patch. */
  onSubagentEvent?: (agentType: string, event: string, subagentId: string) => void;
}

// ---------------------------------------------------------------------------
// SubagentExecutorImpl
// ---------------------------------------------------------------------------

/**
 * SubagentExecutorImpl — runs nested streamText() sessions for specialist subagents.
 */
export class SubagentExecutorImpl implements SubagentExecutor {
  private readonly config: SubagentExecutorConfig;

  constructor(config: SubagentExecutorConfig) {
    this.config = config;
  }

  async spawn(params: SubagentSpawnParams): Promise<SubagentResult> {
    const startTime = Date.now();
    const agentType = resolveAgentType(params.agentType);
    const promptName = resolvePromptName(params.agentType);
    // [APERANT-PATCH agentic-orchestration-optin] (2026-09-17): stable id
    // for this spawn, distinct across concurrent/sequential spawns of the
    // same agentType (startTime has ms resolution; a Math.random suffix
    // avoids collision on same-tick spawns from parallel tool calls).
    const subagentId = `${params.agentType}-${startTime}-${Math.random().toString(36).slice(2, 8)}`;

    this.config.onSubagentEvent?.(params.agentType, 'spawning', subagentId);

    try {
      // 1. Load system prompt for the subagent
      const systemPrompt = await this.config.loadPrompt(promptName);

      // 2. Build tool set — exclude SpawnSubagent to prevent recursion
      const subagentToolContext: ToolContext = {
        ...this.config.baseToolContext,
        abortSignal: this.config.abortSignal,
      };

      const tools: Record<string, AITool> = {};
      const agentConfig = getAgentConfig(agentType);
      for (const toolName of agentConfig.tools) {
        if (toolName === 'SpawnSubagent') continue; // No recursion
        const definedTool = this.config.registry.getTool(toolName);
        if (definedTool) {
          tools[toolName] = definedTool.bind(subagentToolContext);
        }
      }

      // 3. Build the user message with task + context
      let userMessage = `Your task: ${params.task}`;
      if (params.context) {
        userMessage += `\n\nContext:\n${params.context}`;
      }

      // 4. Determine if we should use structured output
      const outputSchema = params.expectStructuredOutput
        ? STRUCTURED_OUTPUT_AGENTS[params.agentType]
        : undefined;

      // 5. Run streamText() with the subagent configuration.
      // [APERANT-PATCH subagent-executor-stream] (2026-09-18): streamText(),
      // not generateText() — see the file header for the full F-16-class
      // evidence. `output`/`stopWhen`/`tools`/`abortSignal` are the exact
      // same config generateText() took; only the call primitive and
      // result-extraction differ.
      // Branched (not conditionally spread) into two static call shapes so
      // `streamText()`'s overloaded, generic `OUTPUT` type parameter
      // resolves correctly without an `any`-typed options object — each
      // branch's literal has a shape TypeScript can infer directly.
      const messages = [{ role: 'user' as const, content: userMessage }];
      const result = outputSchema
        ? streamText({
            model: this.config.model,
            system: systemPrompt,
            messages,
            tools,
            stopWhen: stepCountIs(SUBAGENT_MAX_STEPS),
            abortSignal: this.config.abortSignal,
            output: Output.object({ schema: outputSchema }),
          })
        : streamText({
            model: this.config.model,
            system: systemPrompt,
            messages,
            tools,
            stopWhen: stepCountIs(SUBAGENT_MAX_STEPS),
            abortSignal: this.config.abortSignal,
          });

      // 6. Consume the stream fully before reading any result accessor.
      // Every `StreamTextResult` accessor below (`.text`, `.steps`,
      // `.output`) is itself a `PromiseLike` that internally awaits stream
      // completion, but we drive `fullStream` explicitly (same pattern as
      // `merge-resolver.ts`) so a transport-level `error` part — the exact
      // failure mode this migration fixes — is caught HERE, before it can
      // surface as a rejected promise from `.output`/`.steps` and be
      // mistaken for a structured-output-schema failure.
      let accumulatedText = '';
      let streamError: string | undefined;
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          accumulatedText += part.text;
        } else if (part.type === 'error') {
          streamError = part.error instanceof Error ? part.error.message : String(part.error);
        }
      }

      if (streamError) {
        // Event ordering: the stream itself failed — this is the 'failed'
        // branch, fired only now that the stream has genuinely finished
        // (not immediately after the streamText() call returns, which
        // happens synchronously before any network I/O occurs). Getting
        // this wrong would let the graph render 'completed' for a subagent
        // whose stream actually errored.
        this.config.onSubagentEvent?.(params.agentType, 'failed', subagentId);
        return {
          error: streamError,
          stepsExecuted: 0,
          durationMs: Date.now() - startTime,
        };
      }

      // 7. Extract results. `fullStream` has fully drained above, so these
      // PromiseLike accessors resolve immediately from already-populated
      // internal state — no additional network round-trip.
      let structuredOutput: Record<string, unknown> | undefined;
      if (outputSchema && 'output' in result) {
        try {
          const parsedOutput: unknown = await result.output;
          if (parsedOutput != null) structuredOutput = parsedOutput as Record<string, unknown>;
        } catch (outputError) {
          // Structured output was requested but the model's final text
          // didn't parse against the schema (e.g. NoOutputGeneratedError).
          // This is a genuine subagent failure, not a transport error —
          // reported distinctly so it isn't conflated with the SSE/JSON
          // transport defect this migration fixes.
          this.config.onSubagentEvent?.(params.agentType, 'failed', subagentId);
          const message = outputError instanceof Error ? outputError.message : String(outputError);
          return {
            error: `Structured output parse failed: ${message}`,
            stepsExecuted: 0,
            durationMs: Date.now() - startTime,
          };
        }
      }

      const steps = await result.steps;

      this.config.onSubagentEvent?.(params.agentType, 'completed', subagentId);

      return {
        text: accumulatedText || undefined,
        structuredOutput,
        stepsExecuted: steps?.length ?? 1,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.config.onSubagentEvent?.(params.agentType, 'failed', subagentId);
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: message,
        stepsExecuted: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
