// Design tokens — ported 1:1 from lib/constant.dart.

// ── Typography ────────────────────────────────────────────────────────────────
export const kFontFamily = 'Inter';

// ── Brand colors ─────────────────────────────────────────────────────────────
export const themeColor = '#2962FF'; // primary brand
export const secondary = '#61FBFF';

// ── Backgrounds ───────────────────────────────────────────────────────────────
export const bgMain = '#FFFFFF';
export const bgLight = '#F1F2FF'; // tinted secondary bg

// ── Text ──────────────────────────────────────────────────────────────────────
export const textPrimary = '#111111';
export const textSecondary = '#292929';
export const textTertiary = '#696969';
export const textMuted = '#7E7E8C';
export const textInverted = '#282248';
export const textDisabled = '#BBBBBB';

// ── Borders / dividers ────────────────────────────────────────────────────────
export const stroke = '#E5E7EB';
export const chipStroke = '#B9BDFD';

// Neutral circular-chip fill for back/close buttons on light surfaces.
export const chipNeutral = '#EDEEF3';

// ── Brand-blue tints ─────────────────────────────────────────────────────────
// All four are [themeColor] mixed with white, so the family stays one hue.
export const themeColorSoft = '#EAF1FF'; // ~8%  — chip fill
export const themeColorSoftBorder = '#C5D8FF'; // ~25% — chip outline
export const themeColorSurface = '#E1E9FF'; // ~15% — upload zone fill
export const themeColorSurfaceBorder = '#89A9FF'; // ~55% — dashed edge

/** Disabled primary action. Derived from [themeColor] at ~50% on white. */
export const themeColorDisabled = '#94B0FF';

// Softer success pair for status cards.
export const accentGreenSoft = '#EAF7EC';
export const accentGreenSoftBorder = '#A5D9AE';

// ── Accent ────────────────────────────────────────────────────────────────────
export const accentPurpleLight = '#EAEAFF';
export const accentBlueLight = '#E6F7FF';
export const accentGreenLight = '#E6F9E1';
export const accentGreen = '#21A604';
export const accentRed = '#E64A3E';
export const accentAmber = '#D97706';

// ── Auth-specific colors preserved from the approved UI ──────────────────────
export const authActionColor = '#0A0A0A';
export const authDisabledAction = '#9FA6FF';
export const authSupportText = '#757575';
export const authCheckboxActive = '#0A0A0A';
export const authCheckboxBorder = '#CCCCCC';
export const authFieldBorder = '#E0E0E0';
export const authFieldFocusedBorder = '#AAAAAA';
export const authBackButtonFill = '#F8F8F8';
export const authBackButtonBorder = '#F8F8F8';
export const authLabelMuted = '#9E9E9E';
export const authOtpBorder = '#C7C5D9';
export const authStrengthEmpty = '#E0E0E0';
export const authStrengthWeak = '#E53935';
export const authStrengthMedium = '#FFA000';
export const authStrengthGood = '#43A047';
export const authStrengthStrong = '#2E7D32';

// ── Legacy aliases ────────────────────────────────────────────────────────────
export const primary = themeColor;
export const text = textPrimary;
export const textMed = textTertiary;
export const muted = textMuted;
export const noteBg = '#F9FAFB';
export const bgNote = noteBg;
export const danger = accentRed;

/** `Color.withOpacity` equivalent for #RRGGBB hex tokens. */
export function withOpacity(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Material `Colors.grey.shadeN` equivalents (used by ported screens). */
export const grey = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#EEEEEE',
  300: '#E0E0E0',
  350: '#D6D6D6',
  400: '#BDBDBD',
  500: '#9E9E9E',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
} as const;
