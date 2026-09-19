/**
 * Observability service — the event tap for the agent-coordination views
 * (spec: aperant-agent-observability-spec.md §7.1).
 *
 * Subscribes to what the vendored runtime already emits (no behavior change):
 *   - AgentManager 'execution-progress' — phase/subtask/message (tracker-derived
 *     → provenance 'inferred')
 *   - AgentManager 'task-event' — structured orchestrator events (provenance
 *     'structured')
 *   - AgentManager 'stream-event' — raw StreamEvent relay (tool-call/result,
 *     step-finish, usage-update) via the [APERANT-PATCH observability-tap]
 *   - AgentManager 'log' — free-text lines; ONE of them
 *     ("Starting agent session: type=X, model=Y", worker.ts:394 `postLog`) is
 *     the only place the REAL, provider-resolved model id (e.g. 'glm/glm-5',
 *     as opposed to task_metadata.json's shorthand or absent 'model' field —
 *     ensureAgent()'s 'default' fallback) is ever observable from this
 *     process. Parsed here to fix the contextWindowLimit used for CTX%
 *     display, which otherwise silently used the 200k fallback for every
 *     model that isn't a bare, unprefixed catalog id.
 *   - sentinel files in the spec dir (RATE_LIMIT_PAUSE / AUTH_PAUSE / RESUME /
 *     PAUSE) — polled from disk, exactly where pause-handler.ts reads them
 *   - AGENT_CONFIGS — tool grants / thinking level, imported from the vendored
 *     config (byte-match with the runtime, never re-typed by hand)
 *
 * Performance contract (spec §7.3): 10k-event ring buffer, 16ms snapshot
 * coalescing, wait-state recomputed only on tool-call/tool-result/step-finish/
 * sentinel-poll — never on text-delta.
 */
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AGENT_CONFIGS, type AgentType } from '@main/ai/config/agent-configs';
import { getModelContextWindow } from '@shared/constants/models';

// ---------------------------------------------------------------------------
// Types (mirrors spec §7.1)
// ---------------------------------------------------------------------------

export type WaitState =
  | { kind: 'tool'; toolName: string; argsSummary: string; since: number }
  | { kind: 'mcp'; server: string; tool: string; since: number }
  | { kind: 'concurrency'; slot: number; maxSlots: number; since: number }
  | { kind: 'context'; usagePct: number; willCompact: boolean }
  | { kind: 'ratelimit'; resetAt: string | null; sentinelPath: string; since: number }
  | { kind: 'auth'; sentinelPath: string; since: number };

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  thinkingTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface AgentSnapshot {
  id: string;
  type: AgentType | 'unknown';
  /**
   * F-19 fix: the verbatim agent-type string a SUBAGENT_* task-event
   * reported, independent of whether it resolves to a real AGENT_CONFIGS
   * key. `type` above is the *resolved* key used for tool/MCP grant
   * lookups (AGENT_CONFIGS[type]) and MUST stay a valid AgentType so
   * applyAgentType() keeps working — but that resolution can silently
   * coerce an unrecognized spawn (e.g. `complexity_assessor`, a real
   * SpawnSubagent input per spawn-subagent.ts's schema, but not an
   * AGENT_CONFIGS key) onto an unrelated label (`spec_gatherer`). A
   * reader of the graph must never see that confident wrong label without
   * a way to see the ground truth, so `rawType` carries the exact string
   * the orchestrator actually spawned; display code prefers it over
   * `type`. `null` for any agent never touched by a SUBAGENT_* event
   * (i.e. every pre-P3.5.11 agent, and every top-level task).
   */
  rawType: string | null;
  taskId: string;
  phase: string;
  phaseSource: 'structured' | 'inferred';
  state: 'running' | 'blocked' | 'paused' | 'done' | 'error';
  parentId: string | null;
  depth: number;
  model: string;
  thinkingLevel: string;
  stepsExecuted: number;
  maxSteps: number;
  sessionNumber: number;
  continuationCount: number;
  usage: TokenUsage;
  contextWindowLimit: number;
  tools: readonly string[];
  mcpServers: readonly string[];
  autoClaudeTools: readonly string[];
  waiting: WaitState | null;
  startedAt: number;
  subtaskId?: string;
  qaIteration?: { current: number; max: number };
  lastMessage?: string;
}

