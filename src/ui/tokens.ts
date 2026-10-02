/**
 * Campusly design tokens — the single source of truth for the redesigned UI.
 *
 * Rules of the system
 * ───────────────────
 * 1. Screens never hard-code colours, radii or font names. They read them from
 *    `useAppTheme()` (colours/shadows) or from the constants below.
 * 2. `brand` is the ONLY colour an institution may override later (the spec
 *    allows one accessibility-safe accent per institution). Everything else is
 *    platform-owned, so every tenant keeps the same skeleton.
 * 3. Every text/background pair used by the system meets WCAG AA (4.5:1) —
 *    checked when these values were chosen. Placeholders use 3:1+.
 *
 * Neutrals are deliberately violet-tinted so surfaces, borders and text feel
 * like one family with the brand colour instead of "grey + purple".
 */
import type { ViewStyle } from 'react-native';
import type { FontWeight } from './fonts';

/* ──────────────────────────── Raw palette ──────────────────────────── */

export const palette = {
  violet: {
    50: '#F7F5FF',
    100: '#EEEAFF',
    200: '#DDD5FF',
    300: '#C2B4FB',
    400: '#A08AF5',
    500: '#7F63EA',
    600: '#5B3FD1', // ← Campusly brand
    700: '#4A31AE',
    800: '#3A2788',
    900: '#2B1D66',
    950: '#1A1140',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F6F5FB',
    100: '#EFEDF7',
    200: '#E3E0EF',
    300: '#D2CEE3',
    400: '#A8A3BE',
    500: '#857F9C',
    600: '#6A6482',
    700: '#4E4966',
    800: '#2F2A45',
    900: '#1B1730',
    950: '#100C20',
  },
  mint: { 300: '#6EE7B7', 400: '#34D399', 600: '#0F9F6E', 700: '#0C6E4E' },
  amber: { 300: '#FCD34D', 400: '#FBBF24', 600: '#B45309' },
  rose: { 400: '#FF6B84', 600: '#C8344F', 700: '#A52A41' },
  sky: { 600: '#2563B8', 700: '#1E4F94' },
} as const;

/* ───────────────────────── Semantic colour sets ─────────────────────── */

export interface AppColors {
  // Surfaces
  background: string; // screen background
  surface: string; // cards, sheets
  surfaceMuted: string; // chips, skeletons, subtle fills
  field: string; // text-field resting fill
  border: string; // hairlines, dividers
  borderStrong: string; // input outlines
  overlay: string; // modal scrim

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string; // placeholders
  onBrand: string; // text/icons on `brand`

  // Brand
  brand: string;
  brandPressed: string;
  brandSoft: string; // tinted backgrounds (tonal buttons, selected chips)
  brandSoftPressed: string;
  onBrandSoft: string; // text/icons on `brandSoft`
  buttonGradient: readonly [string, string];
  focusRing: string;

  // Status
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  danger: string;
  dangerSoft: string;
  onDangerSoft: string;
  dangerRing: string;
  info: string;
  infoSoft: string;
  onInfoSoft: string;

  // Brand moments (auth, empty states, splash-like screens)
  heroGradient: readonly [string, string, string];
  heroRing: string; // stroke colour of the "proximity" rings
  heroText: string;
  heroTextMuted: string;
  presence: string; // the "present" dot — mint
}

export const lightColors: AppColors = {
  background: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceMuted: palette.neutral[100],
  field: '#FAF9FE',
  border: palette.neutral[200],
  borderStrong: '#CFCADF',
  overlay: 'rgba(16, 12, 32, 0.52)',

  text: palette.neutral[900],
  textSecondary: palette.neutral[700],
  textMuted: palette.neutral[600],
  textSubtle: palette.neutral[500],
  onBrand: '#FFFFFF',

  brand: palette.violet[600],
  brandPressed: palette.violet[700],
  brandSoft: palette.violet[100],
  brandSoftPressed: palette.violet[200],
  onBrandSoft: palette.violet[700],
  buttonGradient: ['#6648DD', palette.violet[600]],
  focusRing: 'rgba(91, 63, 209, 0.18)',

  success: '#0F7A56',
  successSoft: '#E1F6EE',
  onSuccessSoft: '#0C6E4E',
  warning: palette.amber[600],
  warningSoft: '#FEF3D7',
  onWarningSoft: '#8A4108',
  danger: palette.rose[600],
  dangerSoft: '#FDECEF',
  onDangerSoft: palette.rose[700],
  dangerRing: 'rgba(200, 52, 79, 0.16)',
  info: palette.sky[600],
  infoSoft: '#E7F0FC',
  onInfoSoft: palette.sky[700],

  heroGradient: [palette.violet[900], '#43299F', palette.violet[600]],
  heroRing: 'rgba(255, 255, 255, 1)',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255, 255, 255, 0.84)',
  presence: palette.mint[400],
};

