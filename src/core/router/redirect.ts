import type { AuthManager } from '../auth/authManager';
import { RouteNames } from './routeNames';

/** New mobile-first account creation — screens BEFORE a session exists. */
const phoneSignupPublicRoutes = new Set<string>([RouteNames.signupMobile, RouteNames.signupMobileOtp]);

/** Screens that continue an INCOMPLETE signup (stub session). */
const phoneSignupStubRoutes = new Set<string>([
  RouteNames.signupEmail,
  RouteNames.signupEmailOtp,
  RouteNames.signupDetails,
]);

/** Always reachable regardless of auth (the in-app browser for legal pages). */
const alwaysPublicRoutes = new Set<string>([RouteNames.browser]);

/** Onboarding is finished only at these two statuses. */
const onboardingDoneStatuses = new Set(['completed', 'skipped']);

/** "email is attached, name/photo are not" — the Google route's details step. */
const emailAttachedStatus = 'email_added';

/** Where an interrupted phone-first signup picks back up. */
function phoneSignupResume(auth: AuthManager): string {
  return (auth.pendingPhoneSignup?.needsEmailEntry ?? true) ? RouteNames.signupEmail : RouteNames.signupDetails;
}

/** Where a fully-verified session should land. */
function postAuthLanding(auth: AuthManager): string {
  if (onboardingDoneStatuses.has(auth.profileCompletionStatus)) return RouteNames.home;
  return RouteNames.onboardingFlow;
}

/**
 * Port of the go_router `redirect` ladder. Returns the path to redirect to,
 * or null to stay. [location] is the matched path without query string.
 */
export function computeRedirect(location: string, auth: AuthManager): string | null {
  // Block routing until the splash signals ready.
  if (!auth.isInitialized) return null;

  if (alwaysPublicRoutes.has(location)) return null;

  // Pre-session signup screens: always reachable.
  if (phoneSignupPublicRoutes.has(location)) return null;

  // Vibe picker: presentation-only, so any session may (re)pick.
  if (location === RouteNames.signupVibe) {
    return auth.isAuthenticated ? null : RouteNames.signupMobile;
  }

  // Mid-signup screens: reachable only while a signup is actually pending.
  if (phoneSignupStubRoutes.has(location)) {
    if (!auth.isAuthenticated) return RouteNames.signupMobile;
    if (!auth.hasPendingPhoneSignup) {
      // Exception: the Google route — google/mobile returns a full session but
      // the name/photo step is still outstanding (`email_added`).
      if (location === RouteNames.signupDetails && auth.profileCompletionStatus === emailAttachedStatus) {
        return null;
      }
      return postAuthLanding(auth);
    }
    // Details needs an attached email.
    if (location === RouteNames.signupDetails && (auth.pendingPhoneSignup?.needsEmailEntry ?? false)) {
      return RouteNames.signupEmail;
    }
    // A stub that already has its email doesn't belong on the email screens.
    if (
      (location === RouteNames.signupEmail || location === RouteNames.signupEmailOtp) &&
      !(auth.pendingPhoneSignup?.needsEmailEntry ?? true)
    ) {
      return RouteNames.signupDetails;
    }
    return null;
  }

  // Splash: redirect based on auth state.
  if (location === RouteNames.splash) {
    if (!auth.isAuthenticated) return RouteNames.loggedOutEntry;
    if (auth.hasPendingPhoneSignup) return phoneSignupResume(auth);
    if (!auth.phoneVerified) return RouteNames.loggedOutEntry;
    return postAuthLanding(auth);
  }

  // Branch-aware questionnaire: needs a session AND a finished signup.
  if (location === RouteNames.onboardingFlow) {
    if (!auth.isAuthenticated) return RouteNames.signupMobile;
    if (auth.hasPendingPhoneSignup) return phoneSignupResume(auth);
    return null;
  }

  // Protected routes: the catch-all.
  if (!auth.isAuthenticated) return RouteNames.loggedOutEntry;
  if (auth.hasPendingPhoneSignup) return phoneSignupResume(auth);
  if (!auth.phoneVerified) return RouteNames.loggedOutEntry;
  return null;
}
