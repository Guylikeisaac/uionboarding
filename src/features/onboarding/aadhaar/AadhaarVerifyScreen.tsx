import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { kDemoMode, kDemoOtp } from '@/core/demo/demoMode';
import { errorMessage } from '@/core/data/repositoryException';
import { AuthOtpInput } from '@/features/auth/widgets/AuthOtpInput';
import { Icon } from '@/shared/ui/Icon';
import { Text, TextInput } from '@/shared/ui/Text';
import { GenzButton } from '../genz/GenzButton';
import { Genz } from '../genz/genzTheme';
import { AmbientBackdrop, Glass, glassTile } from '../genz/glass';
import { StaggerIn, WordReveal } from '../genz/motion';
import {
  aadhaarError,
  aadhaarValid,
  demoAadhaarNumber,
  formatAadhaar,
  maskAadhaar,
  onlyDigits,
  requestAadhaarOtp,
  verifyAadhaarOtp,
} from './aadhaar';

type Phase = 'enter' | 'otp' | 'success';

const titleStyle = { fontSize: 30, lineHeight: 35, fontWeight: '900' as const, color: Genz.fg, letterSpacing: -0.8 };

/**
 * Aadhaar identity verification (UIDAI OTP). The ONLY way a profile becomes
 * "verified". Shown after the onboarding questions; can be skipped.
 */
export function AadhaarVerifyScreen({ onVerified, onSkip }: { onVerified: (last4: string) => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('enter');
  const [digits, setDigits] = useState('');
  const [hidden, setHidden] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refId, setRefId] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const last4 = digits.slice(-4);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await requestAadhaarOtp(digits);
      setRefId(r.referenceId);
      setResendIn(r.resendAfterSeconds);
      setOtp('');
      setPhase('otp');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code = otp) => {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyAadhaarOtp(refId, code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('success');
      // Keep only the last 4 digits from here on.
      setTimeout(() => onVerified(last4), 1700);
    } catch (e) {
      setError(errorMessage(e));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'success') return <VerifiedMoment last4={last4} />;

  const fieldError = aadhaarError(digits);
  const canSend = aadhaarValid(digits) && consent;

  return (
    <View style={{ flex: 1, backgroundColor: Genz.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <AmbientBackdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
          {phase === 'enter' ? (
            <View key="enter">
              <StaggerIn delay={0} from={10}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ShieldSticker />
                  <Glass radius={12} intensity={40} style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 2, color: Genz.fgSoft }}>FINAL STEP · OPTIONAL</Text>
                  </Glass>
                </View>
              </StaggerIn>
              <View style={{ marginTop: 16 }}>
                <WordReveal text="Verify your identity" style={titleStyle} />
              </View>
              <StaggerIn delay={350} from={8}>
                <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 21, color: Genz.fgSoft }}>
                  Verify with Aadhaar to earn the verified badge. It takes less than a minute.
                </Text>
              </StaggerIn>

              <View style={{ marginTop: 18 }}>
                {[
                  ['verified-user', 'Verified badge on your profile'],
                  ['visibility', 'Stand out to recruiters'],
                  ['lock-outline', 'Only the last 4 digits are kept'],
                ].map(([icon, label], i) => (
                  <StaggerIn key={label} index={i} delay={450} step={80} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 10, borderWidth: 1, ...glassTile, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={icon as 'verified-user'} size={16} color={Genz.fg} />
                    </View>
                    <Text style={{ marginLeft: 10, fontSize: 14, color: Genz.fg }}>{label}</Text>
                  </StaggerIn>
                ))}
              </View>

              <StaggerIn delay={700} from={14}>
                <Text style={{ marginTop: 10, marginBottom: 8, fontSize: 13, fontWeight: '700', color: Genz.fgSoft }}>Aadhaar number</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 58,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: fieldError ? Genz.error : digits.length ? Genz.fg : glassTile.borderColor,
                    backgroundColor: glassTile.backgroundColor,
                  }}
                >
                  <Icon name="badge" size={20} color={Genz.fgSoft} />
                  <TextInput
                    value={hidden ? digits : formatAadhaar(digits)}
                    onChangeText={(t) => {
                      setDigits(onlyDigits(t));
                      if (error) setError(null);
                    }}
                    placeholder="0000 0000 0000"
                    keyboardType="number-pad"
                    secureTextEntry={hidden}
                    maxLength={hidden ? 12 : 14}
                    autoComplete="off"
                    textContentType="none"
                    style={{ flex: 1, marginLeft: 10, fontSize: 19, fontWeight: '800', letterSpacing: 2, color: Genz.fg }}
                  />
                  <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show number' : 'Hide number'}>
                    <Icon name={hidden ? 'visibility' : 'visibility-off'} size={20} color={Genz.fgSoft} />
                  </Pressable>
                </View>
                {fieldError ? <Text style={{ marginTop: 6, fontSize: 12.5, color: Genz.error }}>{fieldError}</Text> : null}
                {kDemoMode ? (
                  <Pressable
                    onPress={() => setDigits(demoAadhaarNumber())}
                    style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, ...glassTile }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: Genz.fg }}>Demo mode: fill a sample number</Text>
                  </Pressable>
                ) : null}

                <Pressable onPress={() => setConsent((c) => !c)} style={{ marginTop: 18, flexDirection: 'row', alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      marginTop: 1,
                      borderRadius: 7,
                      borderWidth: 1.5,
                      borderColor: consent ? Genz.fg : Genz.strokeHi,
                      backgroundColor: consent ? Genz.fg : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {consent ? <Icon name="check" size={15} color={Genz.onFg} /> : null}
                  </View>
                  <Text style={{ flex: 1, marginLeft: 10, fontSize: 12.5, lineHeight: 18, color: Genz.fgSoft }}>
                    I consent to SyncUp verifying my identity with my Aadhaar number through UIDAI’s OTP authentication. My Aadhaar number is not
                    stored. Only the last 4 digits are kept for reference.
                  </Text>
                </Pressable>
              </StaggerIn>
            </View>
          ) : (
            <View key="otp">
              <StaggerIn delay={0} from={10}>
                <ShieldSticker />
              </StaggerIn>
              <View style={{ marginTop: 16 }}>
                <WordReveal text="Enter the OTP" style={titleStyle} />
              </View>
              <StaggerIn delay={300} from={8}>
                <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 21, color: Genz.fgSoft }}>
                  Sent to the mobile number linked to Aadhaar {maskAadhaar(last4)}.
                </Text>
              </StaggerIn>
              <StaggerIn delay={450} from={14} style={{ marginTop: 26 }}>
                <AuthOtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (error) setError(null);
                  }}
                  autofocus
                  hasError={error != null}
                  onCompleted={(v) => void verify(v)}
                />
              </StaggerIn>
              {kDemoMode ? (
                <Pressable
                  onPress={() => {
                    setOtp(kDemoOtp);
                    void verify(kDemoOtp);
                  }}
                  style={{ marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, ...glassTile }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: Genz.fg }}>Demo mode: tap to use {kDemoOtp}</Text>
                </Pressable>
              ) : null}
              <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setPhase('enter')} hitSlop={8}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: Genz.fg, textDecorationLine: 'underline' }}>Change number</Text>
                </Pressable>
                <Pressable onPress={resendIn > 0 ? undefined : () => void sendOtp()} disabled={resendIn > 0} hitSlop={8}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: resendIn > 0 ? Genz.fgFaint : Genz.fg }}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {error ? (
            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: Genz.errorSurface, borderWidth: 1, borderColor: '#5A2420' }}>
              <Icon name="error-outline" size={18} color={Genz.error} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 13, color: Genz.fg }}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {phase === 'enter' ? (
            <GenzButton text={busy ? 'Sending OTP…' : 'Send OTP'} onPressed={canSend ? () => void sendOtp() : null} loading={busy} />
          ) : (
            <GenzButton text={busy ? 'Verifying…' : 'Verify'} onPressed={otp.length === 6 ? () => void verify() : null} loading={busy} />
          )}
          <Pressable onPress={onSkip} style={{ marginTop: 14, alignSelf: 'center', padding: 4 }} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Genz.fgSoft }}>Skip for now</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ShieldSticker() {
  return (
    <Glass radius={18} intensity={45} style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="verified-user" size={28} color={Genz.fg} />
    </Glass>
  );
}

