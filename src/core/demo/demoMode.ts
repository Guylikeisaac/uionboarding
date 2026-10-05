/**
 * Demo mode answers every API call locally with realistic sample data, so the
 * whole app can be shown without a backend. On by default; build with
 * `EXPO_PUBLIC_DEMO_MODE=false` to talk to the real services.
 */
export const kDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

/** Any 6 digits work in demo mode; this is the one shown as a hint. */
export const kDemoOtp = '123456';