export const darkColors: AppColors = {
  background: '#0E0B1C',
  surface: '#171229',
  surfaceMuted: '#1F1936',
  field: '#1C1632',
  border: '#2E2650',
  borderStrong: '#40366B',
  overlay: 'rgba(5, 3, 14, 0.7)',

  text: '#F5F2FF',
  textSecondary: '#D3CCEB',
  textMuted: '#A59EC3',
  textSubtle: '#8278A8',
  onBrand: '#FFFFFF',

  brand: '#7357E6',
  brandPressed: '#5F43D4',
  brandSoft: '#251C4D',
  brandSoftPressed: '#31265F',
  onBrandSoft: '#C9BCFF',
  buttonGradient: ['#7F63EA', '#7357E6'],
  focusRing: 'rgba(143, 117, 255, 0.28)',

  success: '#4ADE9B',
  successSoft: '#10281F',
  onSuccessSoft: '#8BEFC0',
  warning: '#FBBF24',
  warningSoft: '#33260B',
  onWarningSoft: '#FCD34D',
  danger: palette.rose[400],
  dangerSoft: '#3A1622',
  onDangerSoft: '#FFB3C0',
  dangerRing: 'rgba(255, 107, 132, 0.22)',
  info: '#7DB2F5',
  infoSoft: '#12233B',
  onInfoSoft: '#B5D4FA',

  heroGradient: ['#120B33', '#25185E', '#3F2A9A'],
  heroRing: 'rgba(255, 255, 255, 1)',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255, 255, 255, 0.78)',
  presence: palette.mint[400],
};

/* ──────────────────────────── Elevation ──────────────────────────── */

type Shadow = NonNullable<ViewStyle['boxShadow']>;

export interface AppShadows {
  sm: Shadow;
  md: Shadow;
  lg: Shadow;
  brand: Shadow; // coloured glow under primary buttons
}

const lightShadows: AppShadows = {
  sm: [
    { offsetX: 0, offsetY: 1, blurRadius: 2, color: 'rgba(27, 23, 48, 0.06)' },
    { offsetX: 0, offsetY: 1, blurRadius: 1, color: 'rgba(27, 23, 48, 0.04)' },
  ],
  md: [{ offsetX: 0, offsetY: 6, blurRadius: 18, color: 'rgba(27, 23, 48, 0.08)' }],
  lg: [{ offsetX: 0, offsetY: 16, blurRadius: 36, color: 'rgba(27, 23, 48, 0.14)' }],
  brand: [{ offsetX: 0, offsetY: 8, blurRadius: 20, color: 'rgba(91, 63, 209, 0.32)' }],
};

const darkShadows: AppShadows = {
  sm: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: 'rgba(0, 0, 0, 0.4)' }],
  md: [{ offsetX: 0, offsetY: 6, blurRadius: 18, color: 'rgba(0, 0, 0, 0.45)' }],
  lg: [{ offsetX: 0, offsetY: 16, blurRadius: 36, color: 'rgba(0, 0, 0, 0.55)' }],
  brand: [{ offsetX: 0, offsetY: 8, blurRadius: 22, color: 'rgba(115, 87, 230, 0.38)' }],
};

/* ───────────────────────────── Theme objects ───────────────────────────── */

export interface AppTheme {
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: AppColors;
  shadow: AppShadows;
}

export const lightTheme: AppTheme = {
  scheme: 'light',
  isDark: false,
  colors: lightColors,
  shadow: lightShadows,
};

export const darkTheme: AppTheme = {
  scheme: 'dark',
  isDark: true,
  colors: darkColors,
  shadow: darkShadows,
};

/* ─────────────────────────── Scale constants ─────────────────────────── */

/** 4-pt spacing grid. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  sheet: 32,
  pill: 999,
} as const;

/** Minimum comfortable touch target (WCAG 2.5.5 / Material). */
export const MIN_TOUCH = 44;

/* ───────────────────────────── Typography ───────────────────────────── */

export interface TypeSpec {
  size: number;
  line: number;
  weight: FontWeight;
  tracking: number;
  upper?: boolean;
}

/**
 * One family (Plus Jakarta Sans), five weights. Weight is chosen through the
 * font-family name — never through `fontWeight` — because custom static fonts
 * ignore `fontWeight` on Android.
 */
export const typeScale = {
  display: { size: 34, line: 40, weight: 'extrabold', tracking: -0.8 },
  title: { size: 28, line: 34, weight: 'extrabold', tracking: -0.6 },
  heading: { size: 22, line: 28, weight: 'bold', tracking: -0.4 },
  subheading: { size: 18, line: 24, weight: 'bold', tracking: -0.2 },
  bodyLg: { size: 17, line: 25, weight: 'regular', tracking: 0 },
  body: { size: 15, line: 22, weight: 'regular', tracking: 0 },
  label: { size: 14, line: 20, weight: 'semibold', tracking: 0 },
  caption: { size: 13, line: 18, weight: 'medium', tracking: 0 },
  overline: { size: 11, line: 14, weight: 'bold', tracking: 1, upper: true },
  button: { size: 16, line: 22, weight: 'bold', tracking: 0.1 },
} as const satisfies Record<string, TypeSpec>;

export type TypeVariant = keyof typeof typeScale;
