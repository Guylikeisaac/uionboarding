import React from 'react';

import { pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { VibePicker } from '@/features/onboarding/vibe/VibePicker';

/** Step 4b — right after the email is verified: Gen Z or professional voice. */
export function SignupVibeScreen() {
  return <VibePicker onBack={() => pop(RouteNames.signupEmail)} onPicked={() => push(RouteNames.signupDetails)} />;
}
