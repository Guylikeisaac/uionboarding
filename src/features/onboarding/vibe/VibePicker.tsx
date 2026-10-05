import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DarkScope } from '@/shared/ui/darkScope';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { GenzButton } from '../genz/GenzButton';
import { Genz } from '../genz/genzTheme';
import { AmbientBackdrop, Glass } from '../genz/glass';
import { StaggerIn, WordReveal } from '../genz/motion';
import { genzGradient, useVibeStore, type Vibe } from './vibeStore';

interface Option {
  vibe: Vibe;
  emoji: string;
  title: string;
  subtitle: string;
  tags: string[];
  preview: string;
}

const options: Option[] = [
  {
    vibe: 'genz',
    emoji: '✨',
    title: "I'm Gen Z",
    subtitle: 'Give me the Gen Z experience',
    tags: ['no cap', 'fr fr', 'slay 💅'],
    preview: "What's the vibe today? 👀",
  },
  {
    vibe: 'pro',
    emoji: '👔',
    title: "I'm not Gen Z",
    subtitle: 'Show me the experience made for me',
    tags: ['Clear', 'Concise', 'Professional'],
    preview: 'What brings you to SyncUp?',
  },
];

/**
 * "Choose your vibe" — picks the voice the rest of onboarding speaks in.
 * Shown right after email verification (and as a fallback inside onboarding
 * if the user never picked).
 */
export function VibePicker({ onPicked, onBack }: { onPicked: (vibe: Vibe) => void; onBack?: (() => void) | null }) {
  const insets = useSafeAreaInsets();
  const stored = useVibeStore((s) => s.vibe);
  // Preselect the stored pick (it can load after mount) until the user taps.
  const [picked, setSelected] = useState<Vibe | null>(null);
  const selected = picked ?? stored;

  const pick = (v: Vibe) => {
    void Haptics.selectionAsync().catch(() => {});
    setSelected(v);
  };

  const confirm = () => {
    if (!selected) return;
    useVibeStore.getState().setVibe(selected);
    onPicked(selected);
  };

  const titleStyle = { fontSize: 40, lineHeight: 44, fontWeight: '900' as const, color: Genz.fg, letterSpacing: -1.4 };

  return (
    <DarkScope>
      <View style={{ flex: 1, backgroundColor: Genz.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
        <StatusBar style="light" />
        <AmbientBackdrop />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: 52, justifyContent: 'center' }}>
            {onBack ? (
              <Pressable onPress={onBack} accessibilityLabel="Back" style={{ alignSelf: 'flex-start' }}>
                <Glass radius={22} style={styles.back}>
                  <Icon name="arrow-back" size={20} color={Genz.fg} />
                </Glass>
              </Pressable>
            ) : null}
          </View>

          <StaggerIn delay={0} from={10}>
            <View style={styles.verifiedPill}>
              <Icon name="check-circle" size={14} color="#4ADE80" />
              <Text style={styles.verifiedText}>Email verified</Text>
            </View>
          </StaggerIn>

          <View style={{ marginTop: 18 }}>
            <WordReveal text="Choose your" style={titleStyle} delay={100} />
            <WordReveal text="vibe 👋" style={titleStyle} delay={240} />
          </View>
          <StaggerIn delay={420} from={8}>
            <Text style={styles.lede}>{"We'll set up your onboarding to match. You can always change it later."}</Text>
          </StaggerIn>

          <View style={{ marginTop: 28, gap: 14 }}>
            {options.map((o, i) => (
              <StaggerIn key={o.vibe} index={i} delay={520} step={120} from={26}>
                <VibeCard option={o} selected={selected === o.vibe} dimmed={selected != null && selected !== o.vibe} onPress={() => pick(o.vibe)} />
              </StaggerIn>
            ))}
          </View>

          {selected ? <PreviewBubble key={selected} option={options.find((o) => o.vibe === selected)!} /> : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 24 }}>
          <GenzButton
            text={selected === 'genz' ? "Let's gooo 🚀" : selected === 'pro' ? 'Continue' : 'Pick one to continue'}
            onPressed={selected ? confirm : null}
          />
        </View>
      </View>
    </DarkScope>
  );
}

