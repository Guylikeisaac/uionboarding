import type * as FirebaseAuthModule from '@react-native-firebase/auth';
import type * as GoogleSigninModule from '@react-native-google-signin/google-signin';

import { authManager, decodeJwtPayload } from '@/core/auth/authManager';
import { AuthConfig } from '@/core/constants/authConfig';
import { errorBody, isHttpError, statusOf } from '@/core/network/apiClient';
import { AuthService } from '../data/authService';
import { Result } from '../data/authModels';
import { kOtpResendSeconds, OtpChannels, useSignupFlow, type OtpChannel } from '../providers/signupFlowStore';

// Native auth SDKs load lazily: they exist only in a development build, so the
// app (in demo mode) still opens in Expo Go. Any failure surfaces through the
// callers' existing error paths.
let firebaseModule: typeof FirebaseAuthModule | null = null;
let googleModule: typeof GoogleSigninModule | null = null;
const firebase = (): typeof FirebaseAuthModule => (firebaseModule ??= require('@react-native-firebase/auth'));
const google = (): typeof GoogleSigninModule => (googleModule ??= require('@react-native-google-signin/google-signin'));
const getAuth = () => firebase().getAuth();
const firebaseSignOut = (auth: ReturnType<typeof getAuth>) => firebase().signOut(auth);

/** What `send-phone-otp` reported back. */
export interface OtpSendResult {
  resendAfterSeconds: number;
  /** The channel that actually carried the code. */
  deliveredChannel: OtpChannel;
}

/** The identity Google handed back, used to fill the email + name steps. */
export interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  idToken: string;
}

/**
 * Google exposes a single display name, so the split is positional: the first
 * token is the given name and everything after it is the surname.
 */
export function googleProfileFromDisplayName(args: {
  email: string;
  displayName?: string | null;
  idToken: string;
  photoUrl?: string | null;
}): GoogleProfile {
  const parts = (args.displayName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    email: args.email.trim(),
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
    photoUrl: args.photoUrl ?? undefined,
    idToken: args.idToken,
  };
}

/** Result of `POST /auth/google/mobile`. */
export interface GoogleAuthOutcome {
  registrationCompleted: boolean;
  /** False when the backend created a separate Google account. */
  linkedToPhoneStub: boolean;
}

/** Result of `complete-email`. [needsEmailOtp] is not a failure. */
export interface CompleteEmailOutcome {
  needsEmailOtp: boolean;
}

/** Outcome of the phone OTP gate — the fork the whole entry flow turns on. */
export interface PhoneVerifyOutcome {
  /** Existing completed account; the session is already adopted. */
  isLogin: boolean;
  /** Incomplete signup: continue to email capture. */
  needsEmailCompletion: boolean;
}

const service = new AuthService();
const flow = () => useSignupFlow.getState();

/** Firebase requires E.164; the flow stores bare 10 digits and assumes `+91`. */
function e164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
  return `+91${last10}`;
}

function errorCode(e: unknown): string | undefined {
  const body = errorBody(e);
  const data = body && typeof body === 'object' ? (body as any).data : undefined;
  return data && typeof data === 'object' && data.code != null ? String(data.code) : undefined;
}

/**
 * Server message first, then a per-status default. Validation failures come
 * back as "Validation failed" with the usable text in `errors[]`.
 */
function message(e: unknown, fallbacks: Record<number, string>): string {
  if (!isHttpError(e)) return 'Something went wrong. Please try again.';
  const status = statusOf(e);
  const body = errorBody(e);
  if (__DEV__) console.log(`❌ ${e.config?.url} (${status}):`, body);
  if (body && typeof body === 'object') {
    const errors = (body as any).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = String(errors[0]);
      const colon = first.indexOf(': ');
      return colon === -1 ? first : first.substring(colon + 2);
    }
    const msg = (body as any).message?.toString();
    if (msg && msg.toLowerCase() !== 'validation failed') return msg;
  }
  return (status != null ? fallbacks[status] : undefined) ?? 'Something went wrong. Please try again.';
}

