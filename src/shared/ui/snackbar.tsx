import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { accentRed, bgMain, stroke, textMuted, textPrimary, themeColor, withOpacity } from '@/core/theme/colors';
import { Icon } from './Icon';
import { Text } from './Text';

interface SnackState {
  id: number;
  message: string;
  isError: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const useSnackStore = create<{ current: SnackState | null; show: (s: Omit<SnackState, 'id'>) => void; hide: () => void }>(
  (set) => ({
    current: null,
    show: (s) => set({ current: { ...s, id: Date.now() + Math.random() } }),
    hide: () => set({ current: null }),
  }),
);

/**
 * Show a styled top snack bar with SyncUp's design tokens.
 * Pass `isError: true` for the error variant (red icon).
 * An optional `actionLabel`/`onAction` pair renders a tappable CTA.
 */
export function showSnackbar(
  message: string,
  opts: { isError?: boolean; actionLabel?: string; onAction?: () => void } = {},
) {
  useSnackStore.getState().show({
    message,
    isError: opts.isError ?? false,
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
  });
}

export const showErrorSnackbar = (message: string) => showSnackbar(message, { isError: true });

/** Mount once at the root. */
export function SnackbarHost() {
  const current = useSnackStore((s) => s.current);
  const hide = useSnackStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const anim = useState(() => new Animated.Value(0))[0];

  const dismiss = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => hide());
  };

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const t = setTimeout(() => dismiss(), current.actionLabel ? 6000 : 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            marginHorizontal: isTablet ? 40 : 16,
            paddingHorizontal: isTablet ? 20 : 14,
            paddingVertical: isTablet ? 14 : 10,
          },
        ]}
      >
        <Icon
          name={current.isError ? 'error' : 'check-circle'}
          color={current.isError ? accentRed : themeColor}
          size={isTablet ? 28 : 22}
        />
        <Text style={[styles.msg, { fontSize: isTablet ? 15 : 13, marginLeft: isTablet ? 14 : 10 }]}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable
            onPress={() => {
              dismiss();
              current.onAction?.();
            }}
            hitSlop={8}
          >
            <Text style={[styles.action, { fontSize: isTablet ? 15 : 13, marginHorizontal: isTablet ? 14 : 10 }]}>
              {current.actionLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={dismiss} hitSlop={8} style={{ marginLeft: 6 }}>
          <Icon name="close" size={isTablet ? 20 : 16} color={textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 9999, elevation: 9999, paddingTop: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: bgMain,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(stroke, 0.7),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  msg: { flex: 1, color: textPrimary, fontWeight: '500' },
  action: { color: themeColor, fontWeight: '700' },
});
