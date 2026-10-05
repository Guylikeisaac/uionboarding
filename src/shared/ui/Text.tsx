import React, { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { textPrimary } from '@/core/theme/colors';
import { fontFor } from '@/core/theme/typography';
import { DarkUi, darkText, useDark } from './darkScope';

/**
 * App-wide Text: resolves `fontWeight` to the matching Inter family so weights
 * render identically on Android and iOS (the Flutter app's `fontFamily: Inter`).
 */
export function Text({ style, ...rest }: TextProps) {
  const dark = useDark();
  const flat = (StyleSheet.flatten([styles.base, style]) ?? {}) as TextStyle;
  const { fontWeight, ...others } = flat;
  if (dark) others.color = darkText(others.color) as TextStyle['color'];
  return <RNText {...rest} style={[others, { fontFamily: fontFor(fontWeight) }]} />;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { style, ...rest },
  ref,
) {
  const dark = useDark();
  const flat = (StyleSheet.flatten([styles.base, style]) ?? {}) as TextStyle;
  const { fontWeight, ...others } = flat;
  if (dark) others.color = darkText(others.color) as TextStyle['color'];
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={dark ? DarkUi.placeholder : '#BBBBBB'}
      keyboardAppearance={dark ? 'dark' : 'default'}
      selectionColor={dark ? '#FFFFFF' : undefined}
      cursorColor={dark ? '#FFFFFF' : undefined}
      {...rest}
      style={[others, { fontFamily: fontFor(fontWeight) }]}
    />
  );
});

const styles = StyleSheet.create({
  base: { color: textPrimary, fontSize: 14 },
});
