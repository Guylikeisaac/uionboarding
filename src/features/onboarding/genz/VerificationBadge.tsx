import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Monochrome verification ring that fills as the score rises — % in the
 * middle. At 100 it finishes counting FIRST, then the check pops in with a
 * ripple (no jump-cut). [inverted] draws white-on-black for dark cards.
 */
export function VerificationRing({
  score,
  size = 52,
  stroke = 5,
  animate = true,
  inverted = false,
  checkAtFull = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  animate?: boolean;
  inverted?: boolean;
  /** Swap the % for a check at 100 (off for profile strength, which isn't verification). */
  checkAtFull?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useState(() => new Animated.Value(animate ? 0 : score))[0];
  const check = useState(() => new Animated.Value(checkAtFull && !animate && score >= 100 ? 1 : 0))[0];
  const ripple = useState(() => new Animated.Value(0))[0];
  const [shown, setShown] = useState(animate ? 0 : score);
  const [complete, setComplete] = useState(checkAtFull && !animate && score >= 100);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setShown(Math.round(value)));
    if (score < 100) check.setValue(0);
    Animated.timing(progress, { toValue: score, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (!finished || score < 100) return;
      // Ripple either way; the check only when this ring means "verified".
      // Count reached 100 → swap to the check with a pop + ripple.
      if (checkAtFull) setComplete(true);
      ripple.setValue(0);
      Animated.parallel([
        Animated.spring(check, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 16 }),
        Animated.timing(ripple, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    });
    return () => progress.removeListener(id);
  }, [score, progress, check, ripple, checkAtFull]);

  const fg = inverted ? '#FFFFFF' : '#000000';
  const track = inverted ? 'rgba(255,255,255,0.18)' : '#E2E2E2';
  const offset = progress.interpolate({ inputRange: [0, 100], outputRange: [c, 0], extrapolate: 'clamp' });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ripple ring that expands + fades when verification completes. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: fg,
          opacity: ripple.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.8, 0] }),
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        }}
      />
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fg}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
        />
      </Svg>
      {complete && score >= 100 ? (
        <Animated.View
          style={{
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: size,
            backgroundColor: fg,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: check }, { rotate: check.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
          }}
        >
          <Icon name="check" size={size * 0.32} color={inverted ? '#000000' : '#FFFFFF'} />
        </Animated.View>
      ) : (
        <Text style={{ fontSize: size * (shown >= 100 ? 0.23 : 0.26), fontWeight: '800', color: fg }}>{checkAtFull ? Math.min(shown, 99) : shown}%</Text>
      )}
    </View>
  );
}

/** Floating "+N%" bubble that rises and fades whenever [score] goes up. */
export function useScoreGain(score: number) {
  const prev = useRef(score);
  const [gain, setGain] = useState(0);
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const delta = score - prev.current;
    prev.current = score;
    if (delta <= 0) return;
    setGain(delta);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [score, anim]);
  return { gain, anim };
}

export function GainBubble({ gain, anim, inverted = false }: { gain: number; anim: Animated.Value; inverted?: boolean }) {
  if (gain <= 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        top: -10,
        opacity: anim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }],
      }}
    >
      <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: inverted ? '#FFFFFF' : '#000000' }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: inverted ? '#000000' : '#FFFFFF' }}>+{gain}%</Text>
      </View>
    </Animated.View>
  );
}
