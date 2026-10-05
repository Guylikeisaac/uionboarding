import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { authBackButtonBorder, authBackButtonFill, textPrimary } from '@/core/theme/colors';
import { Icon, type IconName } from './Icon';

export function AppBackButton({
  onTap,
  icon = 'arrow-back',
  iconSize = 20,
  backgroundColor,
  borderColor,
}: {
  onTap?: () => void;
  icon?: IconName;
  iconSize?: number;
  /** Chip fill/border. Defaults preserve the approved auth look. */
  backgroundColor?: string;
  borderColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={6}
      onPress={
        onTap ??
        (() => {
          if (router.canGoBack()) router.back();
        })
      }
      style={[
        styles.chip,
        { backgroundColor: backgroundColor ?? authBackButtonFill, borderColor: borderColor ?? authBackButtonBorder },
      ]}
    >
      <Icon name={icon} color={textPrimary} size={iconSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
