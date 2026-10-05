import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { CandidateCard } from './CandidateCard';
import type { CandidateCardData } from './cardData';
import { GenzButton, genzButtonText } from './GenzButton';
import { Genz } from './genzTheme';
import { AmbientBackdrop, Glass } from './glass';
import { StaggerIn, WordReveal } from './motion';
import type { ProfileStrength } from './profileStrength';
import { textFor } from '../vibe/vibeCopy';
import { useVibe } from '../vibe/vibeStore';

/**
 * First screen of onboarding: the (mostly empty) profile card the candidate is
 * about to fill. It rises in with a 3D tilt, floats, and can be dragged to tilt
 * like a real card in your hand.
 */
export function GenzIntro({ data, strength, onStart }: { data: CandidateCardData; strength: ProfileStrength; onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const vibe = useVibe();
  const t = textFor(vibe);
  const enter = useState(() => new Animated.Value(0))[0];
  const float = useState(() => new Animated.Value(0))[0];
  const tilt = useState(() => new Animated.ValueXY({ x: 0, y: 0 }))[0];

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay: 450, useNativeDriver: true, speed: 5, bounciness: 9 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, float]);

  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        void Haptics.selectionAsync().catch(() => {});
      },
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

  const first = data.name ? data.name.split(/\s+/)[0] : '';
  const titleStyle = { fontSize: 42, lineHeight: 45, fontWeight: '900' as const, color: Genz.fg, letterSpacing: -1.6 };

  return (
    <View style={{ flex: 1, backgroundColor: Genz.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <AmbientBackdrop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <StaggerIn delay={0} from={10}>
          <Glass radius={12} intensity={40} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 2, color: Genz.fgSoft }}>{t.introChip}</Text>
          </Glass>
        </StaggerIn>
        <View style={{ marginTop: 18 }}>
          {first ? <WordReveal text={t.introHi(first)} style={[titleStyle, { color: Genz.fgSoft }]} delay={120} /> : null}
          <WordReveal text={t.introLine1} style={titleStyle} delay={first ? 260 : 120} />
          <WordReveal text={t.introLine2} style={titleStyle} delay={first ? 420 : 280} />
        </View>
        <StaggerIn delay={600} from={8}>
          <Text style={{ marginTop: 12, fontSize: 15.5, lineHeight: 22, color: Genz.fgSoft }}>
            {t.introBody}
          </Text>
        </StaggerIn>

        <Animated.View
          {...pan.panHandlers}
          style={{
            marginTop: 28,
            opacity: enter,
            transform: [
              { perspective: 900 },
              { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }), float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })) },
              { rotateX: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }), tilt.y.interpolate({ inputRange: [-1, 1], outputRange: [14, -14] })).interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
              { rotateY: tilt.x.interpolate({ inputRange: [-1, 1], outputRange: ['-16deg', '16deg'] }) },
              { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '-1deg'] }) },
            ],
          }}
        >
          <CandidateCard data={data} strength={strength} blur={false} />
        </Animated.View>
        <StaggerIn delay={1100} from={6}>
          <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: Genz.fgFaint }}>{t.introTip}</Text>
        </StaggerIn>

        <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            ['schedule', t.introPerks[0]],
            ['lock-outline', t.introPerks[1]],
            ['verified-user', t.introPerks[2]],
          ].map(([e, l], i) => (
            <StaggerIn key={l} index={i} delay={1200} step={90} style={{ flex: 1, alignItems: 'center' }}>
              <Icon name={e as IconName} size={20} color={Genz.fg} />
              <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '600', color: Genz.fgSoft }}>{l}</Text>
            </StaggerIn>
          ))}
        </View>
      </ScrollView>
      <StaggerIn delay={1450} from={30} style={{ paddingHorizontal: 24 }}>
        <GenzButton text={genzButtonText(t.introCta, vibe)} onPressed={onStart} />
      </StaggerIn>
    </View>
  );
}
