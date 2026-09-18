// P3.5.13 throughput driver: drives >=100 real events/sec through the REAL
// ObservabilityService (observability.ts) via its actual attachToManager()
// emitter path, and measures whether the 16ms snapshot coalescing holds
// (snapshot count << event count) while the process stays responsive.
import { ObservabilityService } from '/Users/nick/dev/aperant-tui/apps/tui/src/services/observability.ts';
import { EventEmitter } from 'node:events';

const svc = new ObservabilityService();
const fakeManager = new EventEmitter();
svc.configure({
  specDirCandidates: () => [],
  taskMeta: () => null,
});
svc.attachToManager(fakeManager);

let snapshotCount = 0;
svc.on('snapshot', () => { snapshotCount++; });

const TASK_ID = 'burst-task';
const TARGET_RATE = 150; // events/sec, comfortably >= 100
const DURATION_MS = 5000;
const INTERVAL_MS = 1000 / TARGET_RATE; // ~6.67ms between events

let eventsSent = 0;
let toolCallSeq = 0;
const startWall = process.hrtime.bigint();

// Track main-thread responsiveness: measure actual interval drift.
// If the event loop stalls (UI would freeze), setInterval ticks would
// lag significantly behind their scheduled time.
const loopLagSamples = [];
let lastTick = process.hrtime.bigint();

function emitOneEvent() {
  const now = process.hrtime.bigint();
  const lagNs = now - lastTick;
  loopLagSamples.push(Number(lagNs) / 1e6); // ms
  lastTick = now;

  // Alternate between stream-event types the real pipeline actually emits,
  // matching onStreamEvent's real switch cases (tool-call/tool-result/step-finish/usage-update/text-delta)
  const kind = eventsSent % 5;
  if (kind === 0) {
    const id = String(++toolCallSeq);
    fakeManager.emit('stream-event', TASK_ID, {
      type: 'tool-call', toolName: 'Read', toolCallId: id, args: { path: `/tmp/f${id}.txt` },
    });
  } else if (kind === 1) {
    fakeManager.emit('stream-event', TASK_ID, {
      type: 'tool-result', toolCallId: String(toolCallSeq), toolName: 'Read', durationMs: 5, result: 'ok',
    });
  } else if (kind === 2) {
    fakeManager.emit('stream-event', TASK_ID, {
      type: 'step-finish', stepNumber: eventsSent,
      usage: { promptTokens: eventsSent * 10, completionTokens: eventsSent * 2, totalTokens: eventsSent * 12 },
    });
  } else if (kind === 3) {
    fakeManager.emit('stream-event', TASK_ID, { type: 'text-delta' });
  } else {
    fakeManager.emit('execution-progress', TASK_ID, { phase: 'coding', message: `progress ${eventsSent}` });
  }
  eventsSent++;
}

const timer = setInterval(() => {
  const elapsedMs = Number(process.hrtime.bigint() - startWall) / 1e6;
  if (elapsedMs >= DURATION_MS) {
    clearInterval(timer);
    finish();
    return;
  }
  emitOneEvent();
}, INTERVAL_MS);

function finish() {
  // Allow final 16ms coalescing tick to flush
  setTimeout(() => {
    const elapsedSec = Number(process.hrtime.bigint() - startWall) / 1e9;
    const actualRate = eventsSent / elapsedSec;
    const maxLag = Math.max(...loopLagSamples);
    const avgLag = loopLagSamples.reduce((a, b) => a + b, 0) / loopLagSamples.length;
    const stalls = loopLagSamples.filter((l) => l > 50).length; // >50ms = a stall a human would notice

    const finalAgents = svc.getAgents();
    const finalTrace = svc.getTrace();

    const report = {
      criterion: 'P3.5.13',
      eventsSent,
      elapsedSec: Number(elapsedSec.toFixed(3)),
      actualEventsPerSec: Number(actualRate.toFixed(2)),
      snapshotCount,
      coalescingRatio: Number((eventsSent / Math.max(snapshotCount, 1)).toFixed(2)),
      expectedMaxSnapshotsAt16ms: Math.ceil((elapsedSec * 1000) / 16),
      maxEventLoopLagMs: Number(maxLag.toFixed(2)),
      avgEventLoopLagMs: Number(avgLag.toFixed(2)),
      stallsOver50ms: stalls,
      finalAgentCount: finalAgents.length,
      finalTraceLength: finalTrace.length,
      finalAgentSnapshot: finalAgents[0] ? {
        stepsExecuted: finalAgents[0].stepsExecuted,
        totalTokens: finalAgents[0].usage.totalTokens,
        phase: finalAgents[0].phase,
      } : null,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }, 100);
}
