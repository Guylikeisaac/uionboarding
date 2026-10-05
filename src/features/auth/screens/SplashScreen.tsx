import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { authManager } from '@/core/auth/authManager';
import { AmbientGlowBackground } from '@/shared/ui/AmbientGlowBackground';
import { AppLogo } from '@/shared/ui/AppLogo';
import { useSignupFlow } from '../providers/signupFlowStore';

const DURATION = 2800;

/**
 * Splash: logo entrance over the ambient glow, while AuthManager initializes.
 * The route guard owns every navigation decision; this only drives the
 * minimum display time.
 */
export function SplashScreen() {
  const t = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: true }).start();
    if (authManager.isInitialized) return;
    let cancelled = false;
    (async () => {
      await Promise.all([authManager.initialize(), new Promise((r) => setTimeout(r, DURATION))]);
      if (cancelled) return;
      // A signup that survived a restart needs its stub token in the flow store.
      useSignupFlow.getState().hydrate();
      authManager.setReadyToRoute();
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // fade: Interval(0, 0.6, easeIn); scale 0.7→1: Interval(0.2, 1, easeOutCubic)
  const opacity = t.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, 0.25, 1, 1] });
  const scale = t.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0.7, 0.7, 0.9, 0.97, 0.995, 1],
  });

  return (
    <View style={styles.root}>
      <AmbientGlowBackground>
        <View style={styles.center}>
          <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <AppLogo size={150} />
          </Animated.View>
        </View>
      </AmbientGlowBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
