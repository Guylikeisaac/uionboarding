import React from 'react';

import { pop, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { phoneSignupController } from '../controllers/phoneSignupController';
import { useSignupFlow } from '../providers/signupFlowStore';
import { OtpVerificationView } from '../widgets/OtpVerificationView';

/** Step 4 — confirm ownership of the email address. */
export function SignupEmailOtpScreen() {
  const flow = useSignupFlow();
  return (
    <OtpVerificationView
      title="Verify your email"
      subtitle={`We've sent a 6-digit code to ${flow.email}.\nEnter it below to continue.`}
      onBack={() => pop(RouteNames.signupEmail)}
      resendSeconds={flow.resendAfterSeconds}
      onResend={async () => {
        const result = await phoneSignupController.sendEmailOtp(useSignupFlow.getState().email);
        return result.isSuccess ? result.data : null;
      }}
      onVerify={async (code) => {
        const result = await phoneSignupController.verifyEmailOtp(useSignupFlow.getState().email, code);
        if (!result.isSuccess) return result.error;
        push(RouteNames.signupVibe);
        return null;
      }}
    />
  );
}
