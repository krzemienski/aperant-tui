/**
 * InsightsView — codebase Q&A over the REAL vendored insights runner
 * (ai/runners/insights.runInsightsQuery) plus five-type ideation
 * (ai/runners/ideation.runIdeation). Phase 4.
 *
 * Keys: `a` ask (opens the question input) · type + ⏎ submits · `x` abort ·
 * `i` run ideation (all five types) · `1..5` select ideation type view ·
 * `q` back to Q&A. Answers stream token-by-token; ideation writes real
 * JSON per type under .auto-claude/ideation/ and renders findings.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '@shared/types';
import type { Theme } from '../theme/themes';
import { Panel } from '../components/Panel';
import TextInput from 'ink-text-input';
import { useKeymap } from '../hooks/useKeymap';
import { useAppStore } from '../stores/app-store';
import { runInsightsQuery } from '@main/ai/runners/insights';
import { runIdeation } from '@main/ai/runners/ideation';

interface ProjectIndex { files?: unknown[]; [k: string]: unknown; }

export function loadProjectIndex(project: Project): { index: ProjectIndex | null; path: string; error: string | null } {
  const p = path.join(project.path, '.auto-claude', 'project_index.json');
  if (!fs.existsSync(p)) return { index: null, path: p, error: null };
  try {
    return { index: JSON.parse(fs.readFileSync(p, 'utf8')) as ProjectIndex, path: p, error: null };
  } catch (err) {
    return { index: null, path: p, error: `malformed project_index.json: ${(err as Error).message}` };
  }
}

interface Props {
  theme: Theme;
  project: Project;
  isActive: boolean;
}

interface IdeationIdea { title?: string; description?: string; [k: string]: unknown; }
interface IdeationFile { ideas?: IdeationIdea[]; [k: string]: unknown; }

const IDEATION_TYPES = [
  // The vendored runner writes `<type>_ideas.json` with the findings under a
  // key named after the type (see ideation.ts runIdeation).
  { key: 'code_improvements', label: 'Code Improvements', file: 'code_improvements_ideas.json' },
  { key: 'ui_ux_improvements', label: 'UI/UX', file: 'ui_ux_improvements_ideas.json' },
  { key: 'documentation_gaps', label: 'Docs Gaps', file: 'documentation_gaps_ideas.json' },
  { key: 'security_hardening', label: 'Security', file: 'security_hardening_ideas.json' },
  { key: 'performance_optimizations', label: 'Performance', file: 'performance_optimizations_ideas.json' },
  { key: 'code_quality', label: 'Code Quality', file: 'code_quality_ideas.json' },
] as const;

const MAX_ANSWER_LINES = 14;

export function InsightsView({ theme: c, project, isActive }: Props) {
  const flash = useAppStore((s) => s.flash);
  const [mode, setMode] = useState<'qa' | 'ideation'>('qa');
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [ideationStatus, setIdeationStatus] = useState<string | null>(null);
  const [ideationSel, setIdeationSel] = useState(0);
  const [ideationReload, setIdeationReload] = useState(0);

  const { index, path: ip } = useMemo(() => loadProjectIndex(project), [project.path]);

  const ask = useCallback(async (q: string) => {
    setAnswer(''); setBusy(true);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      await runInsightsQuery(
        // D15: the default must be a SHORTHAND, not a full router id. A full id
        // ('cc/claude-opus-5') is passed to the queue verbatim, so when that
        // route dies upstream the view is stuck with no way to redirect it.
        // 'sonnet' resolves through resolveModelId, which honours
        // ANTHROPIC_DEFAULT_SONNET_MODEL (ai/config/phase-config.ts:80) — so an
        // operator can point it at any model their endpoint actually serves.
        { projectDir: project.path, message: q, abortSignal: ac.signal, modelShorthand: (process.env.APERANT_MODEL ?? 'sonnet') as never },
        (ev) => {
          if (ev.type === 'text-delta') setAnswer((a) => (a ?? '') + ev.text);
          else if (ev.type === 'error') setAnswer((a) => (a ?? '') + `\n[error] ${ev.error}`);
        },
      );
    } catch (e) {
      setAnswer((a) => (a ?? '') + `\n[error] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false); abortRef.current = null;
    }
  }, [project.path]);

  const runIdeationAll = useCallback(async () => {
    setIdeationStatus('starting…'); setBusy(true);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      // The vendored resolvePromptsDir relies on __dirname (CJS/Electron),
      // which does not exist under the TUI's tsx ESM runtime (D6 class).
      // Compute the same apps/desktop/prompts/ path ESM-safely instead.
      // From src/views/: apps/tui/src/views → apps/desktop/prompts (repo layout,
      // works under tsx dev AND from dist via the same upward repo hop).
      const promptsDir = path.resolve(
        path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
        '..', '..', '..', '..', 'apps', 'desktop', 'prompts',
      );
      if (!fs.existsSync(promptsDir)) {
        setIdeationStatus(`prompts dir missing: ${promptsDir}`);
        return;
      }
      const outputDir = path.join(project.path, '.auto-claude', 'ideation');
      for (const t of IDEATION_TYPES) {
        if (ac.signal.aborted) break;
        setIdeationStatus(`${t.label}…`);
        await runIdeation(
          // D15 (see ask()): shorthand default, redirectable via env.
          { projectDir: project.path, outputDir, promptsDir, ideationType: t.key, abortSignal: ac.signal, modelShorthand: (process.env.APERANT_MODEL ?? 'sonnet') as never },
          (ev) => { if (ev.type === 'text-delta') setIdeationStatus(`${t.label}… streaming`); },
        );
      }
      setIdeationStatus(null); setIdeationReload((k) => k + 1); setMode('ideation');
      flash('ideation complete — five types');
    } catch (e) {
      setIdeationStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); abortRef.current = null; }
  }, [project.path]);

  const stop = useCallback(() => { abortRef.current?.abort(); setBusy(false); }, []);

  useKeymap({
    a: () => { if (mode === 'qa' && !busy) { setAsking(true); setAnswer(null); } },
    i: () => { if (!busy) runIdeationAll(); },
    x: stop,
    q: () => setMode('qa'),
    // Digit keys switch to ideation mode AND select the type — the ideation
    // panel is the destination for both browsing findings and `i` runs.
    '1': () => { setMode('ideation'); setIdeationSel(0); },
    '2': () => { setMode('ideation'); setIdeationSel(1); },
    '3': () => { setMode('ideation'); setIdeationSel(2); },
    '4': () => { setMode('ideation'); setIdeationSel(3); },
    '5': () => { setMode('ideation'); setIdeationSel(4); },
    '6': () => { setMode('ideation'); setIdeationSel(5); },
  }, { isActive: isActive && !asking });

  useEffect(() => () => abortRef.current?.abort(), []);

  // D18: while the ask box is focused it owns the keyboard — the global
  // keymap must stand down or a typed '?' opens help and a typed ':' opens the
  // palette instead of entering the character. Cleared on unmount too, so
  // leaving the view mid-question can never strand the global keys off.
  useEffect(() => {
    useAppStore.getState().setTextInputActive(asking);
    return () => { useAppStore.getState().setTextInputActive(false); };
  }, [asking]);

  const ideationFile = useMemo(() => {
    if (mode !== 'ideation') return null;
    const f = path.join(project.path, '.auto-claude', 'ideation', IDEATION_TYPES[ideationSel].file);
    if (!fs.existsSync(f)) return null;
    try { return JSON.parse(fs.readFileSync(f, 'utf8')) as IdeationFile; } catch { return null; }
  }, [mode, ideationSel, ideationReload, project.path]);
  // findings live under a key named after the type; `ideas` is the legacy shape
  const ideationIdeas = useMemo(() => {
    if (!ideationFile) return [];
    const byType = (ideationFile as Record<string, unknown>)[IDEATION_TYPES[ideationSel].key];
    if (Array.isArray(byType)) return byType as IdeationIdea[];
    return Array.isArray(ideationFile.ideas) ? ideationFile.ideas : [];
  }, [ideationFile, ideationSel]);

  const answerLines = (answer ?? '').split('\n');

  return (
    <Panel title={mode === 'qa' ? 'INSIGHTS · codebase Q&A' : 'IDEATION · five types'} focused={isActive} theme={c} flexGrow={1}>
      <Box flexDirection="column" paddingY={0}>
        <Box gap={2}>
          <Text color={mode === 'qa' ? c.accent : c.faint}>[q] Q&A</Text>
          <Text color={mode === 'ideation' ? c.accent : c.faint}>[1-6] ideation types</Text>
          <Text color={c.faint}>· index {index ? `${Array.isArray(index.files) ? index.files.length : Object.keys(index).length} files` : 'absent'} {ip}</Text>
        </Box>

        {mode === 'qa' && (
          <Box flexDirection="column" marginTop={1}>
            {asking ? (
              <Box>
                <Text color={c.accent}>? </Text>
                <TextInput value={question} onChange={setQuestion}
                  onSubmit={(v) => { const q = v.trim(); setAsking(false); setQuestion(''); if (q) ask(q); }} />
              </Box>
            ) : (
              <Text color={c.faint}>a — ask about this codebase {busy ? '· streaming… x abort' : ''}</Text>
            )}
            {answer !== null && (
              <Box flexDirection="column" marginTop={1}>
                {answerLines.slice(-MAX_ANSWER_LINES).map((l, i) => (
                  <Text key={i} color={c.dim} wrap="truncate-end">{l.length > 104 ? l.slice(0, 104) : l}</Text>
                ))}
                {busy ? <Text color={c.accent}>▌</Text> : null}
              </Box>
            )}
          </Box>
        )}

        {mode === 'ideation' && (
          <Box flexDirection="column" marginTop={1}>
            <Box gap={1}>
              {IDEATION_TYPES.map((t, i) => (
                <Text key={t.key} color={i === ideationSel ? c.accent : c.faint}>{i + 1} {t.label}</Text>
              ))}
            </Box>
            {ideationStatus ? <Text color={c.accent}>{ideationStatus}</Text> : null}
            {ideationIdeas.length ? (
              ideationIdeas.slice(0, 6).map((idea, i) => (
                <Box key={i} flexDirection="column" marginTop={i ? 1 : 0}>
                  <Text color={c.text} wrap="truncate-end">· {idea.title ?? `idea ${i + 1}`}</Text>
                  {idea.description ? (
                    <Text color={c.dim} wrap="truncate-end">
                      {'  '}{String(idea.description).slice(0, 100)}
                    </Text>
                  ) : null}
                </Box>
              ))
            ) : (
              <Text color={c.faint}>no findings for this type yet — i generates all five</Text>
            )}
          </Box>
        )}
      </Box>
    </Panel>
  );
}
