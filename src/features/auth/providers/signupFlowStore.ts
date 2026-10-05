import { create } from 'zustand';

import { authManager } from '@/core/auth/authManager';
import type { PickedFile } from '@/core/files/pickedFile';

/**
 * Backend rate limit for OTP resend. Used as the fallback when a response
 * doesn't carry one — the server's value always wins.
 */
export const kOtpResendSeconds = 60;

/**
 * Channel the mobile code was **actually delivered** over.
 *   • whatsapp / dev — the backend's own Redis OTP.
 *   • sms — **Firebase Phone Auth** (exchanged for a backend session via
 *     `phone-signup/verify-otp` with a `firebaseIdToken`).
 */
export type OtpChannel = 'whatsapp' | 'sms' | 'dev';

export const OtpChannels = {
  isFirebaseSms: (c: OtpChannel) => c === 'sms',
  /** What `send-phone-otp` / `verify-otp` accept. */
  wireValue: (c: OtpChannel) => (c === 'sms' ? 'sms' : 'whatsapp'),
  parse: (v: unknown): OtpChannel => (v === 'sms' ? 'sms' : v === 'dev' ? 'dev' : 'whatsapp'),
};

/** How the account's email was established. */
export type EmailRoute = 'typed' | 'google';

/** Values collected across the auth-entry screens. */
export interface SignupFlowState {
  /** 10 digits, no country code (`+91` implicit). */
  phone: string;
  channel: OtpChannel;
  email: string;
  emailRoute?: EmailRoute;
  firstName: string;
  lastName: string;
  /** Avatar carried over from Google sign-in. */
  photoUrl?: string;
  /** Locally picked avatar; wins over [photoUrl]. */
  photoFile?: PickedFile;
  /** The user explicitly removed the avatar (Google photo must be DELETEd). */
  photoRemoved: boolean;
  phoneSignupToken?: string;
  phoneSignupTokenExpiresAt?: number;
  resendAfterSeconds: number;
  /** Firebase `verificationId` for the SMS path. */
  verificationId?: string;
  /** A Firebase SMS session exists, so resend should force a new code. */
  firebaseCanResend?: boolean;
}

const initial: SignupFlowState = {
  phone: '',
  channel: 'whatsapp',
  email: '',
  firstName: '',
  lastName: '',
  photoRemoved: false,
  resendAfterSeconds: kOtpResendSeconds,
};

/**
 * Seeds from a signup that survived an app restart (AuthManager re-minted the
 * stub token during `initialize()`), including the attached email.
 */
function seed(): SignupFlowState {
  const pending = authManager.pendingPhoneSignup;
  if (!pending) return { ...initial };
  return {
    ...initial,
    phone: pending.phone,
    phoneSignupToken: pending.token,
    email: pending.attachedEmail ?? '',
    emailRoute: pending.attachedEmail ? 'typed' : undefined,
  };
}

interface SignupFlowActions {
  /** Re-seed from AuthManager (after initialize()). */
  hydrate: () => void;
  /** Switching to a backend channel drops any Firebase verification session. */
  setPhone: (phone: string, channel: OtpChannel) => void;
  setFirebaseSmsContext: (verificationId: string, canResend?: boolean) => void;
  setEmail: (email: string) => void;
  setGoogleAccount: (a: { email: string; firstName: string; lastName: string; photoUrl?: string }) => void;
  setPhotoFile: (file: PickedFile) => void;
  removePhoto: () => void;
  setPhoneSignupToken: (token: string | undefined | null, opts?: { expiresInSeconds?: number; phone?: string }) => void;
  setResendAfterSeconds: (s: number) => void;
  setName: (firstName: string, lastName: string) => void;
  reset: () => void;
}

export const useSignupFlow = create<SignupFlowState & SignupFlowActions>((set, get) => ({
  ...seed(),
  hydrate: () => {
    const s = get();
    if (!s.phoneSignupToken) set(seed());
  },
  setPhone: (phone, channel) =>
    set({
      phone,
      channel,
      ...(OtpChannels.isFirebaseSms(channel) ? {} : { verificationId: undefined, firebaseCanResend: undefined }),
    }),
  setFirebaseSmsContext: (verificationId, canResend) =>
    set((s) => ({ channel: 'sms', verificationId, firebaseCanResend: canResend ?? s.firebaseCanResend })),
  setEmail: (email) => set({ email, emailRoute: 'typed' }),
  setGoogleAccount: ({ email, firstName, lastName, photoUrl }) =>
    set((s) => ({ email, emailRoute: 'google', firstName, lastName, photoUrl: photoUrl ?? s.photoUrl })),
  setPhotoFile: (file) => set({ photoFile: file, photoRemoved: false }),
  removePhoto: () => set({ photoFile: undefined, photoUrl: undefined, photoRemoved: true }),
  setPhoneSignupToken: (token, opts) => {
    if (!token) return;
    set((s) => ({
      phoneSignupToken: token,
      phone: opts?.phone ?? s.phone,
      phoneSignupTokenExpiresAt:
        opts?.expiresInSeconds == null ? s.phoneSignupTokenExpiresAt : Date.now() + opts.expiresInSeconds * 1000,
    }));
  },
  setResendAfterSeconds: (resendAfterSeconds) => set({ resendAfterSeconds }),
  setName: (firstName, lastName) => set({ firstName, lastName }),
  reset: () => set({ ...initial }),
}));

export const signupFlow = {
  get: () => useSignupFlow.getState(),
  hasPhoto: (s: SignupFlowState) => s.photoFile != null || !!s.photoUrl,
  hasPhoneSignupToken: (s: SignupFlowState) => !!s.phoneSignupToken,
  hasFirebaseSmsContext: (s: SignupFlowState) => OtpChannels.isFirebaseSms(s.channel) && !!s.verificationId,
  /** `91******06` — the masked form shown in the verify-mobile subtitle. */
  maskedPhone: (s: SignupFlowState) => (s.phone.length < 10 ? s.phone : `91******${s.phone.substring(8)}`),
  otpSentDescription: (s: SignupFlowState) => {
    const m = signupFlow.maskedPhone(s);
    switch (s.channel) {
      case 'whatsapp':
        return `We've sent a 6-digit code via WhatsApp to ${m}.`;
      case 'sms':
        return `We've sent a 6-digit code via SMS to ${m}.`;
      default:
        return `A 6-digit code was generated for ${m} (dev delivery).`;
    }
  },
};
