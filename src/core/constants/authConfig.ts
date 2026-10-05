/** Auth-related client configuration. */
export const AuthConfig = {
  /**
   * Google **Web** OAuth client ID, used as `webClientId` when requesting the
   * Google ID token (the backend validates the token against this audience on
   * `POST /auth/google/mobile`).
   *
   * Web OAuth client of **`syncup-ac483`** (project number 858127840282). Values
   * live in the checked-in platform configs: Web is `client_type: 3` in
   * `google-services.json`, iOS is `CLIENT_ID` in `GoogleService-Info.plist`.
   *
   * ⚠️ Android also needs an OAuth client (`client_type: 1`) for
   * `com.syncup.mobile` + its SHA-1 in this project, or sign-in fails with
   * DEVELOPER_ERROR.
   */
  googleServerClientId:
    '858127840282-caci3om6afl6h9eek1e9ijq0knta8jth.apps.googleusercontent.com',

  /** iOS OAuth client (CLIENT_ID in GoogleService-Info.plist). */
  googleIosClientId: '858127840282-8f64gvgcucb4dtg31qg95rd9rb0dgs5f.apps.googleusercontent.com',
} as const;

/** Gates the "Continue with Google" option on the phone-first signup. */
export const kEnableGoogleOnPhoneSignup = true;
