import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, ScrollView, StyleSheet, View } from 'react-native';

import { GenzButton, genzButtonText } from '@/features/onboarding/genz/GenzButton';
import { Genz, genzCopyFor } from '@/features/onboarding/genz/genzTheme';
import { Glass } from '@/features/onboarding/genz/glass';
import { WordReveal } from '@/features/onboarding/genz/motion';
import { genzGradient, useVibe } from '@/features/onboarding/vibe/vibeStore';
import { Icon } from './Icon';
import { StepScrollProvider } from './stepScroll';
import { useKeyboardVisible } from './useKeyboardInset';
import { Text } from './Text';

/**
 * Content scaffold shared by every onboarding step, in the Gen Z theme:
 * bouncing icon tile, word-by-word title, sliding content and a white pill CTA
 * on the dark canvas.
 * The back button, progress bar and verification badge live in the shell.
 */
export function OnboardingStepLayout({
  title,
  subtitle,
  children,
  buttonText,
  onPressed,
  belowButton,
  loading,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  buttonText: string;
  /** null = disabled */
  onPressed: (() => void) | null;
  belowButton?: React.ReactNode;
  loading?: boolean;
}) {
  const vibe = useVibe();
  const isGenz = vibe === 'genz';
  const copy = genzCopyFor(title, subtitle, vibe);
  // While typing, collapse the header + hide the CTA so fields and their
  // suggestion lists have room above the keyboard.
  const keyboard = useKeyboardVisible();
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
  }, [keyboard]);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const scrollIntoView = useCallback((node: View | null) => {
    // Wait for the keyboard + collapse to settle, then put the field at the top.
    setTimeout(() => {
      const content = contentRef.current;
      if (!node || !content) return;
      node.measureLayout(
        content,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 6), animated: true }),
        () => {},
      );
    }, 320);
  }, []);
  const enter = useState(() => new Animated.Value(0))[0];
  const sticker = useState(() => new Animated.Value(0))[0];
  const wiggle = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.spring(sticker, { toValue: 1, delay: 120, useNativeDriver: true, speed: 8, bounciness: 16 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, sticker, wiggle]);

  const rise = (from: number) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });
  // The answer area slides in from the right, like turning a page.
  const slide = {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
  };
  const subFade = { opacity: enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }) };

  return (
    <View style={[styles.root, keyboard && { paddingTop: 8 }]}>
      {keyboard ? (
        <Text numberOfLines={1} style={styles.titleCompact}>
          {copy.title}
        </Text>
      ) : (
      <>
      <Animated.View style={rise(24)}>
        <Animated.View
          style={[
            styles.sticker,
            {
              transform: [
                { scale: sticker },
                { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) },
              ],
            },
          ]}
        >
          {isGenz ? (
            <LinearGradient colors={[...genzGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stickerGradient}>
              <Icon name={copy.icon} size={28} color="#FFFFFF" />
            </LinearGradient>
          ) : (
            <Glass radius={18} intensity={45} style={styles.stickerGlass}>
              <Icon name={copy.icon} size={28} color={Genz.fg} />
            </Glass>
          )}
        </Animated.View>
        <WordReveal text={copy.title} style={styles.title} />
      </Animated.View>
      {copy.subtitle ? (
        <Animated.View style={subFade}>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </Animated.View>
      ) : null}
      </>
      )}
      <View style={{ height: keyboard ? 12 : 22 }} />
      <Animated.View style={[{ flex: 1 }, slide]}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          // Extra room so even the last field can scroll up to the top.
          contentContainerStyle={{ paddingBottom: keyboard ? 280 : 8 }}
        >
          <View ref={contentRef} collapsable={false}>
            <StepScrollProvider value={scrollIntoView}>{children}</StepScrollProvider>
          </View>
        </ScrollView>
      </Animated.View>
      {keyboard ? (
        onPressed ? (
          <View style={{ paddingTop: 10, paddingBottom: 10 }}>
            <GenzButton text={genzButtonText(buttonText, vibe)} onPressed={onPressed} loading={loading} />
          </View>
        ) : (
          <View style={{ height: 8 }} />
        )
      ) : (
        <>
          <View style={{ height: 14 }} />
          <GenzButton text={genzButtonText(buttonText, vibe)} onPressed={onPressed} loading={loading} />
          {belowButton ? <View style={{ marginTop: 14, alignItems: 'center' }}>{belowButton}</View> : null}
          <View style={{ height: 24 }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 18 },
  sticker: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stickerGlass: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  stickerGradient: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  titleCompact: { fontSize: 19, fontWeight: '900', color: Genz.fg, letterSpacing: -0.3 },
  title: { fontSize: 30, lineHeight: 35, fontWeight: '900', color: Genz.fg, letterSpacing: -0.8 },
  subtitle: { marginTop: 8, fontSize: 15, color: Genz.fgSoft, lineHeight: 21 },
});
