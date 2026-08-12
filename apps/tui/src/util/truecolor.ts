/**
 * Color-capability detection and deterministic palette quantization.
 * Three tiers per spec Part 5: truecolor -> xterm-256 -> ANSI-16.
 */

export type ColorTier = 'truecolor' | '256' | '16';

export function detectColorTier(env: NodeJS.ProcessEnv = process.env): ColorTier {
  const ct = (env.COLORTERM || '').toLowerCase();
  if (ct === 'truecolor' || ct === '24bit') return 'truecolor';
  const term = env.TERM || '';
  if (/256color/.test(term)) return '256';
  if (/(kitty|wezterm|alacritty|ghostty|foot)/.test(term) && ct !== '') return 'truecolor';
  return '16';
}

/** xterm-256 palette hex for indices 16..255 (color cube + grayscale). */
export function xterm256Hex(index: number): string {
  if (index < 16) return ANSI16_HEX[index];
  if (index < 232) {
    const i = index - 16;
    const r = Math.floor(i / 36), g = Math.floor((i % 36) / 6), b = i % 6;
    const lv = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return '#' + [lv(r), lv(g), lv(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const v = 8 + (index - 232) * 10;
  return '#' + [v, v, v].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const ANSI16_HEX = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
  '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
];

export const ANSI16_NAMES = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'gray', 'redBright', 'greenBright', 'yellowBright', 'blueBright', 'magentaBright', 'cyanBright', 'whiteBright',
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function dist2(a: [number, number, number], b: [number, number, number]): number {
  // Weighted euclidean — perceptually closer than plain RGB distance.
  const rMean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

/** Nearest xterm-256 index for a hex color (searches full 0..255 palette). */
export function quantizeTo256(hex: string): number {
  const rgb = hexToRgb(hex);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < 256; i++) {
    const d = dist2(rgb, hexToRgb(xterm256Hex(i)));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Nearest ANSI-16 name for a hex color. */
export function quantizeTo16(hex: string): string {
  const rgb = hexToRgb(hex);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < 16; i++) {
    const d = dist2(rgb, hexToRgb(ANSI16_HEX[i]));
    if (d < bestD) { bestD = d; best = i; }
  }
  return ANSI16_NAMES[best];
}

/** Resolve a hex color for the active tier. Returns hex for truecolor/256 (snapped), ANSI name for 16. */
export function resolveColor(hex: string, tier: ColorTier): string {
  if (tier === 'truecolor') return hex;
  if (tier === '256') return xterm256Hex(quantizeTo256(hex));
  return quantizeTo16(hex);
}
