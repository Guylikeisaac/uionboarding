import React, { useState } from 'react';
import { View } from 'react-native';

import { authManager } from '@/core/auth/authManager';
import { kEnableGoogleOnPhoneSignup } from '@/core/constants/authConfig';
import { pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { accentRed } from '@/core/theme/colors';
import { FormValidators } from '@/core/utils/formValidators';
import { AppTextField } from '@/shared/ui/AppTextField';
import { Text } from '@/shared/ui/Text';
import { phoneSignupController } from '../controllers/phoneSignupController';
import { useSignupFlow } from '../providers/signupFlowStore';
import { AuthEntryScaffold } from '../widgets/AuthEntryScaffold';
import { GoogleAuthButton, OrDivider } from '../widgets/SocialAuthBlock';

/** Step 3 — attach a verified email (typed + OTP, or Google). */
export function SignupEmailScreen() {
  const [email, setEmailText] = useState(() => useSignupFlow.getState().email);
  const [sending, setSending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = email.trim();
  const canSubmit = FormValidators.email(value) == null;
  const busy = sending || googleBusy;

  const continueWithEmail = async () => {
    if (!canSubmit || busy) return;
    setSending(true);
    const result = await phoneSignupController.sendEmailOtp(value);
    setSending(false);
    if (!result.isSuccess) {
      setError(result.error);
      return;
    }
    const flow = useSignupFlow.getState();
    flow.setEmail(value);
    flow.setResendAfterSeconds(result.data);
    push(RouteNames.signupEmailOtp);
  };

  /**
   * Google route: native sign-in, then `POST /auth/google/mobile`. No email
   * OTP. `markPhoneSignupEmailCompleted` is load-bearing for the router.
   */
  const continueWithGoogle = async () => {
    if (busy) return;
    setGoogleBusy(true);
    setError(null);
    const signIn = await phoneSignupController.signInWithGoogleProfile();
    if (!signIn.isSuccess) {
      setGoogleBusy(false);
      setError(signIn.error);
      return;
    }
    const profile = signIn.data;
    if (!profile) {
      setGoogleBusy(false);
      return;
    }
    const auth = await phoneSignupController.signInWithGoogleBackend(profile.idToken, 'register');
    setGoogleBusy(false);
    if (!auth.isSuccess) {
      setError(auth.error);
      return;
    }
    useSignupFlow.getState().setGoogleAccount({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoUrl: profile.photoUrl,
    });
    authManager.markPhoneSignupEmailCompleted(profile.email);
    // Google already verified the email — straight to the vibe pick.
    push(RouteNames.signupVibe);
  };

  return (
    <AuthEntryScaffold
      title="Enter your email"
      subtitle={
        kEnableGoogleOnPhoneSignup
          ? 'Use your email or continue with Google to create your account.'
          : 'Add your email to create your account.'
      }
      onBack={busy ? null : () => pop(RouteNames.signupMobile)}
      ctaFollowsBody
      ctaLabel={sending ? 'Sending code...' : 'Continue'}
      onCta={canSubmit && !busy ? continueWithEmail : null}
      centerBelowCta={false}
      belowCta={
        kEnableGoogleOnPhoneSignup ? (
          <View>
            <View style={{ height: 6 }} />
            <OrDivider />
            <View style={{ height: 14 }} />
            <GoogleAuthButton loading={googleBusy} onTap={busy ? undefined : continueWithGoogle} />
          </View>
        ) : null
      }
    >
      <View>
        <AppTextField
          label="Email Address"
          value={email}
          onChangeText={(t) => {
            setEmailText(t);
            if (error) setError(null);
          }}
          hint="eg: rahulsharma@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={continueWithEmail}
        />
        {error ? <Text style={{ marginTop: 8, fontSize: 12, color: accentRed }}>{error}</Text> : null}
      </View>
    </AuthEntryScaffold>
  );
}
