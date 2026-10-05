import React, { useState } from 'react';
import { View } from 'react-native';

import { push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { accentRed } from '@/core/theme/colors';
import { FormValidators } from '@/core/utils/formValidators';
import { AppTextField } from '@/shared/ui/AppTextField';
import { Text } from '@/shared/ui/Text';
import { phoneSignupController } from '../controllers/phoneSignupController';
import { OtpChannels, useSignupFlow, type OtpChannel } from '../providers/signupFlowStore';
import { AuthEntryScaffold, AuthTextLink } from '../widgets/AuthEntryScaffold';
import { LegalConsentCheckbox } from '../widgets/LegalConsentCheckbox';

/**
 * Step 1 of account creation — the phone number.
 *   • **Continue** → backend `send-phone-otp` (WhatsApp/Redis); the
 *     *delivered* channel is stored.
 *   • **Send via SMS instead** → Firebase Phone Auth.
 */
export function SignupMobileScreen() {
  const [phone, setPhoneText] = useState(() => useSignupFlow.getState().phone);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Consent starts false — a pre-ticked box is not consent. */
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const value = phone.trim();
  const canSubmit = acceptedTerms && FormValidators.indianPhoneNumber(value) == null;
  const liveError = value.length === 10 ? FormValidators.indianPhoneNumber(value) : null;

  const send = async (channel: OtpChannel) => {
    if (!canSubmit || sending) return;
    setSending(true);
    const result = OtpChannels.isFirebaseSms(channel)
      ? await phoneSignupController.sendFirebaseSms(value)
      : await phoneSignupController.sendPhoneOtp(value, channel);
    setSending(false);
    if (!result.isSuccess) {
      setError(result.error);
      return;
    }
    const flow = useSignupFlow.getState();
    flow.setPhone(value, result.data.deliveredChannel);
    flow.setResendAfterSeconds(result.data.resendAfterSeconds);
    push(RouteNames.signupMobileOtp);
  };

  const shownError = error ?? liveError;
  return (
    <AuthEntryScaffold
      title="Enter mobile number"
      subtitle={"We'll send a 6-digit code to your mobile.\nEnter it below to continue."}
      onBack={null}
      ctaLabel={sending ? 'Sending code...' : 'Continue'}
      onCta={canSubmit && !sending ? () => send('whatsapp') : null}
      belowCta={<AuthTextLink label="Send via SMS instead" onTap={canSubmit && !sending ? () => send('sms') : null} />}
    >
      <View>
        <AppTextField
          label="Mobile Number"
          value={phone}
          onChangeText={(t) => {
            setPhoneText(t.replace(/\D/g, '').slice(0, 10));
            if (error) setError(null);
          }}
          hint="eg: 98765 43210"
          keyboardType="phone-pad"
          returnKeyType="done"
          maxLength={10}
          onSubmitEditing={() => send('whatsapp')}
        />
        {shownError ? <Text style={{ marginTop: 8, fontSize: 12, color: accentRed }}>{shownError}</Text> : null}
        <View style={{ height: 22 }} />
        <LegalConsentCheckbox value={acceptedTerms} onChanged={setAcceptedTerms} />
      </View>
    </AuthEntryScaffold>
  );
}