/** Firebase error codes → copy a user can act on. */
function firebaseMessage(e: any): string {
  const code = String(e?.code ?? '').replace(/^auth\//, '');
  switch (code) {
    case 'invalid-verification-code':
      return "That code isn't right. Check it and try again.";
    case 'invalid-verification-id':
    case 'session-expired':
    case 'code-expired':
      return 'This code has expired. Request a new one.';
    case 'invalid-phone-number':
      return 'Enter a valid 10-digit mobile number.';
    case 'too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'quota-exceeded':
      return 'SMS limit reached for now. Try WhatsApp instead.';
    case 'network-request-failed':
      return 'Network error. Please check your connection.';
    case 'invalid-app-credential':
    case 'missing-client-identifier':
    case 'app-not-authorized':
      return "SMS verification isn't available on this build. Please use WhatsApp instead.";
    default:
      return e?.message ?? "Couldn't send the SMS. Please try again.";
  }
}

async function signOutFirebaseIfSms(channel: OtpChannel) {
  if (!OtpChannels.isFirebaseSms(channel)) return;
  try {
    await firebaseSignOut(getAuth());
  } catch {
    // ignore
  }
}

/** Fire-and-forget auth-phase `lastStep` marker. */
function recordAuthProgress(lastStep: string) {
  service.updateOnboardingProgress(lastStep).catch((e) => {
    if (__DEV__) console.log(`⚠️ auth onboarding-progress (${lastStep}) not recorded:`, e);
  });
}

/**
 * Orchestrates the phone-first signup endpoints and maps transport failures
 * to messages a user can act on. Two OTP transports, one gate:
 * WhatsApp ([sendPhoneOtp] → [verifyPhoneOtp]) and Firebase SMS
 * ([sendFirebaseSms] → [verifyFirebaseSms]); both finish at
 * `phone-signup/verify-otp`.
 */
export const phoneSignupController = {
  /** Sends the backend (WhatsApp/Redis) OTP and reports what was used. */
  async sendPhoneOtp(phone: string, channel: OtpChannel = 'whatsapp'): Promise<Result<OtpSendResult>> {
    try {
      const res = await service.sendPhoneOtp(phone, OtpChannels.wireValue(channel));
      const data = res.data?.data;
      const resend = typeof data?.resendAfterSeconds === 'number' ? data.resendAfterSeconds : undefined;
      const delivered = OtpChannels.parse(data?.channel);
      return Result.success({ resendAfterSeconds: resend ?? kOtpResendSeconds, deliveredChannel: delivered });
    } catch (e) {
      if (!isHttpError(e)) return Result.error("Couldn't send the code. Please try again.");
      return Result.error(
        message(e, {
          400: 'Enter a valid 10-digit mobile number.',
          429: 'Too many requests. Wait a minute before trying again.',
        }),
      );
    }
  },

  /**
   * Firebase Phone Auth SEND — the "Send via SMS instead" path. Bounded wait:
   * native callbacks are not guaranteed to fire.
   */
  async sendFirebaseSms(phone: string, forceResend = false): Promise<Result<OtpSendResult>> {
    let auth: ReturnType<typeof getAuth>;
    try {
      auth = getAuth();
    } catch {
      return Result.error("SMS isn't available on this build. Use WhatsApp instead.");
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // no current user
    }

    return new Promise<Result<OtpSendResult>>((resolve) => {
      let done = false;
      const finish = (r: Result<OtpSendResult>) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(
        () => finish(Result.error('SMS is taking too long. Try again, or use WhatsApp instead.')),
        75_000,
      );
      try {
        const listener = firebase().verifyPhoneNumber(auth, e164(phone), 60, forceResend);
        listener.on(
          'state_changed',
          (snapshot: any) => {
            if (snapshot.state === 'sent') {
              flow().setFirebaseSmsContext(snapshot.verificationId, true);
              finish(Result.success({ resendAfterSeconds: kOtpResendSeconds, deliveredChannel: 'sms' }));
            } else if (snapshot.state === 'timeout') {
              // Same id — keeps manual entry working after auto-retrieval gives up.
              if (snapshot.verificationId) flow().setFirebaseSmsContext(snapshot.verificationId);
            } else if (snapshot.state === 'error') {
              finish(Result.error(firebaseMessage(snapshot.error)));
            }
            // 'verified' (Android instant verification) is deliberately a
            // no-op: the user types the code.
          },
          (error: any) => finish(Result.error(firebaseMessage(error))),
        );
      } catch (e) {
        if (__DEV__) console.log('❌ firebase verifyPhoneNumber threw:', e);
        finish(Result.error("Couldn't send the SMS. Please try again."));
      }
    });
  },

  /** Verifies a backend (WhatsApp) OTP and adopts whichever session comes back. */
  verifyPhoneOtp(phone: string, otp: string, channel: OtpChannel): Promise<Result<PhoneVerifyOutcome>> {
    return exchangeForSession({ phone, otp, channel });
  },

  /**
   * Confirms a Firebase SMS code, then exchanges the Firebase ID token for a
   * backend session at the same gate the WhatsApp path uses.
   */
  async verifyFirebaseSms(phone: string, smsCode: string, verificationId: string): Promise<Result<PhoneVerifyOutcome>> {
    let idToken: string;
    try {
      const credential = firebase().PhoneAuthProvider.credential(verificationId, smsCode);
      const userCredential = await firebase().signInWithCredential(getAuth(), credential);
      const token = await userCredential.user?.getIdToken();
      if (!token) return Result.error("Couldn't confirm the code. Please try again.");
      idToken = token;
    } catch (e: any) {
      if (e?.code) return Result.error(firebaseMessage(e));
      return Result.error("Couldn't verify the code. Please try again.");
    }
    return exchangeForSession({ phone, firebaseIdToken: idToken, channel: 'sms' });
  },

  /** Re-mints the `phoneSignupToken` for a half-finished signup. */
  async refreshIntent(): Promise<boolean> {
    try {
      const res = await service.phoneSignupRefreshIntent();
      const data = res.data?.data;
      if (!data || typeof data !== 'object') return false;
      flow().setPhoneSignupToken(data.phoneSignupToken?.toString(), {
        expiresInSeconds: typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : undefined,
        phone: data.phone?.toString(),
      });
      return data.needsEmailCompletion === true;
    } catch {
      return false;
    }
  },

  /**
   * Pre-flights `POST /auth/check-email`. Advisory — failures fall through to
   * send-email-otp, which does its own authoritative rejection.
   */
  async emailUnavailableReason(email: string): Promise<string | null> {
    try {
      const res = await service.checkEmail(email);
      const raw = res.data;
      const data = raw && typeof raw === 'object' ? raw.data : undefined;
      const body = data && typeof data === 'object' ? data : raw && typeof raw === 'object' ? raw : null;
      if (!body) return null;
      const available = body.available ?? body.isAvailable;
      const exists = body.exists ?? body.userExists ?? body.registered;
      if (available === false || exists === true) {
        return 'That email is already registered. Sign in with it instead, or use a different address.';
      }
      return null;
    } catch {
      return null;
    }
  },

  async sendEmailOtp(email: string): Promise<Result<number>> {
    const unavailable = await phoneSignupController.emailUnavailableReason(email);
    if (unavailable) return Result.error(unavailable);
    try {
      const res = await service.phoneSignupSendEmailOtp(email);
      const resend = res.data?.data?.resendAfterSeconds;
      return Result.success(typeof resend === 'number' ? resend : kOtpResendSeconds);
    } catch (e) {
      if (!isHttpError(e)) return Result.error("Couldn't send the code. Please try again.");
      return Result.error(
        message(e, {
          400: "That email can't be used. Try another one.",
          429: 'Too many requests. Wait a minute before trying again.',
        }),
      );
    }
  },

  /**
   * Native Google Sign-In. Resolves `null` (inside a success) when the user
   * dismissed the picker. The ID token is minted against the backend's web
   * client id (`webClientId`) so `google/mobile` accepts its audience.
   */
  async signInWithGoogleProfile(): Promise<Result<GoogleProfile | null>> {
    if (!AuthConfig.googleServerClientId) {
      return Result.error("Google Sign-In isn't configured. Please use email instead.");
    }
    try {
      const { GoogleSignin } = google();
      GoogleSignin.configure({
        webClientId: AuthConfig.googleServerClientId,
        iosClientId: AuthConfig.googleIosClientId,
        scopes: ['email'],
      });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Clear any cached grant so the picker always appears.
      try {
        await GoogleSignin.signOut();
      } catch {
        // not signed in
      }
      const res = await GoogleSignin.signIn();
      if (res.type !== 'success') return Result.success(null);
      const { idToken, user } = res.data;
      if (!idToken) {
        return Result.error("Google sign-in isn't available on this build. Use email instead.");
      }
      const claims = decodeJwtPayload(idToken);
      const given = claims?.given_name?.toString().trim() ?? user.givenName?.trim() ?? '';
      const family = claims?.family_name?.toString().trim() ?? user.familyName?.trim() ?? '';
      const profile: GoogleProfile = given
        ? { email: user.email.trim(), firstName: given, lastName: family, photoUrl: user.photo ?? undefined, idToken }
        : googleProfileFromDisplayName({ email: user.email, displayName: user.name, photoUrl: user.photo, idToken });
      if (!profile.email) return Result.error("Google didn't share an email address. Use email instead.");
      return Result.success(profile);
    } catch (e) {
      const native = googleModule;
      if (!native) return Result.error("Google sign-in isn't available on this build. Use email instead.");
      const { isErrorWithCode, statusCodes } = native;
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) return Result.success(null);
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return Result.error('Google Play Services is unavailable on this device. Use email instead.');
        }
        if (String(e.code) === '7' || /network/i.test(e.message)) {
          return Result.error('Network error during Google sign-in. Check your connection.');
        }
        return Result.error("Google sign-in isn't available on this build. Use email instead.");
      }
      return Result.error('Google sign-in failed. Please try again.');
    }
  },

  async verifyEmailOtp(email: string, otp: string): Promise<Result<void>> {
    const token = flow().phoneSignupToken;
    if (!token) return Result.error('Your signup session expired. Start again.');
    try {
      const res = await service.phoneSignupVerifyEmailOtp({ email, otp, phoneSignupToken: token });
      // The email is now on the stub; move the local pending-signup flag.
      authManager.markPhoneSignupEmailCompleted(email);
      const user = res.data?.data?.user;
      if (user && typeof user === 'object' && user.profileCompletionStatus != null) {
        authManager.syncProfileCompletionStatus(String(user.profileCompletionStatus));
      }
      return Result.success(undefined);
    } catch (e) {
      if (!isHttpError(e)) return Result.error("Couldn't verify the code. Please try again.");
      return Result.error(message(e, { 400: "That code isn't right. Check it and try again." }));
    }
  },

  /**
   * Finalizes the **typed-email** signup. Returns `needsEmailOtp` — a success —
   * when the backend reports the address unverified (`EMAIL_NOT_VERIFIED`).
   */
  async completeEmail(firstName: string, lastName: string, email: string): Promise<Result<CompleteEmailOutcome>> {
    const token = flow().phoneSignupToken;
    if (!token) return Result.error('Your signup session expired. Start again.');
    const resolved = email.trim() || authManager.pendingPhoneSignup?.attachedEmail || '';
    if (!resolved) return Result.error("We couldn't find the email for this signup. Go back and add it.");
    try {
      const res = await service.phoneSignupCompleteEmail({ phoneSignupToken: token, firstName, lastName, email: resolved });
      const data = res.data?.data;
      if (data && typeof data === 'object') await authManager.adoptSession(data);
      recordAuthProgress('/user/register/name');
      return Result.success({ needsEmailOtp: false });
    } catch (e) {
      if (statusOf(e) === 400 && errorCode(e) === 'EMAIL_NOT_VERIFIED') {
        return Result.success({ needsEmailOtp: true });
      }
      if (!isHttpError(e)) return Result.error("Couldn't finish signup. Please try again.");
      return Result.error(
        message(e, {
          400: "We couldn't finish signup. Check your details and try again.",
          401: 'Your signup session expired. Start again.',
        }),
      );
    }
  },

  /**
   * Saves the display name on the **Google** route and advances
   * `profileCompletionStatus` to `profile_added`.
   */
  async saveGoogleName(firstName: string, lastName: string): Promise<Result<void>> {
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    if (!name) return Result.error('Please enter your name.');
    try {
      await service.updateProfile({ name });
      authManager.applyLocalProfileEdits({ name });
      const status = 'profile_added';
      try {
        await service.updateProfileCompletionStatus(status);
      } catch (e) {
        if (__DEV__) console.log(`⚠️ profile-completion-status (${status}) not recorded:`, e);
      }
      authManager.syncProfileCompletionStatus(status);
      recordAuthProgress('/user/register/name');
      return Result.success(undefined);
    } catch (e) {
      if (!isHttpError(e)) return Result.error("Couldn't save your name. Please try again.");
      return Result.error(
        message(e, {
          400: "We couldn't save your name. Check it and try again.",
          401: 'Your session expired. Please sign in again.',
        }),
      );
    }
  },

  /**
   * Hands Google's ID token to the backend, which links it to the verified
   * phone signup and returns a session. The returned phone is checked against
   * the number just verified.
   */
  async signInWithGoogleBackend(idToken: string, intent = 'register'): Promise<Result<GoogleAuthOutcome>> {
    try {
      const res = await service.googleMobile({ idToken, intent, phoneSignupToken: flow().phoneSignupToken });
      const data = res.data?.data;
      if (!data || typeof data !== 'object') return Result.error('Unexpected response. Please try again.');
      const expectedPhone = flow().phone;
      const returnedPhone = data.user && typeof data.user === 'object' ? data.user.phone?.toString().trim() : undefined;
      const linked = !expectedPhone || !returnedPhone || returnedPhone.endsWith(expectedPhone);
      await authManager.adoptSession(data);
      return Result.success({ registrationCompleted: data.registrationCompleted === true, linkedToPhoneStub: linked });
    } catch (e) {
      if (errorCode(e) === 'PHONE_SIGNUP_REQUIRED') {
        return Result.error(
          "We couldn't link Google to your number. Go back and verify your mobile number again, or continue with email.",
        );
      }
      if (!isHttpError(e)) return Result.error('Google sign-in failed. Please try again.');
      return Result.error(
        message(e, {
          400: 'Google sign-in failed. Please try again.',
          401: "Google couldn't be verified. Please try again.",
          403: 'This account has been blocked.',
        }),
      );
    }
  },
};

