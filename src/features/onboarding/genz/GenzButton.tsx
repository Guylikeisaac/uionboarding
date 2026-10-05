import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, View } from 'react-native';

import { Text } from '@/shared/ui/Text';
import { vibeButtonText } from '../vibe/vibeCopy';
import type { Vibe } from '../vibe/vibeStore';
import { Genz } from './genzTheme';

/**
 * Chunky white pill CTA (dark theme): squishes on press, buzzes, and pops +
 * flashes a shine across when it flips from disabled to enabled.
 */
export function GenzButton({ text, onPressed, loading = false }: { text: string; onPressed: (() => void) | null; loading?: boolean }) {
  const scale = useState(() => new Animated.Value(1))[0];
  const shine = useState(() => new Animated.Value(0))[0];
  const [width, setWidth] = useState(0);
  const enabled = onPressed != null && !loading;
  const wasEnabled = useRef(enabled);

  useEffect(() => {
    if (enabled && !wasEnabled.current) {
      shine.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, speed: 40, bounciness: 14 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
        ]),
        Animated.timing(shine, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    wasEnabled.current = enabled;
  }, [enabled, scale, shine]);

  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 10 }).start();
  const active = onPressed != null;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPressIn={() => enabled && to(0.95)}
      onPressOut={() => to(1)}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPressed?.();
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{
            height: 58,
            borderRadius: 29,
            overflow: 'hidden',
            backgroundColor: active ? Genz.fg : Genz.disabled,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
        >
          {loading ? (
            <ActivityIndicator color={Genz.onFg} />
          ) : (
            <Text style={{ color: active ? Genz.onFg : Genz.disabledFg, fontSize: 16.5, fontWeight: '800', letterSpacing: 0.2 }}>{text}</Text>
          )}
          {width > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 60,
                backgroundColor: 'rgba(0,0,0,0.08)',
                transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-width / 2 - 60, width / 2 + 60] }) }, { skewX: '-20deg' }],
              }}
            />
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Normalises CTA labels from the steps to consistent, clean copy — in the
 * Gen Z voice when [vibe] is 'genz'.
 */
export function genzButtonText(text: string, vibe: Vibe = 'pro'): string {
  return vibeButtonText(cleanButtonText(text), text, vibe);
}

function cleanButtonText(text: string): string {
  switch (text) {
    case 'Proceed':
      return 'Finish';
    case 'Verify & Continue':
      return 'Verify';
    case 'Finishing...':
      return 'Finishing…';
    case 'Extracting...':
      return 'Reading your resume…';
    case 'Sending code...':
      return 'Sending code…';
    case 'Creating account...':
      return 'Creating your account…';
    case 'Verifying...':
      return 'Verifying…';
    default:
      return text;
  }
}
