import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { Genz } from '@/features/onboarding/genz/genzTheme';
import { glassTile } from '@/features/onboarding/genz/glass';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Multi-select tile for the interest grid (Gen Z theme) — pops when toggled. */
export function InterestGridTile({
  label,
  icon,
  selected,
  onTap,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  onTap: () => void;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          Animated.sequence([
            Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 60 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }),
          ]).start();
          onTap();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={[
          styles.tile,
          { borderColor: selected ? Genz.fg : glassTile.borderColor, borderWidth: 1, backgroundColor: selected ? Genz.fg : glassTile.backgroundColor },
        ]}
      >
        <Icon name={icon} size={22} color={selected ? Genz.onFg : Genz.fg} />
        <Text numberOfLines={2} style={[styles.label, { fontWeight: selected ? '700' : '500', color: selected ? Genz.onFg : Genz.fg }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 14, borderRadius: 16 },
  label: { marginTop: 8, fontSize: 12, lineHeight: 15.6, color: Genz.fg, textAlign: 'center' },
});
