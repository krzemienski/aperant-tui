/** Theme definitions — five flat-black, accent-driven themes (spec Part 5). */

export interface Theme {
  name: string;
  bg: string; panel: string; panelAlt: string;
  border: string; borderFocus: string;
  text: string; dim: string; faint: string;
  accent: string; accent2: string;
  ok: string; err: string; warn: string; info: string;
}

export const THEMES: Record<string, Theme> = {
  cyberpunk: {
    name: 'cyberpunk',
    bg: '#050507', panel: '#0B0B10', panelAlt: '#101018',
    border: '#23232E', borderFocus: '#FF6B35',
    text: '#E8E8F0', dim: '#8A8A9A', faint: '#4A4A58',
    accent: '#FF6B35', accent2: '#FF3E8A',
    ok: '#3DDC84', err: '#FF4444', warn: '#FFB000', info: '#38BDF8',
  },
  matrix: {
    name: 'matrix',
    bg: '#030503', panel: '#071007', panelAlt: '#0A180A',
    border: '#1A2E1A', borderFocus: '#00FF41',
    text: '#D8FFD8', dim: '#6FAF6F', faint: '#3A5A3A',
    accent: '#00FF41', accent2: '#7CFC00',
    ok: '#00FF41', err: '#FF3355', warn: '#CFFF04', info: '#00F0FF',
  },
  amber: {
    name: 'amber',
    bg: '#060402', panel: '#0E0A04', panelAlt: '#141006',
    border: '#2E2410', borderFocus: '#FFB000',
    text: '#F5EAD0', dim: '#A89058', faint: '#5A4A28',
    accent: '#FFB000', accent2: '#FF7B00',
    ok: '#9ACD32', err: '#FF5533', warn: '#FFB000', info: '#FFD75F',
  },
  synth: {
    name: 'synth',
    bg: '#050308', panel: '#0C0712', panelAlt: '#120A1C',
    border: '#2A1A3E', borderFocus: '#B24BF3',
    text: '#EDE4F8', dim: '#9A7FBB', faint: '#4E3A66',
    accent: '#B24BF3', accent2: '#00F0FF',
    ok: '#3DDC84', err: '#FF3E6C', warn: '#FFB000', info: '#00F0FF',
  },
  ice: {
    name: 'ice',
    bg: '#020509', panel: '#060C14', panelAlt: '#0A1220',
    border: '#16283E', borderFocus: '#38BDF8',
    text: '#DCECF8', dim: '#6E93B5', faint: '#38506A',
    accent: '#38BDF8', accent2: '#2DD4BF',
    ok: '#34D399', err: '#F87171', warn: '#FBBF24', info: '#38BDF8',
  },
};

export const THEME_NAMES = Object.keys(THEMES);
export const DEFAULT_THEME = 'cyberpunk';
