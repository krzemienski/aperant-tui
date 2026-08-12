/** Resolve a full Theme for a color tier so degradation is designed, not muddy. */
import { THEMES, type Theme } from './themes';
import { resolveColor, type ColorTier } from '../util/truecolor';

const COLOR_KEYS: Array<keyof Omit<Theme, 'name'>> = [
  'bg', 'panel', 'panelAlt', 'border', 'borderFocus',
  'text', 'dim', 'faint', 'accent', 'accent2',
  'ok', 'err', 'warn', 'info',
];

export function resolveTheme(name: string, tier: ColorTier): Theme {
  const base = THEMES[name] ?? THEMES.cyberpunk;
  if (tier === 'truecolor') return base;
  const out: Record<string, string> = { name: base.name };
  for (const k of COLOR_KEYS) out[k] = resolveColor(base[k], tier);
  return out as unknown as Theme;
}
