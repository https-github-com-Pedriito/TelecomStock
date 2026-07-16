import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700', '800'] });

export const COLORS = {
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  purple: '#7c3aed',
  ink: '#0f172a',
  slate: '#334155',
  white: '#ffffff',
  cloud: '#f8fafc',
};

export const GRADIENT = `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.purple} 100%)`;

export const FONT_FAMILY = fontFamily;
