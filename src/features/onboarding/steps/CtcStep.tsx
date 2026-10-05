import React from 'react';
import { View } from 'react-native';

import { FormValidators } from '@/core/utils/formValidators';
import { AppTextField } from '@/shared/ui/AppTextField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { SuggestSingleField } from '@/shared/ui/SuggestFields';
import { AuthTextLink } from '@/features/auth/widgets/AuthEntryScaffold';
import { searchJobTitles } from '../data/locationSearchService';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';
import { FieldHelperText } from './FormFields';

const num = (s: string) => {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Salary capture — experienced (current + expected) or fresher (expected +
 * optional dream role). Both carry a Skip link.
 */
export function CtcStep({
  onContinue,
  onSkip,
  includeCurrentCtc,
}: {
  onContinue: () => void;
  onSkip: () => void;
  includeCurrentCtc: boolean;
}) {
  const current = useOnboardingFlow((s) => s.answers.currentCtc);
  const expected = useOnboardingFlow((s) => s.answers.expectedCtc);
  const dreamRole = useOnboardingFlow((s) => s.answers.dreamRole);
  const update = useOnboardingFlow((s) => s.update);

  const isValid = (() => {
    if (!expected.trim()) return false;
    if (FormValidators.optionalCtcLpa(expected) != null) return false;
    if (!includeCurrentCtc) return true;
    if (!current.trim()) return false;
    return FormValidators.optionalCtcLpa(current) == null;
  })();

  const c = num(current);
  const e = num(expected);
  const expectedBelowCurrent = c != null && e != null && e < c;

  return (
    <OnboardingStepLayout
      title={includeCurrentCtc ? 'What is your current and expected CTC?' : 'What is your expected CTC?'}
      buttonText="Continue"
      onPressed={isValid ? onContinue : null}
      belowButton={<AuthTextLink label="Skip" onTap={onSkip} />}
    >
      <View>
        {includeCurrentCtc ? (
          <>
            <AppTextField
              label="Current CTC (LPA)"
              value={current}
              onChangeText={(t) => update((a) => ({ ...a, currentCtc: t }))}
              hint="eg: 10"
              keyboardType="decimal-pad"
              error={current.trim() ? FormValidators.optionalCtcLpa(current) : null}
            />
            <FieldHelperText text="Example: 10 means current CTC is 10 lakhs per annum (INR)." />
            <View style={{ height: 16 }} />
          </>
        ) : null}
        <AppTextField
          label="Expected CTC (LPA)"
          value={expected}
          onChangeText={(t) => update((a) => ({ ...a, expectedCtc: t }))}
          hint={includeCurrentCtc ? 'eg: 12' : 'eg: 10'}
          keyboardType="decimal-pad"
          error={expected.trim() ? FormValidators.optionalCtcLpa(expected) : null}
        />
        <FieldHelperText
          text={
            includeCurrentCtc
              ? 'Example: 12 means expected CTC is 12 lakhs per annum (INR).'
              : 'Example: 10 means 10 lakhs per annum (INR).'
          }
        />
        {expectedBelowCurrent ? (
          <FieldHelperText text="Your expected CTC is lower than your current one — worth a double check." />
        ) : null}
        {!includeCurrentCtc ? (
          <View style={{ marginTop: 16 }}>
            <SuggestSingleField
              label="Dream role (optional)"
              hint="Search and select a job role"
              value={dreamRole}
              onSearch={searchJobTitles}
              onChanged={(v) => update((a) => ({ ...a, dreamRole: v ?? a.dreamRole }))}
            />
          </View>
        ) : null}
      </View>
    </OnboardingStepLayout>
  );
}
