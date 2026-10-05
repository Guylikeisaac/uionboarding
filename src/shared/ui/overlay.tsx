import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { bgMain } from '@/core/theme/colors';
import { DarkScope, useDark, useDarkUi } from './darkScope';
import { SnackbarHost } from './snackbar';

type Kind = 'dialog' | 'sheet' | 'popover';

interface OverlayEntry {
  id: number;
  kind: Kind;
  render: (close: (value?: any) => void) => React.ReactNode;
  resolve: (value: any) => void;
  dismissible: boolean;
  /** Bottom sheet: full height available (Flutter `isScrollControlled`). */
  fullHeight?: boolean;
  maxHeightFraction?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  closing?: boolean;
}

const useOverlayStore = create<{
  entries: OverlayEntry[];
  push: (e: OverlayEntry) => void;
  remove: (id: number) => void;
  markClosing: (id: number) => void;
}>((set) => ({
  entries: [],
  push: (e) => set((s) => ({ entries: [...s.entries, e] })),
  remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  markClosing: (id) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, closing: true } : e)) })),
}));

let nextId = 1;
const pendingValues = new Map<number, unknown>();

function open<T>(kind: Kind, render: OverlayEntry['render'], opts: Partial<OverlayEntry>): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve) => {
    useOverlayStore.getState().push({
      id: nextId++,
      kind,
      render,
      resolve,
      dismissible: opts.dismissible ?? true,
      fullHeight: opts.fullHeight,
      maxHeightFraction: opts.maxHeightFraction,
      sheetStyle: opts.sheetStyle,
      showHandle: opts.showHandle,
    });
  });
}

/**
 * Flutter `showDialog` equivalent. `builder` receives `close(value)`.
 * Resolves with that value, or `undefined` when dismissed.
 */
export function showAppDialog<T = unknown>(
  builder: (close: (value?: T) => void) => React.ReactNode,
  opts: { dismissible?: boolean } = {},
): Promise<T | undefined> {
  return open<T>('dialog', builder as OverlayEntry['render'], opts);
}

/** Flutter `showModalBottomSheet` equivalent. */
export function showAppBottomSheet<T = unknown>(
  builder: (close: (value?: T) => void) => React.ReactNode,
  opts: {
    dismissible?: boolean;
    fullHeight?: boolean;
    maxHeightFraction?: number;
    sheetStyle?: StyleProp<ViewStyle>;
    showHandle?: boolean;
  } = {},
): Promise<T | undefined> {
  return open<T>('sheet', builder as OverlayEntry['render'], opts);
}

/**
 * Anchored popover (reaction bar, overflow menu): no dim, tap outside closes.
 * The builder positions its own content absolutely (window coordinates).
 */
export function showAppPopover<T = unknown>(builder: (close: (value?: T) => void) => React.ReactNode): Promise<T | undefined> {
  return open<T>('popover', builder as OverlayEntry['render'], { dismissible: true });
}

/** Window-space frame of a view (for anchoring popovers). */
export function measureInWindow(ref: React.RefObject<View | null>): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

/** Closes every open overlay (e.g. on logout / navigation reset). */
export function dismissAllOverlays() {
  const { entries, remove } = useOverlayStore.getState();
  entries.forEach((e) => {
    e.resolve(undefined);
    remove(e.id);
  });
}

function OverlayItem({ entry, isTop }: { entry: OverlayEntry; isTop: boolean }) {
  const insets = useSafeAreaInsets();
  const dark = useDark();
  const anim = useState(() => new Animated.Value(0))[0];
  const markClosing = useOverlayStore((s) => s.markClosing);
  const remove = useOverlayStore((s) => s.remove);
  const done = useRef(false);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: entry.kind === 'sheet' ? 260 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, entry.kind]);

  const close = (value?: unknown) => {
    if (done.current) return;
    done.current = true;
    pendingValues.set(entry.id, value);
    markClosing(entry.id);
    Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      () => {
        entry.resolve(pendingValues.get(entry.id));
        pendingValues.delete(entry.id);
        remove(entry.id);
      },
    );
  };

  useEffect(() => {
    if (!isTop) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (entry.dismissible) close(undefined);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, entry.dismissible]);

  const backdrop = (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => entry.dismissible && close(undefined)}
      accessibilityLabel="Dismiss"
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: anim }]} />
    </Pressable>
  );

  if (entry.kind === 'popover') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents={entry.closing ? 'none' : 'auto'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(undefined)} accessibilityLabel="Dismiss" />
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}
        >
          {entry.render(close)}
        </Animated.View>
      </View>
    );
  }

  if (entry.kind === 'dialog') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents={entry.closing ? 'none' : 'auto'}>
        {backdrop}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogCenter}
          pointerEvents="box-none"
        >
          <Animated.View
            style={{
              width: '100%',
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            }}
          >
            {entry.render(close)}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  const screenH = Dimensions.get('window').height;
  const maxH = entry.fullHeight ? screenH - insets.top : screenH * (entry.maxHeightFraction ?? 0.9);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={entry.closing ? 'none' : 'auto'}>
      {backdrop}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            dark ? { backgroundColor: 'transparent', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.16)' } : null,
            { maxHeight: maxH, paddingBottom: insets.bottom },
            entry.fullHeight ? { height: maxH } : null,
            { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [screenH, 0] }) }] },
            entry.sheetStyle,
          ]}
        >
          {dark ? (
            <>
              {/* Frosted-glass sheet on dark screens. */}
              <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,18,18,0.62)' }]} />
            </>
          ) : null}
          {entry.showHandle ? <View style={[styles.handle, dark ? { backgroundColor: 'rgba(255,255,255,0.3)' } : null]} /> : null}
          {entry.render(close)}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Mount once at the root (inside SafeAreaProvider). */
export function OverlayHost() {
  const entries = useOverlayStore((s) => s.entries);
  // Opened from a dark screen (onboarding / signup) → the overlay is dark too.
  const dark = useDarkUi((s) => s.depth > 0);
  if (entries.length === 0) return null;
  if (dark) {
    return (
      <DarkScope track={false}>
        <OverlayModal entries={entries} />
      </DarkScope>
    );
  }
  return <OverlayModal entries={entries} />;
}

function OverlayModal({ entries }: { entries: OverlayEntry[] }) {
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {entries.map((e, i) => (
          <OverlayItem key={e.id} entry={e} isTop={i === entries.length - 1} />
        ))}
        {/* Snackbars raised while a sheet is open must render above it. */}
        <SnackbarHost />
      </GestureHandlerRootView>
    </Modal>
  );
}

export function useHasOverlay() {
  return useOverlayStore((s) => s.entries.length > 0);
}

const styles = StyleSheet.create({
  dialogCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, paddingVertical: 24 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: bgMain,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9DBE1',
    marginTop: 10,
    marginBottom: 6,
  },
});
