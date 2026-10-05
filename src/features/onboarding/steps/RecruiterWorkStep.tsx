import React from 'react';
import { View } from 'react-native';

import { AppTextField } from '@/shared/ui/AppTextField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { AuthTextLink } from '@/features/auth/widgets/AuthEntryScaffold';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

const aboutMaxLength = 120;

/** Recruiter branch — company, role and one-liner on a single page. */
export function RecruiterWorkStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const company = useOnboardingFlow((s) => s.answers.companyName);
  const role = useOnboardingFlow((s) => s.answers.recruiterRole ?? '');
  const about = useOnboardingFlow((s) => s.answers.aboutOneLiner);
  const update = useOnboardingFlow((s) => s.update);
  const canContinue = company.trim().length > 0 && role.trim().length > 0;

  return (
    <OnboardingStepLayout
      title="Tell us about your work"
      subtitle="Tell us where you work and your title, or skip for now."
      buttonText="Continue"
      onPressed={canContinue ? onContinue : null}
      belowButton={<AuthTextLink label="Skip" onTap={onSkip} />}
    >
      <View>
        <AppTextField
          label="Company / Organization name"
          value={company}
          onChangeText={(t) => update((a) => ({ ...a, companyName: t }))}
          hint="e.g. SyncUp"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={{ height: 16 }} />
        <AppTextField
          label="Role / Title"
          value={role}
          onChangeText={(t) => update((a) => ({ ...a, recruiterRole: t }))}
          hint="e.g. Founder, CEO, Recruiter, HR, Hiring Manager"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={{ height: 16 }} />
        <AppTextField
          label="What you're building / do"
          value={about}
          onChangeText={(t) => update((a) => ({ ...a, aboutOneLiner: t }))}
          hint="e.g. Building an AI-powered scheduling tool"
          autoCapitalize="sentences"
          returnKeyType="done"
          maxLength={aboutMaxLength}
        />
      </View>
    </OnboardingStepLayout>
  );
}