function VibeCard({ option, selected, dimmed, onPress }: { option: Option; selected: boolean; dimmed: boolean; onPress: () => void }) {
  const isGenz = option.vibe === 'genz';
  const scale = useState(() => new Animated.Value(1))[0];
  const pop = useState(() => new Animated.Value(selected ? 1 : 0))[0];
  const bob = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(pop, { toValue: selected ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
  }, [selected, pop]);

  useEffect(() => {
    // The emoji floats gently so the cards feel alive.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: isGenz ? 1100 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: isGenz ? 1100 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, isGenz]);

  const press = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 10 }).start();

  const body = (
    <View style={[styles.cardInner, selected && isGenz && { backgroundColor: 'rgba(18,8,24,0.92)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View
          style={[
            styles.emojiTile,
            isGenz ? { backgroundColor: 'rgba(236,72,153,0.16)', borderColor: 'rgba(236,72,153,0.4)' } : null,
            {
              transform: [
                { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: isGenz ? ['-6deg', '6deg'] : ['0deg', '0deg'] }) },
              ],
            },
          ]}
        >
          <Text style={{ fontSize: 26 }}>{option.emoji}</Text>
        </Animated.View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>{option.title}</Text>
          <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
        </View>
        <View style={[styles.radio, selected && { borderColor: Genz.fg }]}>
          <Animated.View style={[styles.radioDot, { opacity: pop, transform: [{ scale: pop }] }]}>
            <Icon name="check" size={14} color={Genz.onFg} />
          </Animated.View>
        </View>
      </View>
      <View style={styles.tagRow}>
        {option.tags.map((t) => (
          <View key={t} style={[styles.tag, isGenz && selected ? styles.tagGenz : null]}>
            <Text style={[styles.tagText, isGenz && selected ? { color: '#FFFFFF' } : null]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.title}. ${option.subtitle}`}
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      onPress={onPress}
    >
      <Animated.View style={{ opacity: dimmed ? 0.55 : 1, transform: [{ scale }] }}>
        {isGenz ? (
          <LinearGradient
            colors={selected ? [...genzGradient] : ['rgba(168,85,247,0.55)', 'rgba(236,72,153,0.45)', 'rgba(251,146,60,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardFrame, { padding: selected ? 2 : 1.2 }]}
          >
            {body}
          </LinearGradient>
        ) : (
          <View style={[styles.cardFrame, { padding: selected ? 2 : 1.2, backgroundColor: selected ? Genz.fg : 'rgba(255,255,255,0.16)' }]}>{body}</View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** A taste of how onboarding will talk, so the choice feels concrete. */
function PreviewBubble({ option }: { option: Option }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
  }, [a]);
  return (
    <Animated.View style={{ marginTop: 22, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <Text style={styles.previewLabel}>SNEAK PEEK</Text>
      <Glass radius={18} style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: Genz.fg }}>{option.preview}</Text>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  verifiedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  verifiedText: { marginLeft: 5, fontSize: 12, fontWeight: '800', color: '#4ADE80', letterSpacing: 0.3 },
  lede: { marginTop: 12, fontSize: 15.5, lineHeight: 22, color: Genz.fgSoft },
  cardFrame: { borderRadius: 24 },
  cardInner: { borderRadius: 22, backgroundColor: 'rgba(14,14,14,0.94)', padding: 18 },
  emojiTile: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardTitle: { fontSize: 19, fontWeight: '900', color: Genz.fg, letterSpacing: -0.3 },
  cardSubtitle: { marginTop: 3, fontSize: 13.5, color: Genz.fgSoft, lineHeight: 18 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Genz.strokeHi,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  radioDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Genz.fg, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tagGenz: { backgroundColor: 'rgba(236,72,153,0.22)', borderColor: 'rgba(236,72,153,0.5)' },
  tagText: { fontSize: 12, fontWeight: '700', color: Genz.fgSoft },
  previewLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, color: Genz.fgFaint },
});
