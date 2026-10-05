// Auth Service API data models (live subset of lib/features/auth/data/models).

const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
const optStr = (v: unknown): string | undefined => (v == null ? undefined : String(v));

export interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  profilePic: string;
  userTitle: string;
  banner?: string;
  currentLocation?: string;
  gender?: string;
  role: string;
  impressionCount: number;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function userFromJson(json: Record<string, any>): User {
  return {
    id: str(json.id),
    userId: str(json.userId),
    name: str(json.name),
    email: str(json.email),
    phone: str(json.phone),
    profilePic: str(json.profilePic),
    userTitle: str(json.userTitle),
    banner: optStr(json.banner),
    currentLocation: optStr(json.currentLocation),
    gender: optStr(json.gender),
    role: str(json.role),
    impressionCount: typeof json.impressionCount === 'number' ? json.impressionCount : 0,
    phoneVerified: json.phoneVerified === true,
    emailVerified: json.emailVerified === true,
    createdAt: str(json.createdAt),
    updatedAt: str(json.updatedAt),
  };
}

/**
 * Result of `POST /auth/send-phone-otp` — the backend-generated (WhatsApp-first)
 * phone OTP send. [resendAfterSeconds] drives the resend cooldown; [channel]
 * reports which channel actually delivered the code (e.g. `whatsapp`).
 */
export interface PhoneOtpSendResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  channel: string;
}

export function phoneOtpSendResultFromJson(json: Record<string, any>): PhoneOtpSendResult {
  return {
    expiresInSeconds: Number.isFinite(Number(json.expiresInSeconds)) ? Math.trunc(Number(json.expiresInSeconds)) : 600,
    resendAfterSeconds: Number.isFinite(Number(json.resendAfterSeconds))
      ? Math.trunc(Number(json.resendAfterSeconds))
      : 60,
    channel: json.channel != null ? String(json.channel) : 'whatsapp',
  };
}

export interface GoogleAuthResponse {
  token: string;
  user?: User;
  registrationCompleted: boolean;
}

export function googleAuthResponseFromJson(json: Record<string, any>): GoogleAuthResponse {
  const rawUser = json.user;
  return {
    token: String(json.token),
    user:
      rawUser && typeof rawUser === 'object' && Object.keys(rawUser).length > 0
        ? userFromJson(rawUser)
        : undefined,
    registrationCompleted: json.registrationCompleted === true,
  };
}

/** Result type for handling success/error states (Flutter `Result<T>`). */
export type Result<T> = { isSuccess: true; data: T; error?: undefined } | { isSuccess: false; data?: undefined; error: string };

export const Result = {
  success<T>(data: T): Result<T> {
    return { isSuccess: true, data };
  },
  error<T = never>(error: string): Result<T> {
    return { isSuccess: false, error };
  },
};
