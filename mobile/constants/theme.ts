/**
 * AASPAAS themes — crafted for calm hyperlocal travel.
 *
 * Switch with `activeTheme`:
 * - 'daylight' → outdoor-ready mint paper (default)
 * - 'pulse'    → deep teal night
 */

export type ThemeId = 'daylight' | 'pulse';

/** Flip this to try the other look */
export const activeTheme: ThemeId = 'daylight';

const pulse = {
  bg: '#032824',
  bgElevated: '#0A3D37',
  bgSoft: '#0F4A43',
  surface: '#14524A',
  surfaceRaised: 'rgba(244, 240, 230, 0.06)',
  border: 'rgba(244, 240, 230, 0.12)',
  borderStrong: 'rgba(244, 240, 230, 0.22)',
  text: '#FFFAF3',
  textMuted: 'rgba(255, 250, 243, 0.72)',
  textDim: 'rgba(255, 250, 243, 0.45)',
  primary: '#0F766E',
  primarySoft: 'rgba(15, 118, 110, 0.28)',
  mint: '#5EEAD4',
  mintSoft: 'rgba(94, 234, 212, 0.14)',
  accent: '#EA580C',
  accentBright: '#F97316',
  accentSoft: 'rgba(234, 88, 12, 0.18)',
  gold: '#F0C75E',
  goldSoft: 'rgba(240, 199, 94, 0.16)',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  white: '#FFFFFF',
  black: '#000000',
  cream: 'rgba(255, 248, 240, 0.08)',
  overlay: 'rgba(3, 40, 36, 0.78)',
  tabBar: '#021F1C',
  statusBar: 'light' as const,
  gradient: ['#0A3D37', '#032824', '#021F1C'] as [string, string, string],
  mistGradient: ['#0A3D37', '#032824', '#021F1C'] as [string, string, string],
  orbAccent: 'rgba(234, 88, 12, 0.1)',
  orbTeal: 'rgba(15, 118, 110, 0.22)',
  ink: '#FFFAF3',
  paper: '#032824',
  hairline: 'rgba(244, 240, 230, 0.1)',
  sun: 'rgba(240, 199, 94, 0.12)',
  dusk: 'rgba(15, 118, 110, 0.2)',
};

/**
 * Daylight — cool mint paper, deep teal type, sunset only for actions.
 * Intentionally not “cream + serif travel brochure.”
 */
const daylight = {
  bg: '#EEF5F2',
  bgElevated: '#FFFFFF',
  bgSoft: '#DCEBE6',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: 'rgba(4, 47, 42, 0.08)',
  borderStrong: 'rgba(4, 47, 42, 0.14)',
  text: '#042F2A',
  textMuted: 'rgba(4, 47, 42, 0.64)',
  textDim: 'rgba(4, 47, 42, 0.4)',
  primary: '#0B6E71',
  primarySoft: 'rgba(11, 110, 113, 0.12)',
  mint: '#2A9D8F',
  mintSoft: 'rgba(42, 157, 143, 0.14)',
  accent: '#E85D04',
  accentBright: '#C2410C',
  accentSoft: 'rgba(232, 93, 4, 0.12)',
  gold: '#C9A227',
  goldSoft: 'rgba(201, 162, 39, 0.14)',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
  white: '#FFFFFF',
  black: '#000000',
  cream: '#FBF6EE',
  sun: '#FFE8D1',
  dusk: '#E8F4F1',
  overlay: 'rgba(4, 47, 42, 0.45)',
  tabBar: '#FFFFFF',
  statusBar: 'dark' as const,
  gradient: ['#FFF6EC', '#EEF5F2', '#DCEBE6'] as [string, string, string],
  mistGradient: ['#FFF8F0', '#EEF5F2', '#E3F0EC'] as [string, string, string],
  orbAccent: 'rgba(232, 93, 4, 0.14)',
  orbTeal: 'rgba(11, 110, 113, 0.14)',
  ink: '#042F2A',
  paper: '#EEF5F2',
  hairline: 'rgba(4, 47, 42, 0.08)',
};

export const themes = { pulse, daylight } as const;

export const colors = themes[activeTheme];

/** 4pt base rhythm */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const hit = {
  min: 44,
  comfortable: 52,
  gap: 8,
};

export const fonts = {
  display: 'DMSans_700Bold',
  displayMedium: 'DMSans_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  /** Story / city headlines — Literata */
  serif: 'Literata_600SemiBold',
  serifBold: 'Literata_700Bold',
};

export const type = {
  hero: { fontSize: 40, lineHeight: 46, letterSpacing: -1.1 },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  titleSm: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodySm: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
};

export const motion = {
  fast: 160,
  base: 260,
  slow: 480,
  entrance: 640,
};

export const elevation = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: '#042F2A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
};
