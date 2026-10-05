import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { kDemoMode, kDemoOtp } from '@/core/demo/demoMode';
import { accentRed, authActionColor, textMuted } from '@/core/theme/colors';
import { Text } from '@/shared/ui/Text';
import { kOtpResendSeconds } from '../providers/signupFlowStore';
import { AuthEntryScaffold } from './AuthEntryScaffold';
import { AuthOtpInput } from './AuthOtpInput';

export function ResendOtpButton({
  canResend,
  secondsRemaining,
  onResend,
}: {
  canResend: boolean;
  secondsRemaining: number;
  onResend: () => void;
}) {
  return (
    <Pressable onPress={canResend ? onResend : undefined} disabled={!canResend} hitSlop={8}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: canResend ? authActionColor : textMuted,
          textDecorationLine: canResend ? 'underline' : 'none',
        }}
      >
        {canResend ? 'Resend OTP' : `Resend OTP in ${secondsRemaining}s`}
      </Text>
    </Pressable>
  );
}

/**
 * The OTP screen, used by **both** mobile and email verification. Auto-submits
 * on the 6th digit; a wrong code paints the error treatment without clearing.
 */
export function OtpVerificationView({
  title,
  subtitle,
  onVerify,
  onResend,
  onBack,
  resendSeconds = kOtpResendSeconds,
}: {
  title: string;
  subtitle: string;
  /** Resolves null on success, or the message to show inline. */
  onVerify: (code: string) => Promise<string | null>;
  /** Resolves the cooldown to apply next. */
  onResend: () => Promise<number | null>;
  onBack: () => void;
  resendSeconds?: number;
}) {
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const serverResend = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const verifyingRef = useRef(false);

  const startTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    let left = serverResend.current ?? resendSeconds;
    setSecondsLeft(left);
    setCanResend(false);
    timer.current = setInterval(() => {
      if (left <= 1) {
        if (timer.current) clearInterval(timer.current);
        setSecondsLeft(0);
        setCanResend(true);
      } else {
        left -= 1;
        setSecondsLeft(left);
      }
    }, 1000);
  }, [resendSeconds]);

  useEffect(() => {
    mounted.current = true;
    startTimer();
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [startTimer]);

  const verify = async (value = code) => {
    if (verifyingRef.current || value.trim().length !== 6) return;
    Keyboard.dismiss();
    verifyingRef.current = true;
    setVerifying(true);
    const error = await onVerify(value.trim());
    verifyingRef.current = false;
    if (!mounted.current) return;
    setVerifying(false);
    setErrorText(error);
  };

  const resend = async () => {
    const seconds = await onResend();
    if (!mounted.current) return;
    setCode('');
    setErrorText(null);
    if (seconds != null) serverResend.current = seconds;
    startTimer();
  };

  const canSubmit = code.trim().length === 6;
  return (
    <AuthEntryScaffold
      title={title}
      subtitle={subtitle}
      onBack={verifying ? null : onBack}
      ctaLabel={verifying ? 'Verifying...' : 'Verify & Continue'}
      onCta={canSubmit && !verifying ? () => verify() : null}
    >
      <View>
        <AuthOtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (errorText) setErrorText(null);
          }}
          autofocus
          hasError={errorText != null}
          onCompleted={(v) => verify(v)}
        />
        {errorText ? <Text style={{ marginTop: 8, fontSize: 12, color: accentRed }}>{errorText}</Text> : null}
        {kDemoMode ? (
          <Pressable onPress={() => verify(kDemoOtp)} style={{ marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>Demo mode: tap to use {kDemoOtp}</Text>
          </Pressable>
        ) : null}
        <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
          <ResendOtpButton canResend={canResend && !verifying} secondsRemaining={secondsLeft} onResend={resend} />
        </View>
      </View>
    </AuthEntryScaffold>
  );
}
