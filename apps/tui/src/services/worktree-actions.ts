/**
 * Worktree actions — real git merge, real `gh pr create`, and AI conflict
 * resolution for Phase 5 of WorktreeView.
 *
 * All git mutations run scoped to the caller-supplied project/worktree path
 * (never a hardcoded or ambient cwd) and never touch history destructively:
 * no `--force`, no `reset --hard`, no `clean`, no branch deletion. Merge and
 * PR creation are only ever invoked from an explicit user keypress in
 * WorktreeView — nothing here runs on mount, on selection change, or as a
 * side effect of anything else.
 *
 * AI conflict resolution reuses the vendored `resolveMergeConflict` runner
 * (apps/desktop/src/main/ai/runners/merge-resolver.ts) for its client/auth
 * plumbing rather than reimplementing an AI SDK call — see D-notes below.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyAccountEnv } from './agent-start-service';
import { resolveMergeConflict } from '@main/ai/runners/merge-resolver';

// ---------------------------------------------------------------------------
// git subprocess helper
// ---------------------------------------------------------------------------

interface GitRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

/** Run a git sub-command in `cwd`; never throws — failures come back as `ok: false` with the real stderr/stdout. */
function runGit(args: string[], cwd: string): GitRunResult {
  try {
    const stdout = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout, stderr: '' };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      ok: false,
      stdout: e.stdout !== undefined ? String(e.stdout) : '',
      stderr: e.stderr !== undefined ? String(e.stderr) : (err instanceof Error ? err.message : String(err)),
    };
  }
}

// ---------------------------------------------------------------------------
// Unified diff
// ---------------------------------------------------------------------------

export interface DiffResult {
  text: string;
  error: string | null;
}

/** Real `git diff HEAD` for the given worktree — the honest replacement for the old "arrives in Phase 5" placeholder. */
export function getWorktreeDiff(treePath: string): DiffResult {
  const r = runGit(['diff', 'HEAD'], treePath);
  if (!r.ok) {
    return { text: '', error: (r.stderr || r.stdout || 'git diff failed').trim() };
  }
  return { text: r.stdout.length > 0 ? r.stdout : '(clean — no changes against HEAD)', error: null };
}

// ---------------------------------------------------------------------------
// Conflicted-file listing
// ---------------------------------------------------------------------------