export interface TraceEvent {
  seq: number;
  ts: string;
  agentId: string;
  type: string;
  tool?: string;
  durationMs?: number;
  isError?: boolean;
  summary: string;
}

/** Build-pipeline phase → agent mapping (orchestration/build-orchestrator.ts) */
const PHASE_AGENT_MAP: Record<string, AgentType> = {
  planning: 'planner',
  coding: 'coder',
  qa_review: 'qa_reviewer',
  qa_fixing: 'qa_fixer',
};

const PHASE_WEIGHTS: Record<string, [number, number]> = {
  planning: [0, 20],
  coding: [20, 80],
  qa_review: [80, 95],
  qa_fixing: [80, 95],
  complete: [100, 100],
};

const CONTEXT_WARN_PCT = 70;
const CONTEXT_COMPACT_PCT = 90;
const RING_CAPACITY = 10_000;
const SENTINEL_POLL_MS = 5_000;

// ---------------------------------------------------------------------------
// Ring buffer (spec §7.3) — fixed capacity, O(1) append
// ---------------------------------------------------------------------------

class Ring<T> {
  private buf: Array<T | undefined> = new Array(RING_CAPACITY);
  private head = 0;
  private count = 0;
  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % RING_CAPACITY;
    if (this.count < RING_CAPACITY) this.count++;
  }
  toArray(): T[] {
    const out: T[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      out[i] = this.buf[(this.head - this.count + i + RING_CAPACITY) % RING_CAPACITY]!;
    }
    return out;
  }
  get length(): number { return this.count; }
}

// ---------------------------------------------------------------------------
// Internal per-agent mutable state
// ---------------------------------------------------------------------------

interface AgentStateMut {
  snap: AgentSnapshot;
  openToolCalls: Map<string, { toolName: string; argsSummary: string; since: number }>;
  /** Last phase set by a structured (authoritative) event. When the
   *  tracker-derived phase agrees, provenance stays 'structured' — the
   *  authoritative source confirmed it (spec §2.3 trust levels). */
  lastStructuredPhase?: string;
}

interface ObservabilityDeps {
  /** Resolve the spec dir candidates for sentinel polling (main + worktrees). */
  specDirCandidates: (taskId: string) => string[];
  /** Task metadata lookup (model/provider from task_metadata.json). */
  taskMeta: (taskId: string) => { model?: string; provider?: string } | null;
}

export class ObservabilityService extends EventEmitter {
  private agents = new Map<string, AgentStateMut>();
  private trace = new Ring<TraceEvent>();
  private seq = 0;
  private deps: ObservabilityDeps | null = null;
  private sentinelTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;
  private attached = false;

  configure(deps: ObservabilityDeps): void {
    this.deps = deps;
  }

