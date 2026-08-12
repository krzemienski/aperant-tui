/**
 * Project service — thin wrapper over @main/project-store (the same functions
 * ipc-handlers/project-handlers.ts wraps), called directly: no IPC.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { projectStore } from '@main/project-store';
import type { Project } from '@shared/types';

export interface OpenedProject {
  project: Project;
  branch: string;
  isGitRepo: boolean;
}

export class ProjectError extends Error {}

export function isGitRepo(dir: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

export function getBranch(dir: string): string {
  try {
    const b = execFileSync('git', ['branch', '--show-current'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (b) return b;
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    return `detached@${sha}`;
  } catch {
    return 'not-a-git-repo';
  }
}

/** Open (or re-open) a project directory: register it in the REAL project store. */
export function openProject(dir: string, name?: string): OpenedProject {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new ProjectError(`project path does not exist or is not a directory: ${abs}`);
  }
  const git = isGitRepo(abs);
  const existing = projectStore.getProjects().find((p) => path.resolve(p.path) === abs);
  const project = existing ?? projectStore.addProject(abs, name ?? path.basename(abs));
  return { project, branch: git ? getBranch(abs) : 'not-a-git-repo', isGitRepo: git };
}

export function listProjects(): Project[] {
  return projectStore.getProjects();
}

export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string;
  bare: boolean;
  detached: boolean;
}

/** Real `git worktree list --porcelain` parse. */
export function listWorktrees(dir: string): WorktreeInfo[] {
  let out: string;
  try {
    out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return [];
  }
  const trees: WorktreeInfo[] = [];
  let cur: Partial<WorktreeInfo> = {};
  const push = () => {
    if (cur.path) trees.push({ path: cur.path, head: cur.head ?? '', branch: cur.branch ?? '', bare: !!cur.bare, detached: !!cur.detached });
    cur = {};
  };
  for (const line of out.split('\n')) {
    if (line === '') { push(); continue; }
    if (line.startsWith('worktree ')) cur.path = line.slice(9);
    else if (line.startsWith('HEAD ')) cur.head = line.slice(5);
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace('refs/heads/', '');
    else if (line === 'bare') cur.bare = true;
    else if (line === 'detached') cur.detached = true;
  }
  push();
  return trees;
}
