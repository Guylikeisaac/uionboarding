import React from 'react';
import { View } from 'react-native';

import { textMuted } from '@/core/theme/colors';
import { CityMultiSelectField } from '@/shared/ui/CityMultiSelectField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { Text } from '@/shared/ui/Text';
import { searchLocations } from '../data/locationSearchService';
import { intentIsCandidate } from '../models/onboardingAnswers';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

const maxPreferredLocations = 5;

/**
 * Shared by all branches. Current Location is single-select and required;
 * Preferred Location (candidate-only) is multi-select and optional.
 */
export function LocationStep({ onContinue }: { onContinue: () => void }) {
  const answers = useOnboardingFlow((s) => s.answers);
  const update = useOnboardingFlow((s) => s.update);
  const isCandidate = answers.intent ? intentIsCandidate(answers.intent) : true;

  return (
    <OnboardingStepLayout
      title="Where are you based?"
      buttonText="Continue"
      onPressed={answers.currentLocation ? onContinue : null}
    >
      <View>
        <CityMultiSelectField
          label="Current Location*"
          hint="Search your city..."
          maxSelections={1}
          onSearch={searchLocations}
          selectedLocations={answers.currentLocation ? [answers.currentLocation] : []}
          onChanged={(list) => update((a) => ({ ...a, currentLocation: list[0] }))}
        />
        {isCandidate ? (
          <>
            <Text style={{ marginTop: 8, fontSize: 12, color: textMuted, lineHeight: 16.8 }}>
              Select <Text style={{ fontSize: 12, color: textMuted, fontWeight: '700' }}>&apos;India&apos;</Text> if you
              are open to opportunities anywhere in the country.
            </Text>
            <View style={{ height: 22 }} />
            <CityMultiSelectField
              label="Preferred Location (optional)"
              hint="Search and select cities..."
              maxSelections={maxPreferredLocations}
              onSearch={searchLocations}
              selectedLocations={answers.preferredLocations}
              onChanged={(list) => update((a) => ({ ...a, preferredLocations: list }))}
            />
          </>
        ) : null}
      </View>
    </OnboardingStepLayout>
  );
}
