import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Icon, type IconName } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { Genz } from './genzTheme';
import { Glass, glassTile } from './glass';
import { levelOf, type ProfileStrength } from './profileStrength';
import { textFor } from '../vibe/vibeCopy';
import { currentVibe } from '../vibe/vibeStore';

// ── Earned tags ─────────────────────────────────────────────────────────────

export interface EarnedTagDef {
  id: string;
  label: string;
  icon: IconName;
}

/** The tag a person earns for each profile milestone while registering. */
const tagFor: Record<string, EarnedTagDef> = {
  phone: { id: 'phone', label: 'Phone Verified', icon: 'phone-iphone' },
  email: { id: 'email', label: 'Email Verified', icon: 'alternate-email' },
  intent: { id: 'intent', label: 'Goal Setter', icon: 'flag' },
  resume: { id: 'resume', label: 'Resume Ready', icon: 'description' },
  location: { id: 'location', label: 'On the Map', icon: 'place' },
  profileType: { id: 'profileType', label: 'Career Stage Set', icon: 'timeline' },
  background: { id: 'background', label: 'Background Added', icon: 'school' },
  skills: { id: 'skills', label: 'Skilled', icon: 'bolt' },
  links: { id: 'links', label: 'Portfolio Linked', icon: 'link' },
  interests: { id: 'interests', label: 'Curious Mind', icon: 'explore' },
  gender: { id: 'gender', label: 'All Set', icon: 'task-alt' },
  work: { id: 'work', label: 'Company Rep', icon: 'business' },
  hiring: { id: 'hiring', label: 'Talent Scout', icon: 'campaign' },
};

export const tagOf = (id: string): EarnedTagDef => tagFor[id] ?? { id, label: 'Milestone', icon: 'military-tech' };

/** A tag pill: solid white when earned, faint outline with a lock when not. */
export function EarnedTag({ id, earned = true, size = 'md' }: { id: string; earned?: boolean; size?: 'sm' | 'md' }) {
  const t = tagOf(id);
  const sm = size === 'sm';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: sm ? 9 : 11,
        paddingVertical: sm ? 5 : 7,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: earned ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
        borderColor: earned ? '#FFFFFF' : 'rgba(255,255,255,0.14)',
      }}
    >
      <Icon name={earned ? t.icon : 'lock-outline'} size={sm ? 13 : 15} color={earned ? '#000000' : 'rgba(255,255,255,0.4)'} />
      <Text style={{ marginLeft: 5, fontSize: sm ? 11.5 : 12.5, fontWeight: '800', color: earned ? '#000000' : 'rgba(255,255,255,0.45)' }}>{t.label}</Text>
    </View>
  );
}

// ── Toast queue ─────────────────────────────────────────────────────────────

type ToastKind = 'tag' | 'level' | 'complete';

interface GameToast {
  id: number;
  kind: ToastKind;
  /** For 'tag' toasts: which tag was earned. */
  tagId?: string;
  icon: IconName;
  title: string;
  subtitle: string;
}

let seq = 0;
export const useGameToasts = create<{ queue: GameToast[]; push: (t: Omit<GameToast, 'id'>) => void; shift: () => void }>((set, get) => ({
  queue: [],
  push: (t) => set({ queue: [...get().queue, { ...t, id: ++seq }] }),
  shift: () => set({ queue: get().queue.slice(1) }),
}));

/**
 * Fires milestone / level-up / profile-complete toasts for progress made in
 * THIS session (what was already done on mount stays silent).
 */
export function useGameEvents(s: ProfileStrength, enabled: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const lastLevel = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const done = new Set(s.items.filter((i) => i.done).map((i) => i.id));
    const level = s.level.n;
    if (seen.current == null) {
      seen.current = done;
      lastLevel.current = level;
      return;
    }
    const push = useGameToasts.getState().push;
    const voice = textFor(currentVibe());
    for (const it of s.items) {
      if (it.done && !seen.current.has(it.id)) {
        const t = tagOf(it.id);
        push({ kind: 'tag', tagId: it.id, icon: t.icon, title: t.label, subtitle: voice.tagSubtitle(it.weight) });
      }
    }
    if (lastLevel.current != null && level > lastLevel.current) {
      const l = levelOf(s.score);
      push(
        l.n === 4
          ? { kind: 'complete', icon: 'workspace-premium', title: voice.completeTitle, subtitle: voice.completeSubtitle }
          : { kind: 'level', icon: 'trending-up', title: `Level ${l.n} · ${l.name}`, subtitle: voice.levelSubtitle },
      );
    }
    seen.current = done;
    lastLevel.current = level;
  }, [s, enabled]);
}

