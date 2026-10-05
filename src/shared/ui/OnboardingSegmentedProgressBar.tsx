import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Genz } from '@/features/onboarding/genz/genzTheme';
import { genzGradient, useIsGenz } from '@/features/onboarding/vibe/vibeStore';

/**
 * Questionnaire progress: one thin track whose white (or, for Gen Z, gradient) fill
 * glides to the current step. Takes an explicit [totalSteps] because branch
 * lengths differ. Display-only.
 */
export function OnboardingSegmentedProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const isGenz = useIsGenz();
  const total = totalSteps < 1 ? 1 : totalSteps;
  const fraction = Math.min(1, (currentStep + 1) / total);
  const anim = useState(() => new Animated.Value(fraction))[0];
  useEffect(() => {
    Animated.timing(anim, { toValue: fraction, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fraction, anim]);
  return (
    <View style={{ height: 5, borderRadius: 3, backgroundColor: Genz.stroke, overflow: 'hidden' }}>
      <Animated.View style={{ height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: Genz.fg, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
        {/* Gen Z: the fill is the vibe gradient instead of plain white. */}
        {isGenz ? <LinearGradient colors={[...genzGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} /> : null}
      </Animated.View>
    </View>
  );
}
