import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accentRed, bgMain, textInverted, textMuted } from '@/core/theme/colors';
import { showAppDialog } from './overlay';
import { useDark } from './darkScope';
import { Text } from './Text';

/**
 * Material `AlertDialog` with two text actions. Resolves true only when the
 * confirm action is tapped.
 */
export async function showConfirmDialog(opts: {
  title: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  dismissible?: boolean;
}): Promise<boolean> {
  const result = await showAppDialog<boolean>(
    (close) => <ConfirmDialog opts={opts} close={close} />,
    { dismissible: opts.dismissible ?? true },
  );
  return result === true;
}

function ConfirmDialog({
  opts,
  close,
}: {
  opts: { title: string; message?: string; cancelLabel?: string; confirmLabel?: string; destructive?: boolean };
  close: (v?: boolean) => void;
}) {
  const dark = useDark();
  return (
    <View style={[styles.dialog, dark && { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }]}>
      {dark ? (
        <>
          <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,18,18,0.6)' }]} />
        </>
      ) : null}
      <Text style={styles.title}>{opts.title}</Text>
      {opts.message ? <Text style={styles.message}>{opts.message}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={() => close(false)} style={styles.action} hitSlop={6}>
          <Text style={{ color: textMuted, fontWeight: '500' }}>{opts.cancelLabel ?? 'Cancel'}</Text>
        </Pressable>
        <Pressable onPress={() => close(true)} style={styles.action} hitSlop={6}>
          <Text style={{ color: opts.destructive ? accentRed : dark ? '#FFFFFF' : '#0A0A0A', fontWeight: '800' }}>
            {opts.confirmLabel ?? 'OK'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dialog: { backgroundColor: bgMain, borderRadius: 24, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: textInverted },
  message: { marginTop: 14, fontSize: 13, color: textMuted, lineHeight: 18.2 },
  actions: { marginTop: 18, flexDirection: 'row', justifyContent: 'flex-end' },
  action: { paddingHorizontal: 12, paddingVertical: 10 },
});
