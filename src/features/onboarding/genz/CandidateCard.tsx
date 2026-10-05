import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { CIcon, Icon, type CommunityIconName, type IconName } from '@/shared/ui/Icon';
import { showAppBottomSheet } from '@/shared/ui/overlay';
import { Text } from '@/shared/ui/Text';
import { initialsOf } from '@/shared/ui/UserAvatar';
import { cardTagline, type CandidateCardData, type CardLink } from './cardData';
import { Genz } from './genzTheme';
import { tagOf } from './gamification';
import { Glass } from './glass';
import { StaggerIn } from './motion';
import type { ProfileStrength } from './profileStrength';
import { VerificationRing } from './VerificationBadge';

type Variant = 'dark' | 'light';

const tone = (v: Variant) =>
  v === 'dark'
    ? { bg: ['#171717', '#0A0A0A'] as const, fg: '#FFFFFF', soft: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.3)', line: 'rgba(255,255,255,0.12)', chipBg: '#FFFFFF', chipFg: '#000000', edge: '#2E2E2E' }
    : { bg: ['#FFFFFF', '#E9E9E9'] as const, fg: '#000000', soft: '#5E5E5E', faint: '#A3A3A3', line: '#DADADA', chipBg: '#000000', chipFg: '#FFFFFF', edge: '#FFFFFF' };

const linkIcon: Record<CardLink, CommunityIconName> = {
  linkedin: 'linkedin',
  github: 'github',
  twitter: 'twitter',
  website: 'web',
};

/** A soft diagonal light band that sweeps across the card every few seconds. */
function Shine() {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(a, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -60,
        bottom: -60,
        width: 70,
        backgroundColor: 'rgba(255,255,255,0.07)',
        transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-160, 520] }) }, { rotate: '18deg' }],
      }}
    />
  );
}

/** Fades + lifts its children in whenever [k] changes (a field just got filled). */
function Pop({ k, children, shrink = false }: { k: string; children: React.ReactNode; shrink?: boolean }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [k, a]);
  return (
    <Animated.View style={{ flexShrink: shrink ? 1 : 0, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

function Avatar({ data, size, v, verified = false }: { data: CandidateCardData; size: number; v: Variant; verified?: boolean }) {
  const t = tone(v);
  return (
    <View style={{ width: size, height: size }}>
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: t.fg, overflow: 'hidden', backgroundColor: v === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
      {data.photoUrl ? (
        <Image source={{ uri: data.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
      ) : data.name ? (
        <Text style={{ color: t.fg, fontWeight: '800', fontSize: size * 0.34 }}>{initialsOf(data.name)}</Text>
      ) : (
        <Icon name="person" color={t.soft} size={size * 0.5} />
      )}
    </View>
      {verified ? (
        <View style={{ position: 'absolute', right: -3, bottom: -3, width: size * 0.38, height: size * 0.38 }}>
          <Pop k="avatar-verified">
            <View
              style={{
                width: size * 0.38,
                height: size * 0.38,
                borderRadius: size,
                backgroundColor: t.fg,
                borderWidth: 2,
                borderColor: v === 'dark' ? '#000000' : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={size * 0.22} color={v === 'dark' ? '#000000' : '#FFFFFF'} />
            </View>
          </Pop>
        </View>
      ) : null}
    </View>
  );
}

/** One info line; shows a dashed "to fill" placeholder until it has a value. */
function Line({ icon, value, placeholder, v }: { icon: IconName; value?: string; placeholder: string; v: Variant }) {
  const t = tone(v);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      <Icon name={icon} size={16} color={value ? t.fg : t.faint} />
      {value ? (
        <Pop k={value} shrink>
          <Text numberOfLines={1} style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: t.fg }}>
            {value}
          </Text>
        </Pop>
      ) : (
        <View style={{ marginLeft: 8, paddingBottom: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: t.faint }}>
          <Text style={{ fontSize: 13.5, color: t.faint }}>{placeholder}</Text>
        </View>
      )}
    </View>
  );
}

function Chip({ label, v, outline = false }: { label: string; v: Variant; outline?: boolean }) {
  const t = tone(v);
  return (
    <Pop k={label}>
      <View
        style={{
          marginRight: 6,
          marginTop: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 14,
          backgroundColor: outline ? 'transparent' : t.chipBg,
          borderWidth: outline ? 1 : 0,
          borderColor: t.soft,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: outline ? t.fg : t.chipFg }}>{label}</Text>
      </View>
    </Pop>
  );
}

/** One card section; with [on], sections land one after another. */
function Sec({ i, on, children }: { i: number; on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <StaggerIn index={i} delay={350} step={240} from={12}>
      {children}
    </StaggerIn>
  );
}

/** Small earned-tag pill inside the card (inverts with the card variant). */
function CardTag({ id, v }: { id: string; v: Variant }) {
  const t = tone(v);
  const def = tagOf(id);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: t.chipBg }}>
      <Icon name={def.icon} size={12} color={t.chipFg} />
      <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: '800', color: t.chipFg }}>{def.label}</Text>
    </View>
  );
}

