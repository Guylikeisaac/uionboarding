import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from './Text';

export function AppPrimaryButton({
  text,
  onPressed,
  backgroundColor,
  height = 50,
  disabledBackgroundColor,
  foregroundColor = '#FFFFFF',
  disabledForegroundColor,
  borderRadius = 12,
  isEnabled,
  textStyle,
  loading = false,
  style,
}: {
  text: string;
  onPressed?: (() => void) | null;
  backgroundColor: string;
  height?: number;
  disabledBackgroundColor?: string;
  foregroundColor?: string;
  disabledForegroundColor?: string;
  borderRadius?: number;
  isEnabled?: boolean;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const enabled = isEnabled ?? onPressed != null;
  const bg = enabled ? backgroundColor : disabledBackgroundColor ?? '#E0E0E0';
  const fg = enabled ? foregroundColor : disabledForegroundColor ?? (disabledBackgroundColor ? foregroundColor : '#9E9E9E');
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPressed || loading}
      onPress={onPressed ?? undefined}
      style={({ pressed }) => [
        styles.btn,
        { height, backgroundColor: bg, borderRadius, opacity: pressed && enabled ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }, textStyle]}>{text}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '600' },
});
