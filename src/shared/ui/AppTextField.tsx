import React, { forwardRef, useState } from 'react';
import { StyleSheet, View, type TextInput as RNTextInput, type TextInputProps } from 'react-native';

import {
  accentRed,
  authFieldBorder,
  textInverted,
} from '@/core/theme/colors';
import { DarkUi, useDark } from './darkScope';
import { Text, TextInput } from './Text';

export interface AppTextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint: string;
  suffix?: React.ReactNode;
  labelColor?: string;
  enabled?: boolean;
  labelSpacing?: number;
  /** Error text shown under the field (validator result). */
  error?: string | null;
  multilineHeight?: number;
}

/** Flutter `AppTextField` / `appTextFieldDecoration`. */
export const AppTextField = forwardRef<RNTextInput, AppTextFieldProps>(function AppTextField(
  { label, hint, suffix, labelColor, enabled = true, labelSpacing = 6, error, multilineHeight, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const dark = useDark();
  const borderColor = error ? accentRed : focused ? (dark ? DarkUi.borderFocus : '#0A0A0A') : dark ? DarkUi.border : authFieldBorder;
  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: labelColor ?? textInverted, marginBottom: labelSpacing }]}>{label}</Text>
      ) : null}
      <View style={[styles.box, dark && styles.boxDark, { borderColor, opacity: enabled ? 1 : 0.6 }]}>
        <TextInput
          ref={ref}
          placeholder={hint}
          editable={enabled}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multilineHeight ? { height: multilineHeight, textAlignVertical: 'top' } : null]}
          {...rest}
        />
        {suffix ? <View style={styles.suffix}>{suffix}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

/** The bordered field box, on a dark surface inside a dark scope. */
export function useFieldBox() {
  const dark = useDark();
  return dark ? [fieldStyles.box, { backgroundColor: DarkUi.field, borderColor: DarkUi.border, borderRadius: 14 }] : fieldStyles.box;
}

export const fieldStyles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 10,
    borderColor: authFieldBorder,
  },
});

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '400' },
  box: fieldStyles.box,
  boxDark: { backgroundColor: DarkUi.field, borderRadius: 14 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 },
  suffix: { paddingRight: 12 },
  error: { fontSize: 11, color: accentRed, marginTop: 4, marginLeft: 4 },
});
