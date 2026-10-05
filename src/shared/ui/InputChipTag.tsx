import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDark } from './darkScope';
import { Icon } from './Icon';
import { Text } from './Text';

/** Removable tag chip used by every multi-value input. */
export function InputChipTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  // Inverted on dark screens: white chip, black label.
  const dark = useDark();
  const fg = dark ? '#000000' : '#FFFFFF';
  return (
    <View style={[styles.chip, dark && { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`} style={{ marginLeft: 6 }}>
        <Icon name="close" size={14} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0A0A0A',
  },
  label: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
