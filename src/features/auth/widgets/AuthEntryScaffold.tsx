import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { textDisabled } from '@/core/theme/colors';
import { GenzButton, genzButtonText } from '@/features/onboarding/genz/GenzButton';
import { Genz } from '@/features/onboarding/genz/genzTheme';
import { AmbientBackdrop, Glass } from '@/features/onboarding/genz/glass';
import type { Vibe } from '@/features/onboarding/vibe/vibeStore';
import { DarkScope } from '@/shared/ui/darkScope';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

export function authLogoTopOffset(viewportHeight: number): number {
  return Math.min(196, Math.max(156, viewportHeight * 0.25));
}

/** Display copy for the account-creation screens (presentation only). */
const authCopy: Record<string, string> = {
  'Enter mobile number': 'Enter your mobile number',
  'Verify mobile number': 'Verify your number',
  'Enter your email': "What's your email?",
  'Verify your email': 'Check your inbox',
  'Enter your details': 'Tell us your name',
};

export function AuthScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Glass radius={12} intensity={40} style={styles.chip}>
        <Text style={styles.chipText}>SYNCUP · NEW ACCOUNT</Text>
      </Glass>
      <Text style={styles.title}>{authCopy[title] ?? title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

/**
 * Page shell shared by the five auth-entry screens: circular back button
 * top-left, generous top whitespace, centred title/subtitle, then a
 * bottom-docked CTA.
 */
export function AuthEntryScaffold({
  title,
  subtitle,
  children,
  ctaLabel,
  onCta,
  belowCta,
  centerBelowCta = true,
  footer,
  ctaFollowsBody = false,
  compactTop = false,
  onBack,
  ctaLoading,
  vibe = 'pro',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  ctaLabel: string;
  /** null renders the CTA in its disabled treatment. */
  onCta: (() => void) | null;
  belowCta?: React.ReactNode;
  centerBelowCta?: boolean;
  footer?: React.ReactNode;
  ctaFollowsBody?: boolean;
  compactTop?: boolean;
  onBack?: (() => void) | null;
  ctaLoading?: boolean;
  /** Voice for the CTA label; screens before the vibe pick stay 'pro'. */
  vibe?: Vibe;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewportHeight = height - insets.top - insets.bottom;
  const top = compactTop ? 72 : Math.max(84, authLogoTopOffset(viewportHeight) - 72);

  const cta = (
    <GenzButton text={genzButtonText(ctaLabel, vibe)} onPressed={onCta} loading={ctaLoading} />
  );
  const below = belowCta ? <View style={centerBelowCta ? { alignItems: 'center' } : null}>{belowCta}</View> : null;

  return (
    <DarkScope>
    <View style={{ flex: 1, backgroundColor: Genz.bg }}>
    <AmbientBackdrop />
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={{ flexGrow: 1, minHeight: viewportHeight }} onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ height: top }} />
            <AuthScreenHeader title={title} subtitle={subtitle} />
            <View style={{ height: 32 }} />
            {children}
            {ctaFollowsBody ? (
              <>
                <View style={{ height: 20 }} />
                {cta}
                {below ? <View style={{ marginTop: 14 }}>{below}</View> : null}
                <View style={{ flex: 1 }} />
              </>
            ) : (
              <>
                <View style={{ flex: 1, minHeight: 24 }} />
                {cta}
                {below ? <View style={{ marginTop: 16 }}>{below}</View> : null}
              </>
            )}
            {footer ? <View style={{ marginTop: 20, width: '100%' }}>{footer}</View> : null}
            <View style={{ height: 24 }} />
          </Pressable>
          {onBack ? (
            <View style={{ position: 'absolute', top: 14, left: 24 }}>
              <Pressable onPress={onBack} accessibilityLabel="Back">
                <Glass radius={22} style={styles.back}>
                  <Icon name="arrow-back" size={20} color={Genz.fg} />
                </Glass>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
    </DarkScope>
  );
}

/** Underlined-style text link for secondary actions ("Send via SMS instead"). */
export function AuthTextLink({ label, onTap }: { label: string; onTap?: (() => void) | null }) {
  return (
    <Pressable onPress={onTap ?? undefined} disabled={!onTap} hitSlop={8}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: onTap ? Genz.fg : textDisabled, textDecorationLine: onTap ? 'underline' : 'none' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 2, color: Genz.fgSoft },
  title: { marginTop: 16, fontSize: 34, fontWeight: '900', color: Genz.fg, lineHeight: 39, letterSpacing: -1.2 },
  subtitle: { marginTop: 10, fontSize: 15, color: Genz.fgSoft, lineHeight: 21 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
