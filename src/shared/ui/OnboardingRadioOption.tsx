import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Genz } from '@/features/onboarding/genz/genzTheme';
import { glassTile } from '@/features/onboarding/genz/glass';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * Full-width tappable selection tile (Gen Z theme): springs + buzzes when
 * picked. Three densities: plain, two-line (subtitle), and icon card.
 */
export function OnboardingRadioOption({
  label,
  selected,
  onTap,
  subtitle,
  leadingIcon,
  indicatorOnRight = false,
}: {
  label: string;
  selected: boolean;
  onTap: () => void;
  subtitle?: string;
  leadingIcon?: IconName;
  indicatorOnRight?: boolean;
}) {
  const rich = subtitle != null || leadingIcon != null;
  const scale = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!selected) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.04, useNativeDriver: true, speed: 50, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
  }, [selected, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {});
          onTap();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[
          styles.tile,
          {
            minHeight: rich ? 70 : 56,
            borderColor: selected ? Genz.fg : glassTile.borderColor,
            borderWidth: 1,
            backgroundColor: selected ? Genz.fg : glassTile.backgroundColor,
            shadowOpacity: selected ? 0.35 : 0,
          },
        ]}
      >
        {leadingIcon ? (
          <View style={[styles.iconBlock, { backgroundColor: selected ? Genz.onFg : 'rgba(255,255,255,0.08)' }]}>
            <Icon name={leadingIcon} size={20} color={Genz.fg} />
          </View>
        ) : !indicatorOnRight ? (
          <View style={[styles.radio, { borderColor: selected ? Genz.onFg : Genz.strokeHi, backgroundColor: selected ? Genz.onFg : 'transparent' }]}>
            {selected ? <Icon name="check" size={13} color={Genz.fg} /> : null}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { fontWeight: selected || rich ? '700' : '500', color: selected ? Genz.onFg : Genz.fg }]}>{label}</Text>
          {subtitle ? <Text style={[styles.subtitle, selected && { color: 'rgba(0,0,0,0.6)' }]}>{subtitle}</Text> : null}
        </View>
        {indicatorOnRight ? (
          <View style={[styles.check, { backgroundColor: selected ? Genz.onFg : 'transparent', borderColor: selected ? Genz.onFg : Genz.strokeHi }]}>
            {selected ? <Icon name="check" size={13} color={Genz.fg} /> : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#FFFFFF',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconBlock: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { fontSize: 15, color: Genz.fg },
  subtitle: { marginTop: 2, fontSize: 12.5, color: Genz.fgSoft, lineHeight: 17 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
