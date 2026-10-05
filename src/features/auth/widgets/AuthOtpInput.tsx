import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';

import { accentRed } from '@/core/theme/colors';
import { Text } from '@/shared/ui/Text';

/**
 * 6-box OTP input (Flutter `Pinput`). A hidden TextInput owns the value so
 * paste and SMS autofill (`oneTimeCode`) work.
 */
export function AuthOtpInput({
  value,
  onChange,
  length = 6,
  hasError = false,
  autofocus = false,
  onCompleted,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  hasError?: boolean;
  autofocus?: boolean;
  onCompleted?: (code: string) => void;
}) {
  const ref = useRef<RNTextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autofocus) {
      const t = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [autofocus]);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.row} accessibilityLabel="One-time code">
      {Array.from({ length }, (_, i) => {
        const ch = value[i] ?? '';
        const isFocusedBox = focused && (i === value.length || (i === length - 1 && value.length === length));
        const borderColor = hasError ? accentRed : isFocusedBox ? '#FFFFFF' : ch ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.14)';
        return (
          <View key={i} style={[styles.box, { borderColor, borderWidth: isFocusedBox || hasError ? 1.6 : 1 }]}>
            <Text style={styles.digit}>{ch}</Text>
            {isFocusedBox && !ch ? <View style={styles.cursor} /> : null}
          </View>
        );
      })}
      <RNTextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, length);
          onChange(digits);
          if (digits.length === length) onCompleted?.(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  cursor: { position: 'absolute', width: 2, height: 20, backgroundColor: '#FFFFFF' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
