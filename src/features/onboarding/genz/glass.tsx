import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * iOS-style glass for the dark onboarding: an ambient backdrop of slowly
 * drifting soft-white light, frosted [Glass] surfaces (real UIKit blur via
 * expo-blur), and a cheaper translucent [glassTile] style for list items.
 * Monochrome throughout — the "colour" is just light.
 */

/** Translucent glass fill for tiles/fields (no blur — cheap for lists). */
export const glassTile = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.13)',
};

export const glassBorder = 'rgba(255,255,255,0.16)';

function Orb({ size, x, y, opacity, duration, dx, dy, delay }: { size: number; x: number; y: number; opacity: number; duration: number; dx: number; dy: number; delay: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);
  const id = `orb-${Math.round(size)}-${Math.round(x)}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
        ],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={opacity} />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Black canvas with slow-drifting soft light — what the glass refracts. */
export function AmbientBackdrop({ intensity = 1 }: { intensity?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', overflow: 'hidden' }]}>
      <Orb size={width * 1.1} x={width * 0.05} y={height * 0.12} opacity={0.16 * intensity} duration={9000} dx={width * 0.18} dy={height * 0.06} delay={0} />
      <Orb size={width * 0.9} x={width * 1.0} y={height * 0.48} opacity={0.11 * intensity} duration={11000} dx={-width * 0.22} dy={-height * 0.05} delay={600} />
      <Orb size={width * 1.0} x={width * 0.3} y={height * 0.95} opacity={0.12 * intensity} duration={13000} dx={width * 0.15} dy={-height * 0.08} delay={1200} />
      {/* Fine vignette so edges stay deep black. */}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0.35 }} end={{ x: 0.5, y: 1 }} />
    </View>
  );
}

/**
 * Frosted glass surface: system blur + faint white fill + a top-edge specular
 * highlight + hairline border. [light] gives milky white glass.
 */
export function Glass({
  children,
  style,
  radius = 20,
  intensity = 40,
  light = false,
  highlight = true,
  blur = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  light?: boolean;
  highlight?: boolean;
  /** Real blur. Turn off inside 3D-rotated views, where UIKit blur can flicker. */
  blur?: boolean;
}) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: light ? 'rgba(255,255,255,0.7)' : glassBorder }, style]}>
      {blur ? (
        <BlurView
          intensity={intensity}
          tint={light ? 'systemThickMaterialLight' : 'systemUltraThinMaterialDark'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: light ? (blur ? 'rgba(255,255,255,0.72)' : 'rgba(250,250,250,0.94)') : blur ? 'rgba(255,255,255,0.045)' : 'rgba(22,22,22,0.72)' },
        ]}
      />
      {highlight ? (
        <LinearGradient
          pointerEvents="none"
          colors={light ? ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
