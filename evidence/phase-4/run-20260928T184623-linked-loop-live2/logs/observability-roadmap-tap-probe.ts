// Drives the REAL ObservabilityService against a REAL EventEmitter — the same
// .on(event, cb) surface attachToManager() consumes in production.
import { EventEmitter } from 'node:events';
import { ObservabilityService } from '/Users/nick/dev/aperant-tui/apps/tui/src/services/observability';

const am = new EventEmitter();
const obs = new ObservabilityService();
obs.attachToManager(am as never);
const P = 'proj-vigil';

am.emit('roadmap-progress', P, { phase: 'discovery', progress: 30, message: 'Running discovery phase...' });
am.emit('roadmap-log', P, 'Running discovery phase...');
am.emit('roadmap-log', P, "I'll start by exploring the project structure.");
am.emit('roadmap-log', P, 'Tool: Read\n');
am.emit('roadmap-log', P, 'Tool: Bash\n');
am.emit('roadmap-log', P, 'Phase discovery completed');
am.emit('roadmap-log', P, 'Starting agent session: type=roadmap, model=cc/claude-opus-5');
am.emit('roadmap-log', P, '   \n');

const trace = obs.getTrace(P);
const agent = obs.getAgents().find((a) => a.id === P)!;
console.log(JSON.stringify({
  traceRows: trace.length,
  types: trace.map((e) => e.type),
  tools: trace.filter((e) => e.type === 'tool-call').map((e) => e.tool),
  stepsExecuted: agent.stepsExecuted,
  waiting: agent.waiting,
  state: agent.state,
  model: agent.model,
}, null, 2));
