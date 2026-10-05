import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { CandidateCard } from './CandidateCard';
import type { CandidateCardData } from './cardData';
import { Genz } from './genzTheme';
import { EarnedTag, useCountUpFrom } from './gamification';
import { AmbientBackdrop, Glass } from './glass';
import { StaggerIn } from './motion';
import type { ProfileStrength } from './profileStrength';
import { textFor } from '../vibe/vibeCopy';
import { currentVibe } from '../vibe/vibeStore';

const sparkles = ['✦', '✶', '★', '✷', '●', '✧'];

/** Monochrome confetti: white sparkles drifting down the black backdrop. */
function Confetti() {
  const { width, height } = useWindowDimensions();
  // Randomised once per mount (a lazy initializer, not during render).
  const [bits] = useState(() =>
      Array.from({ length: 28 }, (_, i) => ({
        ch: sparkles[i % sparkles.length],
        x: Math.random() * (width - 20),
        delay: Math.random() * 1600,
        duration: 3000 + Math.random() * 2000,
        size: 10 + Math.random() * 14,
        spin: Math.random() > 0.5 ? 1 : -1,
        grey: Math.random() > 0.5,
      })),
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <Bit key={i} {...b} fall={height + 60} />
      ))}
    </View>
  );
}

function Bit({ ch, x, delay, duration, size, spin, grey, fall }: { ch: string; x: number; delay: number; duration: number; size: number; spin: number; grey: boolean; fall: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: -30,
        fontSize: size,
        color: grey ? 'rgba(255,255,255,0.45)' : '#FFFFFF',
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, fall] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin * 300}deg`] }) },
        ],
      }}
    >
      {ch}
    </Animated.Text>
  );
}

/** Profile-strength count-up, level, and the earned-tags shelf (tags pop in one by one). */
function GameSummary({ strength }: { strength: ProfileStrength }) {
  const pct = useCountUpFrom(0, strength.score, 1300, 150);
  const level = strength.level;
  const earned = strength.items.filter((i) => i.done);
  const locked = strength.items.filter((i) => !i.done);
  return (
    <View>
      <StaggerIn delay={0} from={10}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4 }}>Profile strength {pct}%</Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFFFFF' }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#000000' }}>
              Lv {level.n} · {level.name}
            </Text>
          </View>
        </View>
      </StaggerIn>
      <StaggerIn delay={120} from={6}>
        <Text style={{ marginTop: 14, fontSize: 11, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.5)' }}>
          TAGS EARNED · {earned.length}/{strength.items.length}
        </Text>
      </StaggerIn>
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...earned, ...locked].map((it, i) => (
          <StaggerIn key={it.id} index={i} delay={250} step={90} from={12} style={{ marginRight: 8, marginBottom: 8 }}>
            <EarnedTag id={it.id} earned={it.done} size="sm" />
          </StaggerIn>
        ))}
      </View>
    </View>
  );
}

/** The card's back face: black, wordmark, faint pattern. */
function CardBack() {
  return (
    <Glass radius={26} blur={false} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 7 }, (_, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: -40, right: -40, top: i * 70 - 40, height: 1, backgroundColor: 'rgba(255,255,255,0.07)', transform: [{ rotate: '-18deg' }] }}
        />
      ))}
      <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: 8, color: '#FFFFFF' }}>SYNCUP</Text>
      <Text style={{ marginTop: 8, fontSize: 11, fontWeight: '800', letterSpacing: 4, color: 'rgba(255,255,255,0.5)' }}>✦ PROFILE CARD ✦</Text>
    </Glass>
  );
}

/**
 * Final reveal, choreographed: the card drops in face-down, flips over to its
 * front (two-sided flip, no mirroring), then the score counts up, the stamp
 * slams down and the copy fades in. Afterwards it floats and can be dragged
 * to tilt.
 */
export function GenzCelebration({
  data,
  strength,
  identityVerified,
  aadhaarLast4,
  onDone,
  onVerifyNow,
}: {
  data: CandidateCardData;
  strength: ProfileStrength;
  identityVerified: boolean;
  aadhaarLast4?: string;
  onDone: () => void;
  /** Offered when the user skipped Aadhaar verification. */
  onVerifyNow?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const drop = useState(() => new Animated.Value(0))[0];
  const back = useState(() => new Animated.Value(0))[0];
  const front = useState(() => new Animated.Value(0))[0];
  const stamp = useState(() => new Animated.Value(0))[0];
  const text = useState(() => new Animated.Value(0))[0];
  const float = useState(() => new Animated.Value(0))[0];
  const tilt = useState(() => new Animated.ValueXY({ x: 0, y: 0 }))[0];
  // Front content remounts at the moment it turns face-up, so its ring count-up
  // and field pops play while the user can actually see them.
  const [revealed, setRevealed] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    let floatLoop: Animated.CompositeAnimation | null = null;
    Animated.sequence([
      Animated.spring(drop, { toValue: 1, useNativeDriver: true, speed: 7, bounciness: 9 }),
      Animated.delay(250),
      Animated.timing(back, { toValue: 1, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setRevealed(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.timing(front, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished: done }) => {
        if (!done) return;
        Animated.sequence([
          Animated.delay(450),
          Animated.parallel([
            Animated.spring(stamp, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 16 }),
            Animated.timing(text, { toValue: 1, duration: 450, useNativeDriver: true }),
          ]),
        ]).start(() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setShowGame(true);
          floatLoop = Animated.loop(
            Animated.sequence([
              Animated.timing(float, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(float, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          );
          floatLoop.start();
        });
      });
    });
    return () => floatLoop?.stop();
  }, [drop, back, front, stamp, text, float]);

  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        tilt.setValue({ x: Math.max(-1, Math.min(1, g.dx / 140)), y: Math.max(-1, Math.min(1, g.dy / 140)) });
      },
      onPanResponderRelease: () => {
        Animated.spring(tilt, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 8, bounciness: 14 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(tilt, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    }),
  );

  const verified = identityVerified;
  const first = data.name ? data.name.split(/\s+/)[0] : '';

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: Genz.bg }]}>
      <StatusBar style="light" />
      <AmbientBackdrop intensity={1.4} />
      <Confetti />
      {/* One scrolling column: nothing can overlap, whatever the screen height. */}
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={showGame}
      >
        <Animated.View style={{ opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
          <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 2.5, color: 'rgba(255,255,255,0.55)' }}>
            {verified ? 'VERIFIED PROFILE' : 'PROFILE READY'}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 30, lineHeight: 35, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>
            {verified ? `${first ? `${first}, you're` : "You're"} verified.` : `${first ? `${first}, your` : 'Your'} card is ready.`}
          </Text>
        </Animated.View>

        {/* Card: drop-in, two-sided flip, idle float and drag tilt. */}
        <Animated.View
          {...pan.panHandlers}
          style={{
            marginTop: 26,
            marginBottom: 30,
            transform: [
              { perspective: 1200 },
              {
                translateY: Animated.add(
                  drop.interpolate({ inputRange: [0, 1], outputRange: [-280, 0] }),
                  float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
                ),
              },
              { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '-1.5deg'] }) },
              { rotateX: tilt.y.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] }) },
              { rotateY: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) },
            ],
          }}
        >
          <Animated.View
            style={{
              backfaceVisibility: 'hidden',
              opacity: front.interpolate({ inputRange: [0, 0.02, 1], outputRange: [0, 1, 1] }),
              transform: [{ perspective: 1200 }, { rotateY: front.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
            }}
          >
            <CandidateCard
              key={revealed ? 'front' : 'pending'}
              data={data}
              strength={strength}
              identityVerified={verified}
              aadhaarLast4={aadhaarLast4}
              variant="light"
              blur={false}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backfaceVisibility: 'hidden',
                opacity: back.interpolate({ inputRange: [0, 0.98, 1], outputRange: [1, 1, 0] }),
                transform: [{ perspective: 1200 }, { rotateY: back.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
              },
            ]}
          >
            <CardBack />
          </Animated.View>
          {verified ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: 8,
                bottom: -16,
                opacity: stamp,
                transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }, { rotate: '-10deg' }],
              }}
            >
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#000000' }}>
                <Text style={{ fontSize: 14, fontWeight: '900', letterSpacing: 1.4, color: '#FFFFFF' }}>AADHAAR VERIFIED ✓</Text>
              </View>
            </Animated.View>
          ) : null}
        </Animated.View>

        {showGame ? <GameSummary strength={strength} /> : <View style={{ height: 120 }} />}

        <Animated.View style={{ marginTop: 14, opacity: text }}>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.7)' }}>
            {verified
              ? 'Your Aadhaar-verified badge is now on your profile. Recruiters see it first.'
              : 'Verify with Aadhaar anytime to earn the verified badge and stand out to recruiters.'}
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Docked actions. */}
      <Animated.View style={{ opacity: text, paddingHorizontal: 24, paddingTop: 10, paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            onDone();
          }}
          style={({ pressed }) => ({ height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <Text style={{ fontSize: 16.5, fontWeight: '900', color: Genz.onFg }}>{textFor(currentVibe()).enterApp}</Text>
        </Pressable>
        {!verified && onVerifyNow ? (
          <Pressable onPress={onVerifyNow} style={({ pressed }) => ({ marginTop: 10, opacity: pressed ? 0.8 : 1 })}>
            <Glass radius={26} style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="verified-user" size={18} color="#FFFFFF" />
              <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Verify with Aadhaar</Text>
            </Glass>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
