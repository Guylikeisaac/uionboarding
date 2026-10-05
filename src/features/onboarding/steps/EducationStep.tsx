import React from 'react';
import { View } from 'react-native';

import { AppTextField } from '@/shared/ui/AppTextField';
import { CommonDropdownField } from '@/shared/ui/CommonDropdownField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { educationIsComplete, type EducationEntry } from '../models/onboardingAnswers';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

/** Fresher branch — the academic record. CTA gated on the live values. */
export function EducationStep({ onContinue }: { onContinue: () => void }) {
  const entry = useOnboardingFlow((s) => s.answers.education);
  const patch = (mutate: (e: EducationEntry) => EducationEntry) =>
    useOnboardingFlow.getState().update((a) => ({ ...a, education: mutate(a.education) }));

  return (
    <OnboardingStepLayout
      title="Tell us about your education"
      buttonText="Continue"
      onPressed={educationIsComplete(entry) ? onContinue : null}
    >
      <View>
        <AppTextField
          label="Degree*"
          value={entry.degree}
          onChangeText={(t) => patch((e) => ({ ...e, degree: t }))}
          hint="eg: Bachelor of Computer Application"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <AppTextField
          label="Specialization*"
          value={entry.specialization}
          onChangeText={(t) => patch((e) => ({ ...e, specialization: t }))}
          hint="eg: Computer Science"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <AppTextField
          label="College*"
          value={entry.college}
          onChangeText={(t) => patch((e) => ({ ...e, college: t }))}
          hint="eg: IIT Bombay"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <CommonDropdownField<string>
          label="Year / Status*"
          hint="Select year / status"
          value={entry.yearOrStatus}
          items={OnboardingCatalog.educationYearOrStatus.map((y) => ({ value: y, label: y }))}
          onChanged={(v) => patch((e) => ({ ...e, yearOrStatus: v }))}
        />
      </View>
    </OnboardingStepLayout>
  );
}
