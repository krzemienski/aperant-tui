/**
 * Roadmap convert service — converts a roadmap feature into a task spec on
 * disk, a faithful port of the vendored ROADMAP_CONVERT_TO_SPEC handler
 * (ipc-handlers/roadmap-handlers.ts:467). The TUI runs in-process with no
 * IPC, so the handler body is reproduced here against the same contract:
 *   - file-lock the roadmap
 *   - next spec number NNN + slugified title
 *   - write implementation_plan.json / requirements.json / spec.md /
 *     task_metadata.json (sourceType: roadmap, featureId)
 *   - feature → status 'planned', linked_spec_id set; roadmap
 *     metadata.updated_at bumped
 * No auto-start: the task waits on the board for an explicit `s`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { Project } from '@shared/types';
import { getSpecsDir } from '@shared/constants';

export interface ConvertResult {
  ok: true;
  specId: string;
  specDir: string;
  title: string;
}
export type ConvertOutcome = ConvertResult | { ok: false; reason: string };

interface RoadmapFeatureRaw {
  id: string;
  title: string;
  description?: string;
  rationale?: string;
  user_stories?: string[];
  acceptance_criteria?: string[];
  status?: string;
  linked_spec_id?: string;
}
interface RoadmapRaw {
  features?: RoadmapFeatureRaw[];
  metadata?: { updated_at?: string } & Record<string, unknown>;
}

/** Atomic write: temp file + rename (matches vendored writeFileWithRetry semantics). */
function atomicWrite(file: string, data: string): void {
  const tmp = file + '.tmp-' + Date.now();
  writeFileSync(tmp, data, 'utf-8');
  renameSync(tmp, file);
}

export function convertFeatureToSpec(project: Project, featureId: string): ConvertOutcome {
  const roadmapDir = path.join(project.path, '.auto-claude', 'roadmap');
  const roadmapPath = path.join(roadmapDir, 'roadmap.json');
  if (!existsSync(roadmapPath)) return { ok: false, reason: 'no roadmap — generate one first (g)' };

  let roadmap: RoadmapRaw;
  try {
    roadmap = JSON.parse(readFileSync(roadmapPath, 'utf-8')) as RoadmapRaw;
  } catch (err) {
    return { ok: false, reason: `malformed roadmap.json: ${(err as Error).message}` };
  }

  const feature = roadmap.features?.find((f) => f.id === featureId);
  if (!feature) return { ok: false, reason: `feature ${featureId} not found` };
  if (feature.linked_spec_id && existsSync(path.join(project.path, getSpecsDir(project.autoBuildPath), feature.linked_spec_id))) {
    return { ok: false, reason: `already linked to ${feature.linked_spec_id}` };
  }

  const taskDescription = `# ${feature.title}\n\n${feature.description ?? ''}\n\n## Rationale\n${feature.rationale || 'N/A'}\n\n## User Stories\n${(feature.user_stories ?? []).map((s) => `- ${s}`).join('\n') || 'N/A'}\n\n## Acceptance Criteria\n${(feature.acceptance_criteria ?? []).map((c) => `- [ ] ${c}`).join('\n') || 'N/A'}\n`;

  const specsRel = getSpecsDir(project.autoBuildPath);
  const specsDir = path.join(project.path, specsRel);
  if (!existsSync(specsDir)) mkdirSync(specsDir, { recursive: true });

  const existing = existsSync(specsDir)
    ? readdirSync(specsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
  // `RegExp.$1` is process-global mutable state: any regex evaluated between
  // the `exec()` and the read clobbers it, yielding NaN here and a spec dir
  // literally named `NaN-<slug>`. Capture from the match object instead.
  const numbers = existing
    .map((n) => {
      const match = /^(\d+)/.exec(n);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  const specNumber = numbers.length ? Math.max(...numbers) + 1 : 1;

  const slug = feature.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const specId = `${String(specNumber).padStart(3, '0')}-${slug || 'feature'}`;
  const specDir = path.join(specsDir, specId);
  mkdirSync(specDir, { recursive: true });

  const now = new Date().toISOString();
  // VENDORED-CONTRACT NOTE (found by the Phase 4 gate): build-orchestrator's
  // isFirstRun() treats a merely-EXISTING implementation_plan.json as "already
  // planned", then fails validation on `phases: []`. The desktop handler wrote
  // the same empty placeholder — so a roadmap-converted task could never start
  // on either surface. We skip the placeholder entirely: spec.md + task
  // metadata route the start through the planner phase, which writes the real
  // implementation_plan.json with populated phases/subtasks.
  // (No implementation_plan.json placeholder is written — see note above.)
  atomicWrite(path.join(specDir, 'requirements.json'), JSON.stringify({
    task_description: taskDescription, workflow_type: 'feature',
  }, null, 2));
  atomicWrite(path.join(specDir, 'spec.md'), taskDescription);
  atomicWrite(path.join(specDir, 'task_metadata.json'), JSON.stringify({
    sourceType: 'roadmap', featureId: feature.id, category: 'feature',
  }, null, 2));

  feature.status = 'planned';
  feature.linked_spec_id = specId;
  roadmap.metadata = roadmap.metadata ?? {};
  roadmap.metadata.updated_at = now;
  atomicWrite(roadmapPath, JSON.stringify(roadmap, null, 2));

  return { ok: true, specId, specDir, title: feature.title };
}
