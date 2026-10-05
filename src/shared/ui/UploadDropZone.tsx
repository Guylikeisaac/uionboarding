import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accentRed, textMuted } from '@/core/theme/colors';
import { DarkUi, useDark } from './darkScope';
import { Icon } from './Icon';
import { Text } from './Text';

export type UploadDropZoneSize = 'tall' | 'compact';

/** Dashed-border upload target (tall centred zone, or compact inline row). */
export function UploadDropZone({
  label,
  onTap,
  caption,
  size = 'tall',
  errorText,
}: {
  label: string;
  onTap: () => void;
  caption?: string;
  size?: UploadDropZoneSize;
  errorText?: string | null;
}) {
  const dark = useDark();
  return (
    <View>
      <Pressable
        onPress={onTap}
        style={[styles.zone, { height: size === 'tall' ? 116 : 56 }, dark && { backgroundColor: DarkUi.field, borderColor: '#4A4A4A' }]}
      >
        {size === 'tall' ? (
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.badge, dark && { backgroundColor: '#FFFFFF' }]}>
              <Icon name="file-upload" size={18} color="#0A0A0A" />
            </View>
            <Text numberOfLines={1} style={[styles.tallLabel, dark && { color: DarkUi.text }]}>
              {label}
            </Text>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          </View>
        ) : (
          <View style={styles.compactRow}>
            <Icon name="add-circle-outline" size={18} color={textMuted} />
            <Text numberOfLines={1} style={styles.compactLabel}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A3A3A3',
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  tallLabel: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#0A0A0A', textAlign: 'center' },
  caption: { marginTop: 2, fontSize: 11, color: textMuted },
  compactRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  compactLabel: { marginLeft: 10, flex: 1, fontSize: 13, color: textMuted },
  error: { marginTop: 6, fontSize: 11, color: accentRed },
});
