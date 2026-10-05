import type { TextStyle } from 'react-native';

import { textMuted, textPrimary, textTertiary, themeColor, textDisabled, accentRed } from './colors';

/**
 * Inter is registered once per weight (see `fontAssets`), because Android
 * cannot synthesise weights for a custom font family. `fontFor` maps a CSS
 * weight to the matching registered family; the shared `Text` component does
 * this automatically, so screens can keep writing `fontWeight: '600'`.
 */
export const fontAssets = {
  'Inter-Regular': require('../../../assets/fonts/Inter_18pt-Regular.ttf'),
  'Inter-Medium': require('../../../assets/fonts/Inter_18pt-Medium.ttf'),
  'Inter-SemiBold': require('../../../assets/fonts/Inter_18pt-SemiBold.ttf'),
  'Inter-Bold': require('../../../assets/fonts/Inter_18pt-Bold.ttf'),
  'Inter-ExtraBold': require('../../../assets/fonts/Inter_18pt-ExtraBold.ttf'),
  'Inter-Black': require('../../../assets/fonts/Inter_18pt-Black.ttf'),
};

export type Weight = NonNullable<TextStyle['fontWeight']>;

export function fontFor(weight: Weight | undefined): string {
  switch (String(weight ?? '400')) {
    case '500':
    case 'medium':
      return 'Inter-Medium';
    case '600':
    case 'semibold':
      return 'Inter-SemiBold';
    case '700':
    case 'bold':
      return 'Inter-Bold';
    case '800':
    case 'heavy':
      return 'Inter-ExtraBold';
    case '900':
    case 'black':
      return 'Inter-Black';
    default:
      return 'Inter-Regular';
  }
}

/** Shared text style helper — mirrors `AppTheme._ts`. */
export function ts(size: number, weight: Weight, color: string): TextStyle {
  return { fontSize: size, fontWeight: weight, color, letterSpacing: 0, lineHeight: size * 1.4 };
}

/** Material text theme equivalents from `AppTheme._textTheme`. */
export const textTheme = {
  displayLarge: ts(28, '700', textPrimary),
  displayMedium: ts(24, '700', textPrimary),
  displaySmall: ts(22, '600', textPrimary),
  titleLarge: ts(20, '600', textPrimary),
  titleMedium: ts(18, '600', textPrimary),
  titleSmall: ts(16, '600', textPrimary),
  bodyLarge: ts(16, '400', textPrimary),
  bodyMedium: ts(14, '400', textPrimary),
  bodySmall: ts(12, '400', textTertiary),
  labelLarge: ts(14, '600', '#FFFFFF'),
  labelMedium: ts(12, '500', textPrimary),
  labelSmall: ts(11, '400', textMuted),
  hint: ts(14, '400', textDisabled),
  error: ts(12, '400', accentRed),
  link: ts(14, '600', themeColor),
} as const;