/**
 * Renders queued toasts one at a time. They rise from the BOTTOM (above the
 * CTA) so they never cover the header card or progress.
 */
export function GameToastHost({ bottomOffset = 92 }: { bottomOffset?: number }) {
  const current = useGameToasts((st) => st.queue[0]);
  if (!current) return null;
  return <ToastView key={current.id} toast={current} bottomOffset={bottomOffset} />;
}

function ToastView({ toast, bottomOffset }: { toast: GameToast; bottomOffset: number }) {
  const insets = useSafeAreaInsets();
  const a = useState(() => new Animated.Value(0))[0];
  const spin = useState(() => new Animated.Value(0))[0];
  const big = toast.kind !== 'tag';

  useEffect(() => {
    void Haptics.notificationAsync(big ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.parallel([
      Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 9 }),
      Animated.timing(spin, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(
      () =>
        Animated.timing(a, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
          useGameToasts.getState().shift(),
        ),
      big ? 2400 : 1600,
    );
    return () => clearTimeout(t);
  }, [a, spin, big]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + bottomOffset,
        zIndex: 50,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
      }}
    >
      <Glass
        light={big}
        radius={20}
        intensity={big ? 60 : 50}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: big ? 13 : 10,
          paddingHorizontal: 12,
        }}
      >
        {big ? (
          <Animated.View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: '#000000',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }, { scale: spin }],
            }}
          >
            <Icon name={toast.icon} size={22} color="#FFFFFF" />
          </Animated.View>
        ) : null}
        <View style={{ flex: 1, marginLeft: big ? 12 : 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 1.6, color: big ? '#6B6B6B' : Genz.fgFaint }}>
            {toast.kind === 'tag' ? 'TAG EARNED' : toast.kind === 'level' ? 'LEVEL UP' : 'PROFILE COMPLETE'}
          </Text>
          {toast.kind === 'tag' && toast.tagId ? (
            <Animated.View style={{ marginTop: 6, alignSelf: 'flex-start', transform: [{ scale: spin }] }}>
              <EarnedTag id={toast.tagId} />
            </Animated.View>
          ) : (
            <Text style={{ marginTop: 1, fontSize: 16, fontWeight: '800', color: '#000000' }}>{toast.title}</Text>
          )}
          <Text style={{ marginTop: toast.kind === 'tag' ? 6 : 1, fontSize: 12.5, color: big ? '#4A4A4A' : Genz.fgSoft }}>{toast.subtitle}</Text>
        </View>
      </Glass>
    </Animated.View>
  );
}

// ── Header HUD: streak + level (profile strength lives on the card ring) ───

export function GameHud({ strength, streak }: { strength: ProfileStrength; streak: number }) {
  const level = strength.level;
  const flame = useState(() => new Animated.Value(1))[0];
  const lv = useState(() => new Animated.Value(1))[0];
  const prevStreak = useRef(streak);
  const prevLevel = useRef(level.n);

  useEffect(() => {
    if (streak > prevStreak.current) {
      Animated.sequence([
        Animated.spring(flame, { toValue: 1.3, useNativeDriver: true, speed: 40, bounciness: 18 }),
        Animated.spring(flame, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]).start();
    }
    prevStreak.current = streak;
  }, [streak, flame]);

  useEffect(() => {
    if (level.n > prevLevel.current) {
      Animated.sequence([
        Animated.spring(lv, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 18 }),
        Animated.spring(lv, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]).start();
    }
    prevLevel.current = level.n;
  }, [level.n, lv]);

  const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, borderWidth: 1, ...glassTile };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {streak > 0 ? (
        <Animated.View style={[pill, { marginRight: 6, transform: [{ scale: flame }] }]}>
          <Icon name="local-fire-department" size={13} color={Genz.fg} />
          <Text style={{ marginLeft: 3, fontSize: 11.5, fontWeight: '800', color: Genz.fg }}>{streak} in a row</Text>
        </Animated.View>
      ) : null}
      <Animated.View style={[pill, { backgroundColor: Genz.fg, borderColor: Genz.fg, transform: [{ scale: lv }] }]}>
        <Text style={{ fontSize: 11.5, fontWeight: '900', color: Genz.onFg }}>
          Lv {level.n} · {level.name}
        </Text>
      </Animated.View>
    </View>
  );
}

/** Animated number counting from [start] to [value]. */
export function useCountUpFrom(start: number, value: number, duration = 1200, delay = 0) {
  const anim = useState(() => new Animated.Value(start))[0];
  const [shown, setShown] = useState(start);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, anim, duration, delay]);
  return shown;
}