/** "✓ AADHAAR VERIFIED" tag — only ever shown for a real Aadhaar verification. */
function VerifiedTag({ v, small = false }: { v: Variant; small?: boolean }) {
  const t = tone(v);
  return (
    <Pop k="verified-tag">
      <View style={{ marginLeft: 6, paddingHorizontal: small ? 6 : 8, paddingVertical: small ? 2 : 3, borderRadius: 6, backgroundColor: t.fg }}>
        <Text style={{ fontSize: small ? 9 : 10, fontWeight: '900', letterSpacing: 0.8, color: t.chipFg }}>✓ AADHAAR VERIFIED</Text>
      </View>
    </Pop>
  );
}

/**
 * The candidate's live profile card — fills in as onboarding answers come in.
 * The ring is PROFILE STRENGTH; the verified badge appears only after Aadhaar
 * verification ([identityVerified]). [variant] 'light' for dark backgrounds.
 */
export function CandidateCard({
  data,
  strength,
  identityVerified = false,
  aadhaarLast4,
  variant = 'dark',
  blur = true,
  sequence = false,
}: {
  data: CandidateCardData;
  strength: ProfileStrength;
  identityVerified?: boolean;
  aadhaarLast4?: string;
  variant?: Variant;
  /** Off when the card is rotated in 3D (intro tilt, final flip). */
  blur?: boolean;
  /** Fill the card in one section at a time (first appearance). */
  sequence?: boolean;
}) {
  const t = tone(variant);
  const shownTags = data.tags.slice(0, 4);
  const moreTags = data.tags.length - shownTags.length;
  return (
    <Glass light={variant === 'light'} blur={blur} radius={26} intensity={variant === 'light' ? 70 : 55} style={{ padding: 20 }}>
      <Shine />
      <Sec i={0} on={sequence}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 3, color: t.soft }}>SYNCUP · PROFILE</Text>
        <View style={{ alignItems: 'center' }}>
          <VerificationRing score={strength.score} size={44} stroke={4} inverted={variant === 'dark'} />
        </View>
      </View>
      </Sec>

      <Sec i={1} on={sequence}>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <Avatar data={data} size={62} v={variant} verified={identityVerified} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: '800', color: t.fg, letterSpacing: -0.3 }}>
            {data.name || 'Your name'}
          </Text>
          <View style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            {data.handle ? <Text style={{ fontSize: 13, color: t.soft }}>@{data.handle}</Text> : null}
            {identityVerified ? <VerifiedTag v={variant} small /> : null}
          </View>
        </View>
      </View>
      </Sec>

      {data.tags.length ? (
        <Sec i={2} on={sequence}>
          <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
            {shownTags.map((id) => (
              <Pop key={id} k={id}>
                <View style={{ marginRight: 6, marginBottom: 6 }}>
                  <CardTag id={id} v={variant} />
                </View>
              </Pop>
            ))}
            {moreTags > 0 ? (
              <View style={{ marginBottom: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: t.soft }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: t.fg }}>+{moreTags}</Text>
              </View>
            ) : null}
          </View>
        </Sec>
      ) : null}

      <Sec i={3} on={sequence}>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {data.goal ? <Chip label={data.goal} v={variant} outline /> : null}
        {data.era ? <Chip label={data.era} v={variant} outline /> : null}
        {!data.goal && !data.era ? <Chip label="Complete your profile" v={variant} outline /> : null}
      </View>
      </Sec>

      <Sec i={4} on={sequence}>

      <Line icon="place" value={data.location} placeholder="Add your location" v={variant} />
      <Line
        icon={data.isRecruiter || data.era === 'Experienced' ? 'work-outline' : 'school'}
        value={data.background}
        placeholder={data.isRecruiter ? 'Add your company' : 'Add education or work'}
        v={variant}
      />
      <Line icon="description" value={data.hasResume ? 'Resume attached' : undefined} placeholder="Add your resume" v={variant} />
      </Sec>

      <Sec i={5} on={sequence}>

      <View style={{ marginTop: 14, height: 1, backgroundColor: t.line }} />
      <Text style={{ marginTop: 12, fontSize: 10.5, fontWeight: '800', letterSpacing: 2, color: t.soft }}>SKILLS</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {data.skills.length ? data.skills.map((s) => <Chip key={s} label={s} v={variant} />) : <Chip label="+ Add skills" v={variant} outline />}
      </View>
      </Sec>

      <Sec i={6} on={sequence}>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row' }}>
          {(['linkedin', 'github', 'twitter', 'website'] as CardLink[]).map((l) => (
            <View key={l} style={{ marginRight: 10, opacity: data.links.includes(l) ? 1 : 0.28 }}>
              <CIcon name={linkIcon[l]} size={18} color={t.fg} />
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, color: identityVerified ? t.fg : t.soft }}>
          {identityVerified ? `AADHAAR ✓ ${aadhaarLast4 ? `··${aadhaarLast4}` : ''}`.trim() : 'NOT VERIFIED'}
        </Text>
      </View>
      </Sec>
    </Glass>
  );
}

