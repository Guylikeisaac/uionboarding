import React, { useState } from 'react';
import { View } from 'react-native';

import { authManager } from '@/core/auth/authManager';
import { go, pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { accentRed } from '@/core/theme/colors';
import { FormValidators } from '@/core/utils/formValidators';
import { textFor } from '@/features/onboarding/vibe/vibeCopy';
import { useVibe } from '@/features/onboarding/vibe/vibeStore';
import { AppTextField } from '@/shared/ui/AppTextField';
import { Text } from '@/shared/ui/Text';
import { phoneSignupController } from '../controllers/phoneSignupController';
import { profilePictureUploader } from '../data/profilePictureUploader';
import { useSignupFlow } from '../providers/signupFlowStore';
import { AuthEntryScaffold } from '../widgets/AuthEntryScaffold';
import { ProfilePhotoPicker } from '../widgets/ProfilePhotoPicker';

/**
 * Reconciles the avatar with the account (local file > Google URL > explicit
 * removal), then refreshes the cached user. Non-fatal throughout.
 */
async function syncAvatar() {
  const flow = useSignupFlow.getState();
  try {
    if (flow.photoFile) {
      await profilePictureUploader.upload(flow.photoFile.uri, flow.photoFile.name, flow.photoFile.mimeType);
    } else if (flow.photoUrl) {
      await profilePictureUploader.uploadFromUrl(flow.photoUrl);
    } else if (flow.photoRemoved) {
      await profilePictureUploader.remove();
    }
  } catch (e) {
    if (__DEV__) console.log('⚠️ avatar sync failed (continuing):', e);
  }
  await authManager.refreshCurrentUser();
}

/** Step 5 — the display name, and the last screen before the questionnaire. */
export function SignupDetailsScreen() {
  const flow = useSignupFlow();
  const vibe = useVibe();
  const t = textFor(vibe);
  const [firstName, setFirstName] = useState(flow.firstName);
  const [lastName, setLastName] = useState(flow.lastName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;
  const firstErr = showErrors ? FormValidators.personName(firstName) : null;
  const lastErr = showErrors ? FormValidators.personName(lastName) : null;

  const onContinue = async () => {
    if (!canSubmit || submitting) return;
    setShowErrors(true);
    if (FormValidators.personName(firstName) || FormValidators.personName(lastName)) return;

    const first = firstName.trim();
    const last = lastName.trim();
    useSignupFlow.getState().setName(first, last);
    setSubmitting(true);
    setError(null);

    const state = useSignupFlow.getState();
    if (state.emailRoute === 'google') {
      const saved = await phoneSignupController.saveGoogleName(first, last);
      setSubmitting(false);
      if (!saved.isSuccess) {
        setError(saved.error);
        return;
      }
      authManager.clearPendingPhoneSignup();
      await syncAvatar();
      go(RouteNames.onboardingFlow);
      return;
    }

    const result = await phoneSignupController.completeEmail(first, last, state.email);
    if (!result.isSuccess) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    if (result.data.needsEmailOtp) {
      const sent = await phoneSignupController.sendEmailOtp(useSignupFlow.getState().email);
      setSubmitting(false);
      if (!sent.isSuccess) {
        setError(sent.error);
        return;
      }
      useSignupFlow.getState().setResendAfterSeconds(sent.data);
      push(RouteNames.signupEmailOtp);
      return;
    }

    setSubmitting(false);
    authManager.clearPendingPhoneSignup();
    await syncAvatar();
    go(RouteNames.onboardingFlow);
  };

  return (
    <AuthEntryScaffold
      title={t.detailsTitle}
      subtitle={t.detailsSubtitle(flow.email || undefined)}
      compactTop
      vibe={vibe}
      onBack={submitting ? null : () => pop(RouteNames.signupEmail)}
      ctaLabel={submitting ? 'Creating account...' : 'Continue'}
      onCta={canSubmit && !submitting ? onContinue : null}
    >
      <View>
        <View style={{ alignItems: 'center' }}>
          <ProfilePhotoPicker
            photoUrl={flow.photoUrl}
            photoFile={flow.photoFile}
            onPicked={flow.setPhotoFile}
            onRemoved={flow.removePhoto}
          />
        </View>
        <View style={{ height: 24 }} />
        <AppTextField
          label={t.firstNameLabel}
          value={firstName}
          onChangeText={setFirstName}
          hint="eg: Rahul"
          autoCapitalize="words"
          returnKeyType="next"
          error={firstErr}
        />
        <View style={{ height: 18 }} />
        <AppTextField
          label={t.lastNameLabel}
          value={lastName}
          onChangeText={setLastName}
          hint="eg: Sharma"
          autoCapitalize="words"
          returnKeyType="done"
          error={lastErr}
          onSubmitEditing={onContinue}
        />
        {error ? <Text style={{ marginTop: 10, fontSize: 12, color: accentRed }}>{error}</Text> : null}
      </View>
    </AuthEntryScaffold>
  );
}