/** Full-screen "Identity verified" beat: shield pops in with expanding rings. */
function VerifiedMoment({ last4 }: { last4: string }) {
  const pop = useState(() => new Animated.Value(0))[0];
  const ring = useState(() => new Animated.Value(0))[0];
  const text = useState(() => new Animated.Value(0))[0];
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 16 }),
      Animated.parallel([
        Animated.timing(ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [pop, ring, text]);

  const rings = [0, 1, 2].map((i) => (
    <Animated.View
      key={i}
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        opacity: ring.interpolate({ inputRange: [0, 0.2 + i * 0.15, 1], outputRange: [0, 0.6 - i * 0.15, 0] }),
        transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2 + i * 0.5] }) }],
      }}
    />
  ));

  return (
    <View style={{ flex: 1, backgroundColor: Genz.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <StatusBar style="light" />
      <AmbientBackdrop intensity={1.3} />
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        {rings}
        <Animated.View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pop }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) }],
          }}
        >
          <Icon name="verified-user" size={58} color="#000000" />
        </Animated.View>
      </View>
      <Animated.View style={{ alignItems: 'center', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Text style={{ marginTop: 34, fontSize: 30, fontWeight: '900', color: Genz.fg, letterSpacing: -0.8 }}>Identity verified</Text>
        <Text style={{ marginTop: 8, fontSize: 15, color: Genz.fgSoft }}>Aadhaar {maskAadhaar(last4)}</Text>
        <ActivityIndicator style={{ marginTop: 26 }} color={Genz.fgFaint} />
      </Animated.View>
    </View>
  );
}
