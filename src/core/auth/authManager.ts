import { useSyncExternalStore } from 'react';

import { welcomeSheetStateStore, WelcomeSheetStateStore } from '../services/welcomeSheetStateStore';
import { secureStorage } from '../storage/storage';
import { serverMessage, statusOf } from '../network/apiClient';
import { AuthService } from '@/features/auth/data/authService';
import {
  googleAuthResponseFromJson,
  phoneOtpSendResultFromJson,
  Result,
  userFromJson,
  type GoogleAuthResponse,
  type PhoneOtpSendResult,
  type User,
} from '@/features/auth/data/authModels';

/**
 * An in-progress phone-first signup, re-minted by
 * `POST /auth/phone-signup/refresh-intent`.
 */
export class PhoneSignupIntent {
  constructor(
    /** Short-lived token tying the email steps to this phone stub. */
    readonly token: string,
    readonly phone: string,
    /**
     * The server's flag, verbatim. **It does not mean "no email on record"** —
     * it tracks whether `phone-signup/complete-email` (which captures the
     * *name*) has run. Use [needsEmailEntry] to decide on the email screens.
     */
    readonly needsEmailCompletion: boolean,
    /** Email already attached to this stub, read from the session claim. */
    readonly attachedEmail?: string,
  ) {}

  /** Whether the user still has to *type and verify* an email. */
  get needsEmailEntry(): boolean {
    return (this.attachedEmail ?? '').length === 0;
  }

  copyWith(p: { needsEmailCompletion?: boolean; attachedEmail?: string }): PhoneSignupIntent {
    return new PhoneSignupIntent(
      this.token,
      this.phone,
      p.needsEmailCompletion ?? this.needsEmailCompletion,
      p.attachedEmail ?? this.attachedEmail,
    );
  }
}

const TOKEN_KEY = 'jwt_token';
const USER_DATA_KEY = 'user_data';
const REFRESH_TOKEN_KEY = 'refresh_token';
const LAST_LOGIN_KEY = 'last_login';

/** Refresh this far ahead of expiry (ms). */
const REFRESH_LEAD_TIME = 60_000;

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const binary = globalThis.atob(padded);
  // UTF-8 decode
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Decode JWT payload without verifying the signature (claims only). */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch (e) {
    if (__DEV__) console.log('❌ JWT decode error:', e);
    return null;
  }
}

