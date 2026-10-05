import { ApiConstants } from '@/core/constants/apiConstants';
import { ApiClient, plainApiClient, type RequestOptions } from '@/core/network/apiClient';
import { secureStorage } from '@/core/storage/storage';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Auth-service endpoints. Uses the unauthenticated client and builds its own
 * Authorization header from the stored JWT, like the Flutter `AuthService`.
 */
export class AuthService {
  constructor(private readonly client: ApiClient = plainApiClient) {}

  private async auth(): Promise<Record<string, string>> {
    const token = await secureStorage.read('jwt_token');
    if (!token) throw new Error('No JWT token found');
    return { Authorization: `Bearer ${token}`, ...JSON_HEADERS };
  }

  /**
   * Exchange a refresh token for a fresh access JWT and a **rotated** refresh
   * token. Deliberately unauthenticated: the refresh token in the body is the
   * credential.
   */
  refreshTokens(refreshToken: string) {
    return this.client.post(ApiConstants.auth(ApiConstants.authRefresh), {
      data: { refreshToken, clientType: 'mobile' },
      headers: JSON_HEADERS,
    });
  }

  /** Get current user session information. */
  async getSession(options?: Pick<RequestOptions, 'headers'>) {
    return this.client.get(ApiConstants.auth(ApiConstants.authSession), {
      headers: options?.headers ?? (await this.auth()),
    });
  }

  /**
   * Send a backend-generated phone OTP over WhatsApp (server falls back to
   * SMS / dev-log). No auth required.
   */
  sendPhoneOtp(phone: string, channel = 'whatsapp') {
    return this.client.post(ApiConstants.auth(ApiConstants.authSendPhoneOtp), {
      data: { phone, channel },
      headers: JSON_HEADERS,
    });
  }

  // ── Phone-first signup ──────────────────────────────────────────────────────

  /**
   * The login-vs-signup gate — and the single place both OTP transports meet.
   *   • WhatsApp / Redis OTP → `{phone, otp, channel:'whatsapp'}`
   *   • Firebase SMS         → `{phone, firebaseIdToken, channel:'sms'}`
   * `otp` and `firebaseIdToken` are mutually exclusive; the unused key is left
   * out of the body entirely.
   */
  phoneSignupVerifyOtp(args: { phone: string; otp?: string; firebaseIdToken?: string; channel?: string }) {
    const { phone, otp, firebaseIdToken, channel = 'whatsapp' } = args;
    if ((otp == null) === (firebaseIdToken == null)) {
      throw new Error('phone-signup/verify-otp takes exactly one of otp / firebaseIdToken');
    }
    return this.client.post(ApiConstants.auth(ApiConstants.authPhoneSignupVerifyOtp), {
      data: {
        phone,
        ...(otp != null ? { otp } : {}),
        ...(firebaseIdToken != null ? { firebaseIdToken } : {}),
        channel,
      },
      headers: JSON_HEADERS,
    });
  }

  /** Re-mint the `phoneSignupToken` for an authenticated phone-only stub. */
  async phoneSignupRefreshIntent() {
    return this.client.post(ApiConstants.auth(ApiConstants.authPhoneSignupRefreshIntent), {
      headers: await this.auth(),
    });
  }

  /** Finalizes the **typed-email** signup only (stub Bearer + phoneSignupToken). */
  async phoneSignupCompleteEmail(args: {
    phoneSignupToken: string;
    firstName: string;
    lastName: string;
    email: string;
  }) {
    return this.client.post(ApiConstants.auth(ApiConstants.authPhoneSignupCompleteEmail), {
      data: args,
      headers: await this.auth(),
    });
  }

  /** `PATCH /user/onboarding-progress` for the **auth-entry** phase. */
  async updateOnboardingProgress(lastStep: string, meta?: Record<string, unknown>) {
    return this.client.patch(ApiConstants.auth(ApiConstants.userOnboardingProgress), {
      data: { lastStep, ...(meta && Object.keys(meta).length > 0 ? { meta } : {}) },
      headers: await this.auth(),
    });
  }

  /** Email OTP during phone-first signup. Public. */
  phoneSignupSendEmailOtp(email: string) {
    return this.client.post(ApiConstants.auth(ApiConstants.authSendEmailOtp), {
      data: { email },
      headers: JSON_HEADERS,
    });
  }

  /** Verify the email OTP and attach the email to the phone stub. Public. */
  phoneSignupVerifyEmailOtp(args: { email: string; otp: string; phoneSignupToken: string }) {
    return this.client.post(ApiConstants.auth(ApiConstants.authVerifyEmailOtp), {
      data: args,
      headers: JSON_HEADERS,
    });
  }

  /**
   * Authenticate or register with a Google ID token (mobile flow).
   * Both proofs are sent: the phoneSignupToken in the body **and** the stub's
   * session as a Bearer header (only when a session exists).
   */
  async googleMobile(args: { idToken: string; intent?: string; phoneSignupToken?: string }) {
    const { idToken, intent = 'login', phoneSignupToken } = args;
    const sessionToken = await secureStorage.read('jwt_token');
    return this.client.post(ApiConstants.auth(ApiConstants.authGoogleMobile), {
      data: {
        idToken,
        intent,
        ...(phoneSignupToken ? { phoneSignupToken } : {}),
      },
      headers: {
        ...JSON_HEADERS,
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
    });
  }

  /** Check whether an email is available for registration. */
  checkEmail(email: string) {
    return this.client.post(ApiConstants.auth(ApiConstants.authCheckEmail), {
      data: { email },
      headers: JSON_HEADERS,
    });
  }

  /** `PUT /user` — update profile identity fields. */
  async updateProfile(req: { name?: string; userTitle?: string; profilePic?: string; profilePicId?: string }) {
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(req)) if (v != null) data[k] = v;
    return this.client.put(ApiConstants.auth(ApiConstants.userUpdate), { data, headers: await this.auth() });
  }

  /**
   * Update the user's onboarding profile completion status
   * (`not_started`, `skipped`, `skills_added`, …, `completed`).
   */
  async updateProfileCompletionStatus(status: string) {
    return this.client.patch(ApiConstants.userProfileCompletionStatus, {
      params: { status },
      headers: await this.auth(),
    });
  }
}
