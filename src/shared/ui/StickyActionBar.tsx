import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bgMain } from '@/core/theme/colors';

export function StickyActionBar({
  children,
  style,
}: {
  children: React.ReactNode;
  /** Defaults to `EdgeInsets.fromLTRB(16, 14, 16, 4)`. */
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: 4 + insets.bottom }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: bgMain,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
});
