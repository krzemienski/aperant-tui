/**
 * AgentsView — agent coordination & observability surface
 * (spec: aperant-agent-observability-spec.md Part 6).
 *
 * Six sub-views, each answering one operational question:
 *   1 SWARM  — what is every agent doing right now?
 *   2 GRAPH  — how do agents relate? (+ phase pipeline & regression guard)
 *   3 INSPECT — everything about one agent (identity / wait / tokens / grants)
 *   4 TRACE  — what happened, in order (full StreamEvent stream)
 *   5 TOKENS — where is the budget going?
 *   6 WAITS  — what is blocked, and how do I unblock it? (r writes RESUME)
 *
 * Every row renders REAL state from services/observability.ts, which taps the
 * vendored AgentManager event stream, the spec-dir sentinel files, and the
 * vendored AGENT_CONFIGS registry. When no agent is running the view says so —
 * nothing is simulated.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '../theme/themes';
import type { Project } from '@shared/types';
import { Panel } from '../components/Panel';
import { useKeymap } from '../hooks/useKeymap';
import { observability, overallProgress, type AgentSnapshot, type TraceEvent, type WaitState } from '../services/observability';
import { useAppStore } from '../stores/app-store';

type SubView = 'swarm' | 'graph' | 'inspect' | 'trace' | 'tokens' | 'waits';

const SUBVIEWS: SubView[] = ['swarm', 'graph', 'inspect', 'trace', 'tokens', 'waits'];

const STATE_GLYPH: Record<string, string> = { running: '●', blocked: '○', paused: '⏸', done: '✓', error: '✗' };
const WAIT_META: Record<string, { g: string; label: string }> = {
  tool: { g: '⚙', label: 'TOOL' },
  mcp: { g: '⇄', label: 'MCP' },
  concurrency: { g: '⏸', label: 'SLOT' },
  context: { g: '▓', label: 'CTX' },
  ratelimit: { g: '⏱', label: '429' },
  auth: { g: '🔒', label: '401' },
};

function bar(pct: number, w = 8): string {
  const filled = Math.max(0, Math.min(w, Math.round((pct / 100) * w)));
  return '█'.repeat(filled) + '░'.repeat(w - filled);
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function sinceMs(since: number): string {
  const s = Math.max(0, Math.round((Date.now() - since) / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function waitText(w: WaitState | null): string {
  if (!w) return '— executing';
  switch (w.kind) {
    case 'tool': return `⚙ TOOL ${w.toolName} ${w.argsSummary} ${sinceMs(w.since)}`;
    case 'mcp': return `⇄ MCP ${w.server} ${w.tool} ${sinceMs(w.since)}`;
    case 'concurrency': return `⏸ SLOT ${w.slot}/${w.maxSlots} queued ${sinceMs(w.since)}`;
    case 'context': return `▓ CTX ${w.usagePct}% — compaction imminent`;
    case 'ratelimit': return `⏱ 429 ${w.resetAt ? `resets ${w.resetAt}` : 'reset unknown'} · waited ${sinceMs(w.since)}`;
    case 'auth': return `🔒 401 re-authenticate · ${sinceMs(w.since)}`;
  }
}

function waitColor(w: WaitState | null, c: Theme): string {
  if (!w) return c.faint;
  return { tool: c.info, mcp: c.accent2, concurrency: c.dim, context: c.warn, ratelimit: c.err, auth: c.err }[w.kind];
}

export function AgentsView({ theme: c, project, isActive }: { theme: Theme; project: Project; isActive: boolean }) {
  const [sub, setSub] = useState<SubView>('swarm');
  const [sel, setSel] = useState(0);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const flash = useAppStore((s) => s.flash);

  // Subscribe to coalesced snapshots + a 1s tick for elapsed/since columns.
  useEffect(() => {
    const onSnap = () => forceTick((n) => n + 1);
    observability.on('snapshot', onSnap);
    const tick = setInterval(onSnap, 1000);
    return () => { observability.off('snapshot', onSnap); clearInterval(tick); };
  }, []);

  const agents = observability.getAgents();
  const clamped = Math.min(sel, Math.max(0, agents.length - 1));
  const selected: AgentSnapshot | undefined = agents[clamped];

  useKeymap({
    '1': () => setSub('swarm'),
    '2': () => setSub('graph'),
    '3': () => setSub('inspect'),
    '4': () => setSub('trace'),
    '5': () => setSub('tokens'),
    '6': () => setSub('waits'),
    j: () => setSel((s) => Math.min(s + 1, agents.length - 1)),
    k: () => setSel((s) => Math.max(s - 1, 0)),
    down: () => setSel((s) => Math.min(s + 1, agents.length - 1)),
    up: () => setSel((s) => Math.max(s - 1, 0)),
    return: () => setSub('inspect'),
    f: () => {
      if (!selected) return;
      const next = filterAgent ? null : selected.id;
      setFilterAgent(next);
      flash(next ? `trace filter → ${selected.id.slice(0, 20)}` : 'filter cleared');
    },
    r: () => {
      if (!selected) return;
      const res = observability.writeResumeSentinel(selected.taskId);
      flash(res.ok ? `RESUME written → ${res.path}` : `resume failed: ${res.reason}`);
    },
  }, { isActive });

  const empty = agents.length === 0;

  return (
    <Box flexDirection="column" flexGrow={1} gap={1}>
      <Box gap={1}>
        {SUBVIEWS.map((v, i) => (
          <Text key={v} backgroundColor={sub === v ? c.accent : undefined} color={sub === v ? c.bg : c.dim} bold={sub === v}>
            {` ${i + 1} ${v} `}
          </Text>
        ))}
        <Text color={c.faint}>
          {empty ? 'no live agents — start one from the board with s' : `${agents.length} agent${agents.length > 1 ? 's' : ''} · esc then 1-7 to switch tabs`}
        </Text>
      </Box>
      {empty ? (
        <Panel title="AGENT SWARM" focused theme={c} flexGrow={1}>
          <Text color={c.faint}>No agent has started in this TUI session.</Text>
          <Text color={c.dim}>Start one from the board (s on a task) — this surface taps the real AgentManager</Text>
          <Text color={c.dim}>event stream, spec-dir sentinel files, and the vendored AGENT_CONFIGS registry.</Text>
        </Panel>
      ) : (
        <>
          {sub === 'swarm' && <SwarmView c={c} agents={agents} sel={clamped} />}
          {sub === 'graph' && <GraphView c={c} agents={agents} />}
          {sub === 'inspect' && selected && <InspectView c={c} a={selected} />}
          {sub === 'trace' && <TraceView c={c} events={observability.getTrace(filterAgent ?? undefined)} filter={filterAgent} />}
          {sub === 'tokens' && <TokensView c={c} agents={agents} />}
          {sub === 'waits' && <WaitsView c={c} agents={agents} sel={clamped} />}
        </>
      )}
    </Box>
  );
}

// ── SWARM ────────────────────────────────────────────────────────────────────
function SwarmView({ c, agents, sel }: { c: Theme; agents: AgentSnapshot[]; sel: number }) {
  const running = agents.filter((a) => a.state === 'running').length;
  const blocked = agents.filter((a) => a.state === 'blocked').length;
  const paused = agents.filter((a) => a.state === 'paused').length;
  const totalTok = agents.reduce((n, a) => n + a.usage.totalTokens, 0);
  const trace = observability.getTrace().slice(-12);
  return (
    <Box gap={1} flexGrow={1}>
      <Panel title={`AGENT SWARM · ${agents.length} live`} focused theme={c} flexGrow={1} flexBasis="62%">
        <Box gap={1} paddingX={1}>
          <Text color={c.faint}>{'  AGENT              TYPE               STEPS      CTX      WAITING ON'}</Text>
        </Box>
        {agents.map((a, i) => {
          const on = i === sel;
          const pct = a.contextWindowLimit > 0 ? Math.round((a.usage.promptTokens / a.contextWindowLimit) * 100) : 0;
          return (
            <Box key={a.id} gap={1} paddingX={1}>
              <Text color={on ? c.accent : c.faint}>{on ? '❯' : ' '}</Text>
              <Text color={on ? c.accent : stateColor(a.state, c)}>{STATE_GLYPH[a.state] ?? '○'}</Text>
              <Box width={18}><Text color={on ? c.text : c.dim} wrap="truncate-end">{'│ '.repeat(a.depth)}{a.id.slice(0, 16)}</Text></Box>
              <Box width={18}><Text color={c.dim} wrap="truncate-end">{a.type}</Text></Box>
              <Box width={10}><Text color={c.dim}>{a.stepsExecuted}<Text color={c.faint}>/{a.maxSteps}</Text></Text></Box>
              <Box width={8}><Text color={pct > 90 ? c.err : pct > 70 ? c.warn : c.ok}>{bar(pct, 5)} {pct}%</Text></Box>
              <Text color={waitColor(a.waiting, c)} wrap="truncate-end">{waitText(a.waiting)}</Text>
            </Box>
          );
        })}
        <Text> </Text>
        <Text color={c.dim}>  phase: <Text color={c.accent}>▪ structured</Text> vs <Text color={c.warn}>~ inferred</Text> provenance shown in INSPECT</Text>
      </Panel>
      <Box flexDirection="column" gap={1} flexGrow={1}>
        <Panel title="SWARM VITALS" theme={c}>
          <Text color={c.dim}>running   <Text color={c.accent}>{running}</Text></Text>
          <Text color={c.dim}>blocked   <Text color={c.dim}>{blocked}</Text></Text>
          <Text color={c.dim}>paused    <Text color={c.err}>{paused}</Text></Text>
          <Text color={c.dim}>Σ tokens  <Text color={c.text}>{fmtK(totalTok)}</Text></Text>
        </Panel>
        <Panel title="LIVE TOOL TRACE" theme={c} flexGrow={1}>
          {trace.length === 0 ? <Text color={c.faint}>no events yet</Text> : trace.map((e) => (
            <Text key={e.seq} wrap="truncate-end">
              <Text color={c.faint}>{e.ts.slice(11, 19)} </Text>
              <Text color={c.dim}>{e.agentId.slice(0, 12).padEnd(12)} </Text>
              <Text color={e.type === 'tool-result' ? (e.isError ? c.err : c.ok) : e.type === 'tool-call' ? c.info : c.faint}>
                {e.type === 'tool-call' ? `→ ${e.tool}` : e.type === 'tool-result' ? `← ${e.durationMs ?? '?'}ms` : e.type}
              </Text>
              <Text color={c.faint}> {e.summary}</Text>
            </Text>
          ))}
        </Panel>
      </Box>
    </Box>
  );
}

// ── GRAPH ────────────────────────────────────────────────────────────────────
function GraphView({ c, agents }: { c: Theme; agents: AgentSnapshot[] }) {
  const roots = agents.filter((a) => !a.parentId);
  const byParent = new Map<string, AgentSnapshot[]>();
  for (const a of agents) {
    if (a.parentId) {
      const l = byParent.get(a.parentId) ?? [];
      l.push(a);
      byParent.set(a.parentId, l);
    }
  }
  const primary = agents[0];
  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="ORCHESTRATION GRAPH" focused theme={c} flexGrow={1}>
        {roots.map((r) => (
          <Box key={r.id} flexDirection="column">
            <Text color={stateColor(r.state, c)}>  ◈ {r.type} <Text color={c.faint}>{r.id.slice(0, 16)} · {r.phase} · {overallProgress(r.phase, 0)}%</Text></Text>
            {(byParent.get(r.id) ?? []).map((ch, i, arr) => (
              <Text key={ch.id} color={stateColor(ch.state, c)}>
                {'  '}{i === arr.length - 1 ? '└─' : '├─'}{STATE_GLYPH[ch.state]} {ch.type} <Text color={c.faint}>{waitText(ch.waiting)}</Text>
              </Text>
            ))}
            <Text> </Text>
          </Box>
        ))}
        {roots.length === 0 && <Text color={c.faint}>no orchestration topology — agents appear here when spawned</Text>}
      </Panel>
      <Panel title={`PHASE PIPELINE${primary ? ` · ${primary.id.slice(0, 12)}` : ''}`} theme={c} flexGrow={1}>
        {(['planning', 'coding', 'qa_review', 'qa_fixing', 'complete'] as const).map((p) => {
          const range = { planning: '0→20%', coding: '20→80%', qa_review: '80→95%', qa_fixing: '80→95%', complete: '100%' }[p];
          const active = primary?.phase === p;
          const done = primary ? phaseIndex(p) < phaseIndex(primary.phase) : false;
          return (
            <Text key={p} color={active ? c.accent : done ? c.ok : c.faint}>
              {done ? '✓' : active ? '⚡' : '○'} {p.padEnd(10)} <Text color={c.faint}>{range}</Text>
            </Text>
          );
        })}
        <Text> </Text>
        <Text color={c.warn}>⚠ regression guard active</Text>
        <Text color={c.faint}>PHASE_ORDER_INDEX blocks backward fallback moves;</Text>
        <Text color={c.faint}>complete requires a structured emit, never text.</Text>
      </Panel>
    </Box>
  );
}

function phaseIndex(p: string): number {
  return { idle: -1, planning: 0, coding: 1, rate_limit_paused: 1, auth_failure_paused: 1, qa_review: 2, qa_fixing: 3, complete: 4, failed: 99 }[p] ?? -1;
}

// ── INSPECT ──────────────────────────────────────────────────────────────────
function InspectView({ c, a }: { c: Theme; a: AgentSnapshot }) {
  const pct = a.contextWindowLimit > 0 ? Math.round((a.usage.promptTokens / a.contextWindowLimit) * 1000) / 10 : 0;
  const cacheRead = a.usage.cacheReadTokens ?? 0;
  const cacheCreate = a.usage.cacheCreationTokens ?? 0;
  const cacheHit = cacheRead + cacheCreate > 0 ? Math.round((cacheRead / (cacheRead + cacheCreate)) * 100) : 0;
  return (
    <Box gap={1} flexGrow={1}>
      <Box flexDirection="column" gap={1} flexGrow={1}>
        <Panel title={`AGENT · ${a.id.slice(0, 20)}`} focused theme={c}>
          <Row c={c} k="type" v={a.type} col={c.accent} />
          <Row c={c} k="state" v={a.state.toUpperCase()} col={stateColor(a.state, c)} />
          <Row c={c} k="phase" v={<>{a.phase} <Text color={a.phaseSource === 'structured' ? c.accent : c.warn}>{a.phaseSource === 'structured' ? '▪ structured' : '~ inferred'}</Text></>} />
          {a.subtaskId && <Row c={c} k="subtask" v={a.subtaskId} col={c.info} />}
          {a.qaIteration && <Row c={c} k="qa iter" v={`${a.qaIteration.current}/${a.qaIteration.max}`} col={c.warn} />}
          <Row c={c} k="model" v={`${a.model} · thinking:${a.thinkingLevel}`} />
          <Row c={c} k="steps" v={`${a.stepsExecuted}/${a.maxSteps}${a.stepsExecuted >= a.maxSteps * 0.75 ? ' ⚠ budget warning injected' : ''}`} />
          <Row c={c} k="session" v={`#${a.sessionNumber} · continuations ${a.continuationCount}/5`} />
          <Row c={c} k="elapsed" v={sinceMs(a.startedAt)} col={c.dim} />
          {a.lastMessage && <Row c={c} k="last" v={a.lastMessage} col={c.faint} />}
        </Panel>
        <Panel title="WAIT STATE" theme={c}>
          {a.waiting ? (
            <>
              <Text color={waitColor(a.waiting, c)}>{WAIT_META[a.waiting.kind].g} {WAIT_META[a.waiting.kind].label} <Text color={c.dim}>{'since' in a.waiting ? sinceMs((a.waiting as { since: number }).since) : ''}</Text></Text>
              <Text color={c.dim} wrap="truncate-end">{waitText(a.waiting)}</Text>
              {a.waiting.kind === 'ratelimit' && <Text color={c.faint}>sentinel: {a.waiting.sentinelPath}</Text>}
              {a.waiting.kind === 'ratelimit' && <Text color={c.faint}>unblocks: RESUME file (r), reset timer, or profile swap</Text>}
              {a.waiting.kind === 'auth' && <Text color={c.faint}>sentinel: {a.waiting.sentinelPath} · poll 10s · max 24h</Text>}
              {a.waiting.kind === 'context' && <Text color={c.faint}>unblocks: automatic compaction ≥90% (max 5 continuations)</Text>}
              {a.waiting.kind === 'tool' && <Text color={c.faint}>unblocks: child process exit</Text>}
              {a.waiting.kind === 'mcp' && <Text color={c.faint}>unblocks: MCP server response or timeout</Text>}
            </>
          ) : <Text color={c.ok}>● executing — not blocked</Text>}
        </Panel>
        <Panel title="TOKEN / CONTEXT" theme={c} flexGrow={1}>
          <Text color={pct > 90 ? c.err : pct > 70 ? c.warn : c.ok}>{bar(pct, 30)}</Text>
          <Text color={c.dim}>{fmtK(a.usage.promptTokens)} / {fmtK(a.contextWindowLimit)} · {pct}%</Text>
          <Text color={c.faint}>warn @70% · continuation @90% · hard abort @95%</Text>
          <Row c={c} k="prompt" v={fmtK(a.usage.promptTokens)} />
          <Row c={c} k="completion" v={fmtK(a.usage.completionTokens)} />
          <Row c={c} k="thinking" v={fmtK(a.usage.thinkingTokens ?? 0)} col={c.info} />
          <Row c={c} k="cache hit" v={`${bar(cacheHit, 10)} ${cacheHit}%`} col={c.ok} />
          <Row c={c} k="total" v={fmtK(a.usage.totalTokens)} col={c.accent} />
        </Panel>
      </Box>
      <Panel title="TOOL GRANTS (from AGENT_CONFIGS)" theme={c} flexGrow={1}>
        <Text color={c.faint}>BUILTIN</Text>
        <Text color={c.info} wrap="wrap">{a.tools.length ? a.tools.join('  ') : '— none granted'}</Text>
        <Text color={c.faint}>MCP SERVERS</Text>
        <Text color={c.accent2} wrap="wrap">{a.mcpServers.length ? a.mcpServers.join('  ') : '—'}</Text>
        <Text color={c.faint}>AUTO-CLAUDE MCP</Text>
        <Text color={c.accent} wrap="wrap">{a.autoClaudeTools.length ? a.autoClaudeTools.join('  ') : '—'}</Text>
        <Text> </Text>
        <Text color={c.faint}>grants resolved from AGENT_CONFIGS[{a.type}]</Text>
        <Text color={c.faint}>writes contained to allowedWritePaths</Text>
        {a.type !== 'unknown' && a.mcpServers.includes('browser') && (
          <Text color={c.warn}>browser MCP granted (QA-only privilege)</Text>
        )}
      </Panel>
    </Box>
  );
}

// ── TRACE ────────────────────────────────────────────────────────────────────
function TraceView({ c, events, filter }: { c: Theme; events: TraceEvent[]; filter: string | null }) {
  const rows = events.slice(-24);
  return (
    <Panel title={`EVENT TRACE${filter ? ` · ${filter.slice(0, 16)}` : ' · all agents'} · ${events.length} events`} focused theme={c} flexGrow={1}>
      <Text color={c.faint}>{'  TIME      AGENT         EVENT          TOOL                DUR     PAYLOAD'}</Text>
      {rows.map((e) => (
        <Text key={e.seq} wrap="truncate-end">
          <Text color={c.faint}>{e.ts.slice(11, 23)} </Text>
          <Text color={c.dim}>{e.agentId.slice(0, 12).padEnd(12)} </Text>
          <Text color={e.type === 'tool-call' ? c.info : e.type === 'tool-result' ? (e.isError ? c.err : c.ok) : e.type.startsWith('task:') ? c.accent : c.faint}>
            {e.type.padEnd(14)}
          </Text>
          <Text color={e.tool ? c.text : c.faint}>{(e.tool ?? '—').padEnd(18).slice(0, 18)} </Text>
          <Text color={(e.durationMs ?? 0) > 3000 ? c.warn : c.dim}>{e.durationMs ? `${e.durationMs}ms` : '—'.padEnd(7)}</Text>
          <Text color={c.faint}> {e.summary}</Text>
        </Text>
      ))}
      {rows.length === 0 && <Text color={c.faint}>no events{filter ? ` for ${filter}` : ''} yet</Text>}
      <Text color={c.faint}>f toggles agent filter · ring buffer 10k · outlier &gt;3000ms highlighted</Text>
    </Panel>
  );
}

// ── TOKENS ───────────────────────────────────────────────────────────────────
function TokensView({ c, agents }: { c: Theme; agents: AgentSnapshot[] }) {
  const withTok = agents.filter((a) => a.usage.totalTokens > 0);
  const byPressure = [...agents].sort((x, y) =>
    (y.usage.promptTokens / (y.contextWindowLimit || 1)) - (x.usage.promptTokens / (x.contextWindowLimit || 1)));
  return (
    <Box gap={1} flexGrow={1}>
      <Panel title="TOKEN LEDGER · by agent" focused theme={c} flexGrow={1}>
        <Text color={c.faint}>{'  AGENT              PROMPT    COMPL     THINK     CACHE HIT        TOTAL'}</Text>
        {withTok.map((a) => {
          const cr = a.usage.cacheReadTokens ?? 0;
          const cc = a.usage.cacheCreationTokens ?? 0;
          const hit = cr + cc > 0 ? Math.round((cr / (cr + cc)) * 100) : 0;
          return (
            <Text key={a.id} wrap="truncate-end">
              <Text color={c.dim}>{'  '}{a.id.slice(0, 16).padEnd(16)} </Text>
              <Text color={c.dim}>{fmtK(a.usage.promptTokens).padEnd(9)}</Text>
              <Text color={c.dim}>{fmtK(a.usage.completionTokens).padEnd(9)}</Text>
              <Text color={(a.usage.thinkingTokens ?? 0) > 0 ? c.info : c.faint}>{fmtK(a.usage.thinkingTokens ?? 0).padEnd(9)}</Text>
              <Text color={hit > 70 ? c.ok : hit > 40 ? c.warn : c.faint}>{bar(hit, 8)} {hit}%</Text>
              <Text color={c.accent}>  {fmtK(a.usage.totalTokens)}</Text>
            </Text>
          );
        })}
        {withTok.length === 0 && <Text color={c.faint}>no token usage recorded yet — ledger fills from step-finish/usage-update events</Text>}
      </Panel>
      <Panel title="CONTEXT PRESSURE" theme={c} flexGrow={1}>
        {byPressure.map((a) => {
          const p = a.contextWindowLimit > 0 ? Math.round((a.usage.promptTokens / a.contextWindowLimit) * 100) : 0;
          return (
            <Text key={a.id} wrap="truncate-end">
              <Text color={c.dim}>{a.id.slice(0, 16).padEnd(16)} </Text>
              <Text color={p > 90 ? c.err : p > 70 ? c.warn : c.ok}>{bar(p, 10)} {p}%</Text>
            </Text>
          );
        })}
        <Text> </Text>
        {byPressure.filter((a) => a.contextWindowLimit > 0 && a.usage.promptTokens / a.contextWindowLimit > 0.9).map((a) => (
          <Text key={a.id} color={c.warn}>⚠ {a.id.slice(0, 16)} &gt;90% → continuation will fire</Text>
        ))}
        <Text color={c.faint}>thinking: coder=low by design; planner/qa/spec_writer=high</Text>
      </Panel>
    </Box>
  );
}

// ── WAITS ────────────────────────────────────────────────────────────────────
const THRESHOLDS: Array<[string, string, string]> = [
  ['MAX_QA_ITERATIONS', '50', 'qa-loop'],
  ['MAX_CONSECUTIVE_ERRORS', '3', 'qa-loop'],
  ['RECURRING_ISSUE_THRESHOLD', '3', 'qa-loop'],
  ['MAX_SUBTASK_RETRIES', '3', 'build-orch'],
  ['CIRCULAR_FIX_THRESHOLD', '3', 'recovery'],
  ['MAX_ATTEMPTS_PER_SUBTASK', '50', 'recovery'],
  ['DEFAULT_MAX_CONCURRENCY', '3', 'parallel'],
  ['STAGGER_DELAY_MS', '1s', 'parallel'],
  ['MAX_RATE_LIMIT_WAIT', '2h', 'pause'],
  ['AUTH_RESUME_MAX_WAIT', '24h', 'pause'],
  ['MAX_CONTINUATIONS', '5', 'continuation'],
  ['SUBAGENT_MAX_STEPS', '100', 'subagent'],
];

function WaitsView({ c, agents, sel }: { c: Theme; agents: AgentSnapshot[]; sel: number }) {
  const blocked = agents.filter((a) => a.waiting);
  return (
    <Box gap={1} flexGrow={1}>
      <Panel title={`BLOCKING ANALYSIS · ${blocked.length} blocked`} focused theme={c} flexGrow={1}>
        {blocked.map((a, i) => (
          <Box key={a.id} flexDirection="column" marginBottom={1}>
            <Text color={waitColor(a.waiting, c)}>
              {WAIT_META[a.waiting!.kind].g} {a.id.slice(0, 18)} <Text color={c.faint}>[{WAIT_META[a.waiting!.kind].label}]</Text>
              {i === sel ? <Text color={c.accent}>  ❯ selected</Text> : null}
            </Text>
            <Text color={c.dim}>  {waitText(a.waiting)}</Text>
          </Box>
        ))}
        {blocked.length === 0 && <Text color={c.ok}>nothing blocked — no wait states detected</Text>}
        <Text color={c.faint}>r writes RESUME sentinel for the selected agent (spec §4.1)</Text>
      </Panel>
      <Panel title="ESCALATION THRESHOLDS" theme={c} flexGrow={1}>
        {THRESHOLDS.map(([k, v, src]) => (
          <Text key={k} wrap="truncate-end">
            <Text color={c.dim}>{k.padEnd(28)}</Text>
            <Text color={c.accent}>{v.padEnd(6)}</Text>
            <Text color={c.faint}>{src}</Text>
          </Text>
        ))}
        <Text color={c.faint}>recovery actions: rollback │ retry │ skip │ escalate</Text>
      </Panel>
    </Box>
  );
}

// ── shared ───────────────────────────────────────────────────────────────────
function Row({ c, k, v, col }: { c: Theme; k: string; v: React.ReactNode; col?: string }) {
  return (
    <Box gap={1}>
      <Box width={12}><Text color={c.dim}>{k}</Text></Box>
      <Text color={col ?? c.text}>{v}</Text>
    </Box>
  );
}

function stateColor(state: string, c: Theme): string {
  return { running: c.accent, blocked: c.dim, paused: c.err, done: c.ok, error: c.err }[state] ?? c.dim;
}
