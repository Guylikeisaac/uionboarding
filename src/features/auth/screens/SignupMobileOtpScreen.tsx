import React from 'react';

import { authManager } from '@/core/auth/authManager';
import { go, pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import type { Result } from '../data/authModels';
import { phoneSignupController, type PhoneVerifyOutcome } from '../controllers/phoneSignupController';
import { OtpChannels, signupFlow, useSignupFlow } from '../providers/signupFlowStore';
import { OtpVerificationView } from '../widgets/OtpVerificationView';

/**
 * Step 2 — confirm ownership of the number. `phone-signup/verify-otp` is the
 * branch gate: `isLogin` says whether signup is already finished.
 */
export function SignupMobileOtpScreen() {
  const flow = useSignupFlow();

  return (
    <OtpVerificationView
      title="Verify mobile number"
      subtitle={`${signupFlow.otpSentDescription(flow)}\nEnter it below to continue.`}
      onBack={() => pop(RouteNames.signupMobile)}
      resendSeconds={flow.resendAfterSeconds}
      onResend={async () => {
        const s = useSignupFlow.getState();
        const result = OtpChannels.isFirebaseSms(s.channel)
          ? await phoneSignupController.sendFirebaseSms(s.phone, !!s.firebaseCanResend)
          : await phoneSignupController.sendPhoneOtp(s.phone, s.channel);
        if (!result.isSuccess) return null;
        useSignupFlow.getState().setPhone(s.phone, result.data.deliveredChannel);
        return result.data.resendAfterSeconds;
      }}
      onVerify={async (code) => {
        const s = useSignupFlow.getState();
        let result: Result<PhoneVerifyOutcome>;
        if (OtpChannels.isFirebaseSms(s.channel)) {
          if (!signupFlow.hasFirebaseSmsContext(s)) {
            return 'This verification expired. Go back and request a new code.';
          }
          result = await phoneSignupController.verifyFirebaseSms(s.phone, code, s.verificationId!);
        } else {
          result = await phoneSignupController.verifyPhoneOtp(s.phone, code, s.channel);
        }
        if (!result.isSuccess) return result.error;

        if (result.data.isLogin) {
          // Completed account — hand off to the redirect ladder.
          useSignupFlow.getState().reset();
          go(RouteNames.splash);
        } else {
          const attached = authManager.pendingPhoneSignup?.attachedEmail;
          if (attached) {
            useSignupFlow.getState().setEmail(attached);
            push(RouteNames.signupDetails);
          } else {
            push(RouteNames.signupEmail);
          }
        }
        return null;
      }}
    />
  );
}