  /** Attach to a live AgentManager (called by agent-start-service). Idempotent. */
  attachToManager(am: {
    on: (event: string, cb: (...args: never[]) => void) => unknown;
  }): void {
    if (this.attached) return;
    this.attached = true;
    const on = (ev: string, cb: (...args: any[]) => void) => am.on(ev, cb as never);

    on('execution-progress', (taskId, progress: {
      phase?: string; currentSubtask?: string; message?: string;
    }) => this.onProgress(taskId, progress));
    on('task-event', (taskId, event: Record<string, unknown>) => this.onTaskEvent(taskId, event));
    on('stream-event', (taskId, event: Record<string, unknown>) => this.onStreamEvent(taskId, event));
    on('log', (taskId, message: string) => this.onLog(taskId, String(message)));
    on('error', (taskId, error: string) => this.onError(taskId, String(error)));
    on('exit', (taskId, code: number | null) => this.onExit(taskId, code));

    // Roadmap generation is a real agent run, but it emits its own event names
    // and none of the six above — so every agents sub-view rendered "no agent
    // has started" while a roadmap was actively generating. These map the
    // roadmap lifecycle onto the same agent record the task path uses.
    on('roadmap-progress', (projectId, progress: { phase?: string; progress?: number; message?: string }) =>
      this.onProgress(String(projectId), {
        phase: progress?.phase ?? 'roadmap',
        message: progress?.message,
      }));
    on('roadmap-log', (projectId, message: string) => this.onLog(String(projectId), String(message)));
    on('roadmap-error', (projectId, error: string) => this.onError(String(projectId), String(error)));
    on('roadmap-complete', (projectId) => this.onExit(String(projectId), 0));
    on('roadmap-stopped', (projectId) => this.onExit(String(projectId), null));

    // Sentinel polling (spec §4.1 — pause state lives on the filesystem)
    this.sentinelTimer = setInterval(() => this.pollSentinels(), SENTINEL_POLL_MS);
    this.sentinelTimer.unref?.();
    // 16ms coalescing — one snapshot emission per frame when dirty
    this.snapshotTimer = setInterval(() => {
      if (this.dirty) {
        this.dirty = false;
        this.emit('snapshot');
      }
    }, 16);
    this.snapshotTimer.unref?.();
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getAgents(): AgentSnapshot[] {
    return [...this.agents.values()].map((a) => ({ ...a.snap }));
  }

  getTrace(agentId?: string): TraceEvent[] {
    const all = this.trace.toArray();
    return agentId ? all.filter((e) => e.agentId === agentId) : all;
  }

  /**
   * Write a RESUME sentinel for the agent (spec §6.6 — the intervention).
   * Targets the spec dir that actually holds the pause sentinel (a worktree
   * spec dir when the agent runs in one); falls back to the first existing
   * candidate. This is the same file pause-handler.ts polls for.
   */
  writeResumeSentinel(taskId: string): { ok: boolean; path?: string; reason?: string } {
    if (!this.deps) return { ok: false, reason: 'observability not configured' };
    const candidates = this.deps.specDirCandidates(taskId).filter((d) => existsSync(d));
    const paused = candidates.find((d) => existsSync(path.join(d, 'RATE_LIMIT_PAUSE')) || existsSync(path.join(d, 'AUTH_PAUSE')));
    const target = paused ?? candidates[0];
    if (!target) return { ok: false, reason: 'no live spec dir for task' };
    const p = path.join(target, 'RESUME');
    try {
      writeFileSync(p, new Date().toISOString() + '\n');
      return { ok: true, path: p };
    } catch (err) {
      return { ok: false, reason: String(err) };
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private ensureAgent(taskId: string): AgentStateMut {
    let a = this.agents.get(taskId);
    if (!a) {
      const meta = this.deps?.taskMeta(taskId) ?? null;
      const model = meta?.model ?? 'default';
      a = {
        snap: {
          id: taskId,
          type: 'unknown',
          rawType: null,
          taskId,
          phase: 'idle',
          phaseSource: 'inferred',
          state: 'running',
          parentId: null,
          depth: 0,
          model,
          thinkingLevel: 'medium',
          stepsExecuted: 0,
          maxSteps: 1000,
          sessionNumber: 1,
          continuationCount: 0,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          contextWindowLimit: getModelContextWindow(model),
          tools: [],
          mcpServers: [],
          autoClaudeTools: [],
          waiting: null,
          startedAt: Date.now(),
        },
        openToolCalls: new Map(),
      };
      this.agents.set(taskId, a);
    }
    return a;
  }

  private onProgress(taskId: string, progress: { phase?: string; currentSubtask?: string; message?: string }): void {
    const a = this.ensureAgent(taskId);
    if (progress.phase) {
      a.snap.phase = progress.phase;
      a.snap.phaseSource = a.lastStructuredPhase === progress.phase ? 'structured' : 'inferred';
      const agentType = PHASE_AGENT_MAP[progress.phase];
      if (agentType) this.applyAgentType(a, agentType);
      if (progress.phase === 'complete') a.snap.state = 'done';
      if (progress.phase === 'failed') a.snap.state = 'error';
      if (progress.phase === 'rate_limit_paused' || progress.phase === 'auth_failure_paused') a.snap.state = 'paused';
    }
    if (progress.currentSubtask) a.snap.subtaskId = progress.currentSubtask;
    if (progress.message) a.snap.lastMessage = progress.message;
    this.dirty = true;
  }

  private applyAgentType(a: AgentStateMut, type: AgentType): void {
    const cfg = AGENT_CONFIGS[type];
    if (!cfg) return;
    a.snap.type = type;
    a.snap.thinkingLevel = cfg.thinkingDefault;
    a.snap.tools = cfg.tools;
    a.snap.mcpServers = cfg.mcpServers;
    a.snap.autoClaudeTools = cfg.autoClaudeTools;
  }

  /** Matches worker.ts:394's `postLog(\`Starting agent session: type=${session.agentType}, model=${session.modelId}\`)` — the ONE
   *  place the real, provider-resolved model id is observable here. */
  private static readonly SESSION_START_RE = /^Starting agent session: type=\S+, model=(\S+)$/;

  private onLog(taskId: string, message: string): void {
    const match = ObservabilityService.SESSION_START_RE.exec(message);
    if (!match) return;
    const resolvedModelId = match[1];
    const a = this.ensureAgent(taskId);
    // Refresh model + contextWindowLimit from the id the session ACTUALLY
    // resolved to (e.g. 'glm/glm-5' via a router-backed provider account) —
    // ensureAgent() only had task_metadata.json's shorthand (or the
    // 'default' fallback when absent, as for a roadmap-converted task with
    // no model field) at agent-creation time, which is what left
    // contextWindowLimit pinned to the 200k catalog-miss default for the
    // whole session's lifetime.
    a.snap.model = resolvedModelId;
    a.snap.contextWindowLimit = getModelContextWindow(resolvedModelId);
    this.dirty = true;
  }

  private onTaskEvent(taskId: string, event: Record<string, unknown>): void {
    const a = this.ensureAgent(taskId);
    const type = String(event.type ?? '');
    // Structured orchestrator events are authoritative (spec §2.3)
    const phaseFromEvent: Record<string, string> = {
      PLANNING_STARTED: 'planning',
      CODING_STARTED: 'coding',
      QA_STARTED: 'qa_review',
      QA_FIXING_STARTED: 'qa_fixing',
      QA_PASSED: 'complete',
      BUILD_COMPLETE: 'complete',
      PLANNING_FAILED: 'failed',
      CODING_FAILED: 'failed',
    };
    const phase = phaseFromEvent[type];
    if (phase) {
      a.snap.phase = phase;
      a.snap.phaseSource = 'structured';
      a.lastStructuredPhase = phase;
      const agentType = PHASE_AGENT_MAP[phase];
      if (agentType) this.applyAgentType(a, agentType);
      if (phase === 'complete') a.snap.state = 'done';
      if (phase === 'failed') a.snap.state = 'error';
    }
    if (type === 'QA_STARTED' || type === 'QA_REJECTED') {
      const iter = typeof event.iteration === 'number' ? event.iteration : 0;
      const max = typeof event.maxIterations === 'number' ? event.maxIterations : 50;
      a.snap.qaIteration = { current: iter, max };
    }
    // Agentic-orchestration opt-in (2026-09-17): SUBAGENT_* task-events
    // (worker.ts's onSubagentEvent callback, agentic
    // spec-orchestration mode only) construct a distinct child
    // AgentSnapshot keyed by subagentId, with parentId = the orchestrator's
    // taskId — this is what makes GraphView (AgentsView.tsx) render a real
    // second node instead of folding subagent traffic into the parent's
    // own trace (spec P3.5.11 "subagent nodes"). Additive: SUBAGENT_* is a
    // new event type worker.ts never emitted before this patch, so this
    // branch is unreachable for any pre-existing (non-agentic) session.
    // First-party file (apps/tui/**) — no [APERANT-PATCH] marker needed.
    if (type === 'SUBAGENT_SPAWNING' || type === 'SUBAGENT_COMPLETED' || type === 'SUBAGENT_FAILED') {
      const subagentId = String(event.subagentId ?? '');
      const rawAgentType = String(event.agentType ?? 'unknown');
      if (subagentId) {
        const child = this.ensureAgent(subagentId);
        child.snap.parentId = taskId;
        child.snap.depth = a.snap.depth + 1;
        // F-19 fix: rawType always carries the verbatim spawned string,
        // independent of resolution outcome below, so display code can
        // show the reader ground truth instead of the resolved label.
        child.snap.rawType = rawAgentType;
        const resolvedAgentType = (rawAgentType in AGENT_CONFIGS ? rawAgentType : 'spec_gatherer') as AgentType;
        this.applyAgentType(child, resolvedAgentType);
        if (type === 'SUBAGENT_SPAWNING') child.snap.state = 'running';
        if (type === 'SUBAGENT_COMPLETED') child.snap.state = 'done';
        if (type === 'SUBAGENT_FAILED') child.snap.state = 'error';
        this.pushTrace(subagentId, `task:${type}`, undefined, undefined, type === 'SUBAGENT_FAILED', rawAgentType);
      }
    }
    this.pushTrace(taskId, `task:${type}`, undefined, undefined, false, JSON.stringify(event).slice(0, 120));
    this.dirty = true;
  }

  private onStreamEvent(taskId: string, event: Record<string, unknown>): void {
    const a = this.ensureAgent(taskId);
    const type = String(event.type ?? '');
    switch (type) {
      case 'text-delta':
        // high-frequency: trace only, no wait-state recompute (spec §7.3)
        // The chunk text IS the streaming surface — dropping it left the trace
        // view rendering an empty payload column for every delta. Truncated
        // because a single delta can be arbitrarily long and the row is one line.
        this.pushTrace(taskId, 'text-delta', undefined, undefined, false, summarizeDelta(event.text));
        break;
      case 'thinking-delta':
        this.pushTrace(taskId, 'thinking-delta', undefined, undefined, false, summarizeDelta(event.text));
        break;
      case 'tool-call': {
        const toolName = String(event.toolName ?? '?');
        const id = String(event.toolCallId ?? `${Date.now()}`);
        const argsSummary = summarizeArgs(event.args);
        a.openToolCalls.set(id, { toolName, argsSummary, since: Date.now() });
        this.recomputeWait(a);
        this.pushTrace(taskId, 'tool-call', toolName, undefined, false, argsSummary);
        this.dirty = true;
        break;
      }
      case 'tool-result': {
        const id = String(event.toolCallId ?? '');
        const open = a.openToolCalls.get(id);
        a.openToolCalls.delete(id);
        this.recomputeWait(a);
        this.pushTrace(taskId, 'tool-result', String(event.toolName ?? open?.toolName ?? '?'),
          typeof event.durationMs === 'number' ? event.durationMs : undefined,
          event.isError === true, summarizeArgs(event.result));
        this.dirty = true;
        break;
      }
      case 'step-finish': {
        a.snap.stepsExecuted = typeof event.stepNumber === 'number' ? event.stepNumber : a.snap.stepsExecuted + 1;
        const usage = event.usage as Partial<TokenUsage> | undefined;
        if (usage) this.applyUsage(a, usage);
        this.recomputeWait(a);
        this.pushTrace(taskId, 'step-finish', undefined, undefined, false,
          `step ${a.snap.stepsExecuted} · ${fmtK(a.snap.usage.totalTokens)} tok`);
        this.dirty = true;
        break;
      }
      case 'usage-update': {
        const usage = event.usage as Partial<TokenUsage> | undefined;
        if (usage) {
          this.applyUsage(a, usage);
          this.recomputeWait(a);
          this.dirty = true;
        }
        break;
      }
      case 'error': {
        const err = event.error as { message?: string } | undefined;
        this.pushTrace(taskId, 'error', undefined, undefined, true, err?.message ?? 'session error');
        this.dirty = true;
        break;
      }
    }
  }

  private applyUsage(a: AgentStateMut, usage: Partial<TokenUsage>): void {
    a.snap.usage = {
      promptTokens: usage.promptTokens ?? a.snap.usage.promptTokens,
      completionTokens: usage.completionTokens ?? a.snap.usage.completionTokens,
      totalTokens: usage.totalTokens ?? a.snap.usage.totalTokens,
      thinkingTokens: usage.thinkingTokens ?? a.snap.usage.thinkingTokens,
      cacheReadTokens: usage.cacheReadTokens ?? a.snap.usage.cacheReadTokens,
      cacheCreationTokens: usage.cacheCreationTokens ?? a.snap.usage.cacheCreationTokens,
    };
  }

  private onError(taskId: string, error: string): void {
    const a = this.ensureAgent(taskId);
    a.snap.state = 'error';
    a.snap.lastMessage = error;
    this.pushTrace(taskId, 'error', undefined, undefined, true, error.slice(0, 160));
    this.dirty = true;
  }

  private onExit(taskId: string, code: number | null): void {
    const a = this.ensureAgent(taskId);
    if (a.snap.state !== 'done') a.snap.state = code === 0 ? 'done' : 'error';
    this.pushTrace(taskId, 'exit', undefined, undefined, code !== 0, `code ${code ?? 'null'}`);
    this.dirty = true;
  }

  // -------------------------------------------------------------------------
  // Wait-state derivation (spec §7.1)
  // -------------------------------------------------------------------------

  private recomputeWait(a: AgentStateMut): void {
    // context pressure first (supersedes tool wait display)
    const pct = a.snap.contextWindowLimit > 0
      ? (a.snap.usage.promptTokens / a.snap.contextWindowLimit) * 100
      : 0;
    if (pct >= CONTEXT_COMPACT_PCT) {
      a.snap.waiting = { kind: 'context', usagePct: Math.round(pct * 10) / 10, willCompact: true };
      a.snap.state = 'blocked';
      return;
    }
    // open tool call = blocked on tool (or MCP when mcp__ prefixed)
    const open = [...a.openToolCalls.values()].sort((x, y) => x.since - y.since)[0];
    if (open) {
      if (open.toolName.startsWith('mcp__')) {
        const [, server = '?', tool = '?'] = open.toolName.split('__');
        a.snap.waiting = { kind: 'mcp', server, tool, since: open.since };
      } else {
        a.snap.waiting = { kind: 'tool', toolName: open.toolName, argsSummary: open.argsSummary, since: open.since };
      }
      if (a.snap.state === 'running') a.snap.state = 'blocked';
      return;
    }
    if (a.snap.state === 'blocked') a.snap.state = 'running';
    a.snap.waiting = null;
  }

  private pollSentinels(): void {
    if (!this.deps) return;
    for (const [taskId, a] of this.agents) {
      if (a.snap.state === 'done') continue;
      for (const dir of this.deps.specDirCandidates(taskId)) {
        const rl = path.join(dir, 'RATE_LIMIT_PAUSE');
        const auth = path.join(dir, 'AUTH_PAUSE');
        if (existsSync(rl)) {
          let resetAt: string | null = null;
          let pausedAt = Date.now();
          try {
            const d = JSON.parse(readFileSync(rl, 'utf-8')) as { resetTimestamp?: string | null; pausedAt?: string };
            resetAt = d.resetTimestamp ?? null;
            if (d.pausedAt) pausedAt = Date.parse(d.pausedAt) || Date.now();
          } catch { /* sentinel exists; body optional */ }
          a.snap.waiting = { kind: 'ratelimit', resetAt, sentinelPath: rl, since: pausedAt };
          a.snap.state = 'paused';
          a.snap.phase = 'rate_limit_paused';
          a.snap.phaseSource = 'structured';
          this.dirty = true;
          break;
        }
        if (existsSync(auth)) {
          a.snap.waiting = { kind: 'auth', sentinelPath: auth, since: Date.now() };
          a.snap.state = 'paused';
          a.snap.phase = 'auth_failure_paused';
          a.snap.phaseSource = 'structured';
          this.dirty = true;
          break;
        }
        // RESUME present / sentinels gone → paused clears back to running
        if (a.snap.state === 'paused' && !existsSync(rl) && !existsSync(auth)) {
          a.snap.state = 'running';
          a.snap.waiting = null;
          this.dirty = true;
        }
      }
    }
  }

  private pushTrace(agentId: string, type: string, tool?: string, durationMs?: number, isError?: boolean, summary = ''): void {
    this.trace.push({
      seq: ++this.seq,
      ts: new Date().toISOString(),
      agentId,
      type,
      tool,
      durationMs,
      isError,
      summary,
    });
  }
}

function summarizeArgs(args: unknown): string {
  if (args == null) return '';
  try {
    const s = typeof args === 'string' ? args : JSON.stringify(args);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  } catch {
    return String(args).slice(0, 80);
  }
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/**
 * Render one streamed delta as a single trace row. Newlines and tabs are
 * collapsed because the trace is a one-line-per-event table — a raw chunk
 * containing newlines would break the row alignment of every row after it.
 */
function summarizeDelta(text: unknown): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 77)}…` : flat;
}

/** Singleton — the TUI's one observability tap. */
export const observability = new ObservabilityService();

/** Overall progress % from phase + in-phase progress (spec §2.2). */
export function overallProgress(phase: string, phaseProgress: number): number {
  const w = PHASE_WEIGHTS[phase];
  if (!w) return phase === 'complete' ? 100 : 0;
  return Math.round(w[0] + ((w[1] - w[0]) * phaseProgress) / 100);
}
