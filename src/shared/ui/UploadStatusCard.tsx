import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { accentRed, noteBg, stroke, textInverted, textMuted } from '@/core/theme/colors';
import { DarkUi, useDark } from './darkScope';
import { Icon } from './Icon';
import { Text } from './Text';

export type UploadStatusVariant = 'loading' | 'success' | 'error';

/** Status card shown under an UploadDropZone while a file is parsed. */
export function UploadStatusCard({
  variant,
  title,
  message,
  onRetry,
}: {
  variant: UploadStatusVariant;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const dark = useDark();
  const fg = dark ? '#FFFFFF' : '#0A0A0A';
  const bg = dark
    ? variant === 'error' ? '#2A1311' : DarkUi.field
    : variant === 'loading' ? noteBg : variant === 'success' ? '#F4F4F4' : '#FDF1F0';
  const border = dark
    ? variant === 'error' ? '#5A2420' : variant === 'success' ? '#FFFFFF' : DarkUi.border
    : variant === 'loading' ? stroke : variant === 'success' ? '#0A0A0A' : '#F2C4C0';
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.row}>
        {variant === 'loading' ? (
          <ActivityIndicator size="small" color={fg} />
        ) : variant === 'success' ? (
          <Icon name="check-circle" size={18} color={fg} />
        ) : (
          <Icon name="error-outline" size={18} color={accentRed} />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {variant === 'error' && onRetry ? (
        <Pressable onPress={onRetry} style={{ marginTop: 8 }}>
          <Text style={[styles.retry, { color: fg }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 76, padding: 12, borderRadius: 10, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { marginLeft: 8, flex: 1, fontSize: 13, fontWeight: '600', color: textInverted },
  message: { marginTop: 6, fontSize: 11, color: textMuted, lineHeight: 15.4 },
  retry: { fontSize: 12, fontWeight: '800', color: '#0A0A0A' },
});