/** Shared tail of both transports. */
async function exchangeForSession(args: {
  phone: string;
  channel: OtpChannel;
  otp?: string;
  firebaseIdToken?: string;
}): Promise<Result<PhoneVerifyOutcome>> {
  const { phone, channel, otp, firebaseIdToken } = args;
  try {
    const res = await service.phoneSignupVerifyOtp({
      phone,
      otp,
      firebaseIdToken,
      channel: OtpChannels.wireValue(channel),
    });
    const data = res.data?.data;
    if (!data || typeof data !== 'object') return Result.error('Unexpected response. Please try again.');

    await authManager.adoptSession(data);

    const isLogin = data.isLogin === true;
    if (!isLogin) {
      flow().setPhoneSignupToken(data.phoneSignupToken?.toString(), {
        expiresInSeconds: typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : undefined,
      });
      recordAuthProgress('/user/otpverify');
    }
    return Result.success({ isLogin, needsEmailCompletion: data.needsEmailCompletion === true });
  } catch (e) {
    await signOutFirebaseIfSms(channel);
    if (!isHttpError(e)) return Result.error("Couldn't verify the code. Please try again.");
    return Result.error(
      message(e, {
        400: firebaseIdToken
          ? "We couldn't complete verification. Please request a new code."
          : "That code isn't right. Check it and try again.",
        403: 'This account has been blocked.',
        429: 'Too many attempts. Request a new code in a minute.',
      }),
    );
  }
}
