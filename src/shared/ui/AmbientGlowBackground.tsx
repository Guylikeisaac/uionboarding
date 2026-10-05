import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const BLOB = 400;

/**
 * Ambient "breathing" background: two large, soft glows — indigo from the
 * top, cyan from the bottom — drifting slowly in opposition (7s / 9s,
 * ease-in-out). Honours the OS "reduce motion" setting.
 */
export function AmbientGlowBackground({
  children,
  showBaseGradient = true,
}: {
  children?: React.ReactNode;
  showBaseGradient?: boolean;
}) {
  const { width } = useWindowDimensions();
  const left = (width - BLOB) / 2;
  const top = useState(() => new Animated.Value(0))[0];
  const bottom = useState(() => new Animated.Value(0))[0];
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => !cancelled && setReduceMotion(v));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const a = loop(top, 7000);
    const b = loop(bottom, 9000);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduceMotion, top, bottom]);

  const glowStyle = (v: Animated.Value, dx: number, dy: number) => ({
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
    ],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {showBaseGradient ? (
        <LinearGradient colors={['#F8F9FA', '#EAF1FB']} style={StyleSheet.absoluteFill} />
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.blob, { top: -240, left }, glowStyle(top, 16, 40)]}>
        <Glow id="top" color="#4D4DFF" alpha={0.22} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.blob, { bottom: -240, left }, glowStyle(bottom, -16, -40)]}>
        <Glow id="bottom" color="#6DCBFF" alpha={0.26} />
      </Animated.View>
      {children}
    </View>
  );
}

function Glow({ id, color, alpha }: { id: string; color: string; alpha: number }) {
  return (
    <Svg width={BLOB} height={BLOB}>
      <Defs>
        <RadialGradient id={`g-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={alpha} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={BLOB / 2} cy={BLOB / 2} r={BLOB / 2} fill={`url(#g-${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: BLOB, height: BLOB },
});