/** Slim card shown above each step; tap to see the full card + checklist. */
export function CompactCandidateCard({
  data,
  strength,
  identityVerified = false,
}: {
  data: CandidateCardData;
  strength: ProfileStrength;
  identityVerified?: boolean;
}) {
  const pulse = useState(() => new Animated.Value(1))[0];
  const glow = useState(() => new Animated.Value(0))[0];
  const prevScore = useRef(strength.score);

  // A small pop whenever profile strength grows.
  useEffect(() => {
    if (strength.score > prevScore.current) {
      Animated.sequence([
        Animated.spring(pulse, { toValue: 1.03, useNativeDriver: true, speed: 40, bounciness: 12 }),
        Animated.spring(pulse, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]).start();
    }
    prevScore.current = strength.score;
  }, [strength.score, pulse]);

  // Aadhaar-verified: a white border that breathes.
  useEffect(() => {
    if (!identityVerified) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.25, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [identityVerified, glow]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Pressable onPress={() => showCardSheet(data, strength, identityVerified)} accessibilityLabel="Open your profile card">
      <Glass radius={20} intensity={45} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, paddingRight: 12 }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFFFFF', opacity: glow }}
        />
        <Avatar data={data} size={40} v="dark" verified={identityVerified} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '800', color: '#FFFFFF' }}>
            {data.name || 'Your profile'}
          </Text>
          <Pop k={cardTagline(data)} shrink>
            <Text numberOfLines={1} style={{ marginTop: 1, fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>
              {cardTagline(data)}
            </Text>
          </Pop>
        </View>
        <View style={{ alignItems: 'center', marginLeft: 8 }}>
          <VerificationRing score={strength.score} size={40} stroke={3.5} inverted />
          <Text style={{ marginTop: 2, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(255,255,255,0.5)' }}>PROFILE</Text>
        </View>
      </Glass>
      </Pressable>
    </Animated.View>
  );
}

export function showCardSheet(data: CandidateCardData, s: ProfileStrength, identityVerified = false) {
  void showAppBottomSheet<void>((close) => (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 }}>
      <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Genz.strokeHi, marginBottom: 14 }} />
      <CandidateCard data={data} strength={s} identityVerified={identityVerified} />
      <Text style={{ marginTop: 18, fontSize: 18, fontWeight: '800', color: Genz.fg }}>
        {s.complete ? 'Your profile is complete' : `Profile ${s.score}% complete`}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 13.5, color: Genz.fgSoft }}>
        {identityVerified
          ? 'Aadhaar verified. Your verified badge is on your profile.'
          : 'Complete profiles get more recruiter views. Verify with Aadhaar to earn the verified badge.'}
      </Text>
      <View style={{ marginTop: 10 }}>
        {s.items.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: it.done ? Genz.fg : 'transparent',
                borderWidth: it.done ? 0 : 1.5,
                borderColor: Genz.strokeHi,
              }}
            >
              {it.done ? <Icon name="check" size={13} color={Genz.onFg} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: it.done ? '700' : '400', color: it.done ? Genz.fg : Genz.fgSoft }}>{it.label}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: it.done ? Genz.fg : Genz.fgFaint }}>+{it.weight}%</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => close()} style={{ marginTop: 14, height: 52, borderRadius: 26, backgroundColor: Genz.fg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Genz.onFg, fontWeight: '800', fontSize: 15 }}>Continue</Text>
      </Pressable>
    </View>
  ), { maxHeightFraction: 0.94 });
}