function expiryOf(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

function claimUser(token: string | null | undefined): Record<string, any> | undefined {
  if (!token) return undefined;
  const u = decodeJwtPayload(token)?.user;
  return u && typeof u === 'object' ? u : undefined;
}

/** Non-empty `user.email` from a decoded JWT claim, else undefined. */
function claimEmail(claim?: Record<string, any>): string | undefined {
  const email = claim?.email?.toString().trim();
  return email ? email : undefined;
}

/**
 * AuthManager handles all authentication-related operations: token storage,
 * refresh, session adoption and the session-derived fields the router's
 * redirect ladder reads. Singleton + listener set (Flutter `ChangeNotifier`).
 */
export class AuthManager {
  private static _instance: AuthManager | null = null;
  static get instance(): AuthManager {
    return (AuthManager._instance ??= new AuthManager());
  }

  private readonly authService = new AuthService();
  private listeners = new Set<() => void>();
  /** Bumped on every notify so `useSyncExternalStore` sees a new snapshot. */
  private version = 0;

  private _currentUser: User | null = null;
  private _currentToken: string | null = null;
  private _isAuthenticated = false;
  private _isLoading = false;
  private _phoneVerified = false;
  private _profileCompletionStatus = 'not_started';
  private _isInitialized = false;
  private _accessTokenExpiry: number | null = null;
  private _refreshInFlight: Promise<boolean> | null = null;
  private _sessionExpired = false;
  private _pendingPhoneSignup: PhoneSignupIntent | null = null;

  // ── Getters ────────────────────────────────────────────────────────────────
  get currentUser() {
    return this._currentUser;
  }
  get currentToken() {
    return this._currentToken;
  }
  get isAuthenticated() {
    return this._isAuthenticated;
  }
  get isLoading() {
    return this._isLoading;
  }
  get phoneVerified() {
    return this._phoneVerified;
  }
  get profileCompletionStatus() {
    return this._profileCompletionStatus;
  }
  get isInitialized() {
    return this._isInitialized;
  }
  get isFullyOnboarded() {
    return this._isAuthenticated && this._phoneVerified && this._profileCompletionStatus !== 'not_started';
  }
  /**
   * True only when the server has *definitively* rejected the refresh token
   * (401/403). An offline refresh failure leaves this false.
   */
  get sessionExpired() {
    return this._sessionExpired;
  }
  get pendingPhoneSignup() {
    return this._pendingPhoneSignup;
  }
  get hasPendingPhoneSignup() {
    return this._pendingPhoneSignup != null;
  }

  // ── Listenable ─────────────────────────────────────────────────────────────
  addListener(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  removeListener(l: () => void) {
    this.listeners.delete(l);
  }
  get snapshotVersion() {
    return this.version;
  }
  private notifyListeners() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  // ── Access-token lifetime ──────────────────────────────────────────────────

  private get accessTokenNeedsRefresh(): boolean {
    const expiry = this._accessTokenExpiry;
    if (expiry == null) return false;
    return Date.now() + REFRESH_LEAD_TIME > expiry;
  }

  /**
   * Call before an authenticated request. Refreshes only when the token is
   * expired or about to be. Returns false when there is no usable session.
   */
  async ensureFreshAccessToken(): Promise<boolean> {
    if (!this._isAuthenticated || this._currentToken == null) return false;
    if (!this.accessTokenNeedsRefresh) return true;
    return this.refreshAccessToken();
  }

  /**
   * Exchanges the stored refresh token for a new access token.
   * **Single-flight, and that is load-bearing**: reusing an already-rotated
   * refresh token revokes the entire token family.
   */
  refreshAccessToken(): Promise<boolean> {
    if (!this._refreshInFlight) {
      this._refreshInFlight = this.performRefresh().finally(() => {
        this._refreshInFlight = null;
      });
    }
    return this._refreshInFlight;
  }

  /** Never throws: awaited on the hot path of every request. */
  private async performRefresh(): Promise<boolean> {
    try {
      const refreshToken = await secureStorage.read(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        if (__DEV__) console.log('ℹ️ No refresh token stored — this session cannot be renewed');
        return false;
      }

      const response = await this.authService.refreshTokens(refreshToken);
      const data = response.data?.data;
      if (!data || typeof data !== 'object') return false;

      const token = (data.accessToken ?? data.token)?.toString();
      if (!token) return false;

      await secureStorage.write(TOKEN_KEY, token);
      // The rotated token MUST replace the old one.
      const rotated = data.refreshToken?.toString();
      if (rotated) await secureStorage.write(REFRESH_TOKEN_KEY, rotated);

      const claim = claimUser(token);
      this._currentToken = token;
      this._accessTokenExpiry = expiryOf(token);
      this._sessionExpired = false;
      if (typeof claim?.phoneVerified === 'boolean') this._phoneVerified = claim.phoneVerified;
      if (claim?.profileCompletionStatus != null) {
        this._profileCompletionStatus = String(claim.profileCompletionStatus);
      }
      this.notifyListeners();
      return true;
    } catch (e) {
      const status = statusOf(e);
      // 401 = invalid / expired / already-rotated, 403 = blocked → unrecoverable.
      if (status === 401 || status === 403) {
        this._sessionExpired = true;
        this.notifyListeners();
        if (__DEV__) console.log(`❌ refresh rejected (${status}) — session is unrecoverable`);
      } else if (__DEV__) {
        console.log(`⚠️ refresh failed transiently (${status}) — session kept`);
      }
      return false;
    }
  }

  /** Called after the splash completes. Lets the router start redirecting. */
  setReadyToRoute() {
    this._isInitialized = true;
    this.notifyListeners();
  }

  /** Initialize AuthManager — check for an existing session. */
  async initialize(): Promise<void> {
    this.setLoading(true);
    try {
      const token = await secureStorage.read(TOKEN_KEY);
      if (!token) {
        if (__DEV__) console.log('ℹ️ No stored token found');
        return;
      }

      const user = claimUser(token);
      const phoneVerified = user?.phoneVerified === true;
      const profileStatus = user?.profileCompletionStatus?.toString() ?? 'not_started';

      if (!phoneVerified) {
        // Provisional token from an incomplete signup — clear it.
        await this.clearAuthData();
        return;
      }

      // Seed currentUser from the JWT first (offline-safe fallback).
      if (user) this._currentUser = userFromJson(user);

      let activeToken = token;
      let isValid = await this.validateToken(activeToken);

      // A 15-minute access token is usually dead on reopen — spend the refresh
      // token before concluding the session isn't good.
      if (!isValid && (await this.refreshAccessToken())) {
        activeToken = this._currentToken ?? activeToken;
        isValid = await this.validateToken(activeToken);
      }

      if (isValid) {
        const claim = claimUser(activeToken);
        this._currentToken = activeToken;
        this._accessTokenExpiry = expiryOf(activeToken);
        this._sessionExpired = false;
        this._isAuthenticated = true;
        this._phoneVerified = typeof claim?.phoneVerified === 'boolean' ? claim.phoneVerified : phoneVerified;
        this._profileCompletionStatus = claim?.profileCompletionStatus?.toString() ?? profileStatus;

        // Resume an interrupted phone-first signup instead of entering the app.
        await this.probePendingPhoneSignup(activeToken);
      } else {
        await this.clearAuthData();
      }
    } catch (e) {
      if (__DEV__) console.log('❌ AuthManager initialization error:', e);
      await this.clearAuthData();
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Send a backend-generated phone OTP (WhatsApp-first) to [phone] (bare
   * 10-digit). Surfaces 400 and 429 distinctly.
   */
  async sendPhoneOtp(phone: string, channel = 'whatsapp'): Promise<Result<PhoneOtpSendResult>> {
    try {
      const result = await this.authService.sendPhoneOtp(phone, channel);
      const data = result.data?.data;
      return Result.success(
        data && typeof data === 'object'
          ? phoneOtpSendResultFromJson(data)
          : { expiresInSeconds: 600, resendAfterSeconds: 60, channel: 'whatsapp' },
      );
    } catch (e) {
      const status = statusOf(e);
      const msg = serverMessage(e);
      if (status === 400) return Result.error(msg ?? 'Invalid phone number. Please check and try again.');
      if (status === 429) return Result.error(msg ?? 'Too many attempts. Please wait a moment and try again.');
      if (status === undefined && !msg) return Result.error('Something went wrong. Please try again.');
      return Result.error(msg ?? 'Could not send the OTP. Please try again.');
    }
  }

  /** Mark onboarding as complete (or skipped). */
  completeOnboarding(skipped = false): Promise<Result<void>> {
    return this.setProfileCompletionStatus(skipped ? 'skipped' : 'completed');
  }

  /**
   * Records an onboarding milestone via `PATCH /user/profile-completion-status`.
   * Does its own token upkeep (proactive + one reactive retry on 401).
   */
  async setProfileCompletionStatus(status: string): Promise<Result<void>> {
    await this.ensureFreshAccessToken();
    try {
      return await this.putProfileCompletionStatus(status);
    } catch (e) {
      if (statusOf(e) === 401 && (await this.refreshAccessToken())) {
        try {
          return await this.putProfileCompletionStatus(status);
        } catch (retry) {
          return Result.error(this.profileStatusError(retry));
        }
      }
      return Result.error(this.profileStatusError(e));
    }
  }

  private async putProfileCompletionStatus(status: string): Promise<Result<void>> {
    await this.authService.updateProfileCompletionStatus(status);
    this._profileCompletionStatus = status;
    this.notifyListeners();
    return Result.success(undefined);
  }

  private profileStatusError(e: unknown): string {
    const status = statusOf(e);
    if (status === 401 || status === 403) {
      return 'Your session expired. Sign in again to finish setting up your profile.';
    }
    if (status === undefined && !(e as any)?.isAxiosError) return 'Something went wrong. Please try again.';
    return serverMessage(e) ?? 'Could not update profile status. Please try again.';
  }

  /** Called once signup is finalized (complete-email) or abandoned. */
  clearPendingPhoneSignup() {
    if (this._pendingPhoneSignup == null) return;
    this._pendingPhoneSignup = null;
    this.notifyListeners();
  }

  /**
   * Adopts a `profileCompletionStatus` reported by an endpoint that returns the
   * user but mints no token. Local-only.
   */
  syncProfileCompletionStatus(status: string) {
    if (!status || status === this._profileCompletionStatus) return;
    this._profileCompletionStatus = status;
    this.notifyListeners();
  }

  /**
   * The email is now attached to the stub, so the signup resumes at the
   * details step.
   */
  markPhoneSignupEmailCompleted(email: string) {
    const pending = this._pendingPhoneSignup;
    if (pending == null) return;
    if (pending.attachedEmail === email) return;
    this._pendingPhoneSignup = pending.copyWith({ attachedEmail: email });
    this.notifyListeners();
  }

  /**
   * Re-mints the stub token on a cold start so an interrupted phone-first
   * signup resumes at the step it stopped at. Skipped when the JWT already
   * claims `registrationCompleted`.
   */
  private async probePendingPhoneSignup(token: string) {
    const claim = claimUser(token);
    if (claim?.registrationCompleted === true) {
      this._pendingPhoneSignup = null;
      return;
    }
    try {
      const res = await this.authService.phoneSignupRefreshIntent();
      const data = res.data?.data;
      if (data && typeof data === 'object' && String(data.phoneSignupToken ?? '').length > 0) {
        this._pendingPhoneSignup = new PhoneSignupIntent(
          String(data.phoneSignupToken),
          data.phone?.toString() ?? '',
          data.needsEmailCompletion === true,
          claimEmail(claim),
        );
      }
    } catch {
      // 400 "not pending" is the common, expected case.
      this._pendingPhoneSignup = null;
    }
  }

  /**
   * Adopt a session returned by any auth endpoint that mints one
   * (phone-signup/verify-otp, phone-signup/complete-email, google/mobile).
   * Callers must NOT navigate themselves — the redirect ladder decides.
   */
  async adoptSession(data: Record<string, any>): Promise<void> {
    const token = (data.token ?? data.accessToken)?.toString();
    if (!token) {
      if (__DEV__) console.log('⚠️ adoptSession called without a token — ignoring');
      return;
    }

    await secureStorage.write(TOKEN_KEY, token);
    const refresh = data.refreshToken?.toString();
    if (refresh) await secureStorage.write(REFRESH_TOKEN_KEY, refresh);

    const claim = claimUser(token);
    this._currentToken = token;
    this._accessTokenExpiry = expiryOf(token);
    this._sessionExpired = false;
    this._isAuthenticated = true;
    if (typeof claim?.phoneVerified === 'boolean') this._phoneVerified = claim.phoneVerified;
    if (claim?.profileCompletionStatus != null) {
      this._profileCompletionStatus = String(claim.profileCompletionStatus);
    }

    const user = data.user;
    if (user && typeof user === 'object' && Object.keys(user).length > 0) {
      try {
        this._currentUser = userFromJson(user);
      } catch {
        // keep previous
      }
    }

    // A phone-signup response carries the stub token; anything else does not —
    // and finishing signup must clear it.
    const stubToken = data.phoneSignupToken?.toString();
    if (stubToken) {
      this._pendingPhoneSignup = new PhoneSignupIntent(
        stubToken,
        data.phone?.toString() ?? this._pendingPhoneSignup?.phone ?? '',
        data.needsEmailCompletion === true,
        claimEmail(claim),
      );
    } else {
      this._pendingPhoneSignup = null;
    }

    this.notifyListeners();
  }

  /**
   * Authenticate (or register) with the backend using a Google ID token.
   * Adopts the returned session.
   */
  async signInWithGoogleBackend(idToken: string, intent = 'login'): Promise<Result<GoogleAuthResponse>> {
    this.setLoading(true);
    try {
      const result = await this.authService.googleMobile({ idToken, intent });
      const data = result.data?.data;
      if (data == null) return Result.error('Invalid response format');
      const googleResponse = googleAuthResponseFromJson(data);
      await secureStorage.write(TOKEN_KEY, googleResponse.token);
      const jwtUser = claimUser(googleResponse.token);
      this._currentToken = googleResponse.token;
      this._accessTokenExpiry = expiryOf(googleResponse.token);
      this._isAuthenticated = true;
      this._phoneVerified =
        typeof jwtUser?.phoneVerified === 'boolean'
          ? jwtUser.phoneVerified
          : googleResponse.user?.phoneVerified ?? googleResponse.registrationCompleted;
      this._profileCompletionStatus = jwtUser?.profileCompletionStatus?.toString() ?? 'not_started';
      if (googleResponse.user) this._currentUser = googleResponse.user;
      if (!googleResponse.registrationCompleted) await this.markWelcomeSheetPendingForCurrentUser();
      this.notifyListeners();
      return Result.success(googleResponse);
    } catch (e) {
      const status = statusOf(e);
      const msg = serverMessage(e);
      if (status === 403) return Result.error(msg ?? 'This account is blocked.');
      if (status === 401) return Result.error(msg ?? 'Google session expired. Please try again.');
      return Result.error(msg ?? 'Google sign-in failed. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  /** Logout user and clear all authentication data. */
  async logout(): Promise<void> {
    this.setLoading(true);
    try {
      await this.clearAuthData();
      // Reset EVERY session-derived field — these feed the redirect ladder.
      this._currentToken = null;
      this._isAuthenticated = false;
      this._currentUser = null;
      this._phoneVerified = false;
      this._profileCompletionStatus = 'not_started';
      this._pendingPhoneSignup = null;
      this.notifyListeners();
    } catch (e) {
      if (__DEV__) console.log('❌ Logout error:', e);
    } finally {
      this.setLoading(false);
    }
  }

  /** Validate token with server, and adopt the fresh session user. */
  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.authService.getSession({
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.status === 200) {
        this.adoptSessionUser(response.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Re-fetches the live `/auth/session` user and replaces [currentUser].
   * Call after a profile change (photo, banner, name). Non-fatal.
   */
  async refreshCurrentUser(): Promise<void> {
    const token = this._currentToken;
    if (!token) return;
    try {
      const response = await this.authService.getSession({
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.status === 200 && this.adoptSessionUser(response.data)) {
        this.notifyListeners();
      }
    } catch (e) {
      if (__DEV__) console.log('⚠️ refreshCurrentUser failed (keeping current user):', e);
    }
  }

  /**
   * Optimistically patches the cached [currentUser]'s identity fields after a
   * SUCCESSFUL profile save, so the app chrome reflects the edit immediately.
   */
  applyLocalProfileEdits(edits: { name?: string; userTitle?: string }) {
    const u = this._currentUser;
    if (!u) return;
    const name = edits.name?.trim();
    const title = edits.userTitle?.trim();
    if (!name && !title) return;
    this._currentUser = { ...u, ...(name ? { name } : {}), ...(title ? { userTitle: title } : {}) };
    this.notifyListeners();
  }

  /** Parses `data.user` out of a `/auth/session` body. */
  private adoptSessionUser(body: any): boolean {
    const sessionUser = body && typeof body === 'object' && body.data && typeof body.data === 'object' ? body.data.user : null;
    if (sessionUser && typeof sessionUser === 'object') {
      try {
        this._currentUser = userFromJson(sessionUser);
        return true;
      } catch {
        // keep current
      }
    }
    return false;
  }

  private async clearAuthData() {
    this._accessTokenExpiry = null;
    this._sessionExpired = false;
    await secureStorage.delete(TOKEN_KEY);
    await secureStorage.delete(USER_DATA_KEY);
    await secureStorage.delete(REFRESH_TOKEN_KEY);
    await secureStorage.delete(LAST_LOGIN_KEY);
  }

  async markWelcomeSheetPendingForCurrentUser() {
    const userKey = WelcomeSheetStateStore.userKeyFor(this._currentUser);
    if (userKey == null) return;
    await welcomeSheetStateStore.markPendingForUser(userKey);
  }

  private setLoading(loading: boolean) {
    this._isLoading = loading;
    this.notifyListeners();
  }

  getStoredToken(): Promise<string | null> {
    return secureStorage.read(TOKEN_KEY);
  }
}

export const authManager = AuthManager.instance;

/**
 * Subscribe a component to AuthManager changes and read a derived value.
 * `select` should return a primitive or a stable reference.
 */
export function useAuth<T>(select: (a: AuthManager) => T): T {
  return useSyncExternalStore(
    (cb) => authManager.addListener(cb),
    () => select(authManager),
  );
}