/** Paths with unmerged index entries (stage 1/2/3) — real conflict state, not an approximation. */
export function getConflictedFiles(projectPath: string): string[] {
  const r = runGit(['diff', '--name-only', '--diff-filter=U'], projectPath);
  if (!r.ok) return [];
  return r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export interface MergeOutcome {
  ok: boolean;
  conflict: boolean;
  conflictedFiles: string[];
  targetBranch: string;
  message: string;
}

/**
 * Merge `branch` into the CURRENT branch of the main project repo at
 * `projectPath` (never the worktree — a worktree merging into itself makes
 * no sense; the destination is always the project's checked-out branch).
 *
 * Safety guards (explicit, before any mutation):
 *  - refuses a detached-HEAD worktree (no branch to merge)
 *  - refuses merging a branch into itself
 *  - refuses if the main repo has uncommitted changes that a merge could
 *    clobber
 * On success: real `git merge --no-ff --no-edit <branch>` — always produces
 * a merge commit, so `git log` on the target branch is a real, verifiable
 * record of what happened (never a silent fast-forward the user can't see).
 * On conflict: does NOT swallow it — returns the conflict state and the
 * real list of unmerged files so the caller can offer AI resolution.
 */
export function mergeWorktreeBranch(projectPath: string, branch: string): MergeOutcome {
  if (!branch) {
    return { ok: false, conflict: false, conflictedFiles: [], targetBranch: '', message: 'cannot merge: selected worktree is detached (no branch)' };
  }

  const currentBranchResult = runGit(['branch', '--show-current'], projectPath);
  const targetBranch = currentBranchResult.ok ? currentBranchResult.stdout.trim() : '';
  if (!targetBranch) {
    return { ok: false, conflict: false, conflictedFiles: [], targetBranch: '', message: 'cannot merge: project repo HEAD is detached or unreadable' };
  }

  if (branch === targetBranch) {
    return { ok: false, conflict: false, conflictedFiles: [], targetBranch, message: `refusing to merge "${branch}" into itself` };
  }

  const status = runGit(['status', '--porcelain'], projectPath);
  if (status.ok && status.stdout.trim().length > 0) {
    return {
      ok: false,
      conflict: false,
      conflictedFiles: [],
      targetBranch,
      message: `refusing to merge: "${targetBranch}" has uncommitted changes that would be clobbered — commit or stash first`,
    };
  }

  const merge = runGit(['merge', '--no-ff', '--no-edit', branch], projectPath);
  if (merge.ok) {
    return { ok: true, conflict: false, conflictedFiles: [], targetBranch, message: merge.stdout.trim() || `merged "${branch}" into "${targetBranch}"` };
  }

  const conflictedFiles = getConflictedFiles(projectPath);
  if (conflictedFiles.length > 0) {
    return {
      ok: false,
      conflict: true,
      conflictedFiles,
      targetBranch,
      message: `merge conflict in ${conflictedFiles.length} file(s): ${conflictedFiles.join(', ')}`,
    };
  }

  return { ok: false, conflict: false, conflictedFiles: [], targetBranch, message: (merge.stderr || merge.stdout || 'git merge failed').trim() };
}

// ---------------------------------------------------------------------------
// PR creation
// ---------------------------------------------------------------------------

export interface PRCreateOutcome {
  ok: boolean;
  url: string | null;
  message: string;
}

function ghAvailable(): boolean {
  try {
    execFileSync('gh', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Push `branch` (from the worktree it actually lives in) and create a PR
 * with `gh pr create --fill` (title/body derived from real commits — no
 * fabricated content). Detects a missing `gh` CLI honestly instead of
 * pretending the feature works.
 *
 * Pushing is REQUIRED here — a PR cannot exist without a remote branch —
 * unlike agent-start-service's task-start path (D23), which deliberately
 * keeps task branches local so starting an agent never silently publishes.
 * Pressing `p` is a distinct, explicit user act; publishing here is the
 * whole point of the action, not a side effect of it.
 */
export async function createWorktreePR(projectPath: string, treePath: string, branch: string): Promise<PRCreateOutcome> {
  if (!branch) {
    return { ok: false, url: null, message: 'cannot open a PR for a detached worktree (no branch)' };
  }
  if (!ghAvailable()) {
    return { ok: false, url: null, message: 'gh CLI not found on PATH — install from https://cli.github.com to create PRs from the TUI' };
  }

  const push = runGit(['push', '--set-upstream', 'origin', branch], treePath);
  if (!push.ok) {
    const upToDate = /up.to.date/i.test(push.stderr) || /up.to.date/i.test(push.stdout);
    if (!upToDate) {
      return { ok: false, url: null, message: `push failed: ${(push.stderr || push.stdout || 'unknown error').trim()}` };
    }
  }

  const baseResult = runGit(['branch', '--show-current'], projectPath);
  const base = baseResult.ok ? baseResult.stdout.trim() : '';
  const args = ['pr', 'create', '--head', branch, '--fill'];
  if (base) args.push('--base', base);

  try {
    const out = execFileSync('gh', args, { cwd: projectPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const match = out.match(/https:\/\/\S+\/pull\/\d+/);
    const url = match ? match[0] : (out.startsWith('http') ? out : null);
    return { ok: true, url, message: url ? `PR created: ${url}` : `gh pr create succeeded: ${out}` };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: Buffer | string; stderr?: Buffer | string };
    const stderr = e.stderr !== undefined ? String(e.stderr) : '';
    const stdout = e.stdout !== undefined ? String(e.stdout) : '';

    if (/already exists/i.test(stderr) || /already exists/i.test(stdout)) {
      try {
        const view = execFileSync('gh', ['pr', 'view', branch, '--json', 'url', '--jq', '.url'], {
          cwd: projectPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
        return { ok: true, url: view || null, message: view ? `PR already exists: ${view}` : 'PR already exists' };
      } catch {
        return { ok: true, url: null, message: 'PR already exists (URL lookup failed)' };
      }
    }

    const msg = (stderr || stdout || (err instanceof Error ? err.message : String(err))).trim();
    return { ok: false, url: null, message: `gh pr create failed: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// AI conflict resolution
// ---------------------------------------------------------------------------

export interface ResolveOutcome {
  ok: boolean;
  filesResolved: string[];
  filesFailed: string[];
  message: string;
}

const CONFLICT_MARKER_RE = /^<{7} |^={7}$|^>{7} /m;

/** AI responses sometimes wrap output in a markdown code fence despite instructions — strip it if present. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

const RESOLVER_SYSTEM_PROMPT =
  'You are an expert software engineer resolving a real git merge conflict. ' +
  'You will be given the full contents of one file with git conflict markers ' +
  '(<<<<<<<, =======, >>>>>>>). Produce the fully resolved file content that ' +
  'preserves the intended functionality from both sides of the conflict. ' +
  'Output ONLY the raw resolved file content — no markdown code fences, no ' +
  'explanation, and no conflict markers of any kind.';

/**
 * Resolve every currently-conflicted file (real git merge conflict, not a
 * simulation) using the vendored merge-resolver AI runner
 * (apps/desktop/src/main/ai/runners/merge-resolver.ts:resolveMergeConflict —
 * PREFERRED over hand-rolling a generateText() call: it owns the
 * createSimpleClient() model/auth resolution, so this file never touches
 * API keys directly).
 *
 * Routes through the SAME shared auth path every other AI entry point in
 * this app uses: `applyAccountEnv()` mirrors the provisioned account into
 * the standard ANTHROPIC_* env names the AI SDK reads (see
 * agent-start-service.ts D19/D-C) before any model call.
 *
 * Writes resolved content back to disk but deliberately does NOT `git add`
 * or commit: git's index still carries unmerged (stage 1/2/3) entries for
 * every touched file until the user stages them, so `getConflictedFiles()`
 * — and the merge/conflict UI — continue to report the real, unresolved-
 * in-git state even after the file content itself has been fixed. That is
 * the intended "staged for human review, not auto-committed" behavior.
 */
export async function resolveConflictsWithAI(projectPath: string): Promise<ResolveOutcome> {
  const files = getConflictedFiles(projectPath);
  if (files.length === 0) {
    return { ok: false, filesResolved: [], filesFailed: [], message: 'no merge conflict present — nothing to resolve' };
  }

  // D-C: mirror the provisioned account into the standard SDK env names
  // before the resolver resolves auth — see agent-start-service.applyAccountEnv.
  applyAccountEnv();

  const filesResolved: string[] = [];
  const filesFailed: string[] = [];

  for (const rel of files) {
    const abs = path.join(projectPath, rel);
    let original: string;
    try {
      original = readFileSync(abs, 'utf8');
    } catch (err) {
      filesFailed.push(`${rel} (unreadable: ${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    if (!CONFLICT_MARKER_RE.test(original)) {
      // Already resolved (e.g. re-run after a partial success) or a binary
      // conflict git doesn't mark with textual markers — not a failure.
      continue;
    }

    // eslint-disable-next-line no-await-in-loop -- files are resolved
    // sequentially so failures on one file don't abandon later ones and the
    // AI account isn't hammered with a burst of concurrent calls.
    const result = await resolveMergeConflict({
      systemPrompt: RESOLVER_SYSTEM_PROMPT,
      userPrompt: `File: ${rel}\n\n${original}`,
      modelShorthand: 'sonnet',
      thinkingLevel: 'medium',
    });

    if (!result.success || !result.text.trim()) {
      filesFailed.push(`${rel} (${result.error || 'empty AI response'})`);
      continue;
    }

    const resolved = stripCodeFence(result.text);
    if (resolved.trim().length === 0 || CONFLICT_MARKER_RE.test(resolved)) {
      filesFailed.push(`${rel} (AI output still contains conflict markers or was empty — left untouched)`);
      continue;
    }

    try {
      writeFileSync(abs, resolved, 'utf8');
      filesResolved.push(rel);
    } catch (err) {
      filesFailed.push(`${rel} (write failed: ${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const ok = filesResolved.length > 0 && filesFailed.length === 0;
  const message = filesFailed.length === 0
    ? `AI resolved ${filesResolved.length} file(s) — NOT committed: review in the diff pane, then \`git add\` / \`git commit\` yourself`
    : `AI resolved ${filesResolved.length} file(s), failed on ${filesFailed.length}: ${filesFailed.join('; ')}`;

  return { ok, filesResolved, filesFailed, message };
}
