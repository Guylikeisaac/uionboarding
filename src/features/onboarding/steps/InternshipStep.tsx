import React from 'react';
import { View } from 'react-native';

import { AppTextField } from '@/shared/ui/AppTextField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { internshipIsComplete, type InternshipEntry } from '../models/onboardingAnswers';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';
import { FieldHelperText, FieldLabel, OnboardingDateField } from './FormFields';

/** Fresher branch — one internship record (shown only after "Yes"). */
export function InternshipStep({ onContinue }: { onContinue: () => void }) {
  const entry = useOnboardingFlow((s) => s.answers.internship);
  const patch = (mutate: (e: InternshipEntry) => InternshipEntry) =>
    useOnboardingFlow.getState().update((a) => ({ ...a, internship: mutate(a.internship) }));
  const dateOrderInvalid = !!entry.from && !!entry.to && entry.to.getTime() < entry.from.getTime();

  return (
    <OnboardingStepLayout
      title="Add your internship"
      buttonText="Continue"
      onPressed={internshipIsComplete(entry) && !dateOrderInvalid ? onContinue : null}
    >
      <View>
        <AppTextField
          label="Company*"
          value={entry.company}
          onChangeText={(t) => patch((e) => ({ ...e, company: t }))}
          hint="eg: Google"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <AppTextField
          label="Role*"
          value={entry.role}
          onChangeText={(t) => patch((e) => ({ ...e, role: t }))}
          hint="eg: Software Engineer"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <OnboardingDateField label="From" value={entry.from} onPicked={(d) => patch((e) => ({ ...e, from: d }))} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <OnboardingDateField label="To" value={entry.to} onPicked={(d) => patch((e) => ({ ...e, to: d }))} />
          </View>
        </View>
        {dateOrderInvalid ? <FieldHelperText text="The end date must be on or after the start date." isError /> : null}
        <View style={{ height: 16 }} />
        <FieldLabel text="Description" required />
        <AppTextField
          value={entry.description}
          onChangeText={(t) => patch((e) => ({ ...e, description: t }))}
          hint="What did you work on?"
          multiline
          multilineHeight={84}
          autoCapitalize="sentences"
        />
      </View>
    </OnboardingStepLayout>
  );
}
