import React from 'react';
import { View } from 'react-native';

import { InterestGridTile } from '@/shared/ui/InterestGridTile';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { StaggerIn } from '../genz/motion';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

/** Rejoin B — the interest grid. `selected` holds backend VALUES. */
export function InterestsStep({ onContinue }: { onContinue: () => void }) {
  const selected = useOnboardingFlow((s) => s.answers.interests);
  const remaining = OnboardingCatalog.minInterests - selected.length;
  const items = OnboardingCatalog.interests;
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <OnboardingStepLayout
      title="Discover what drives you"
      subtitle={
        remaining > 0
          ? `Pick at least ${OnboardingCatalog.minInterests} to shape your feed. ${remaining} to go.`
          : 'Great choices. Add more if you like.'
      }
      buttonText="Continue"
      onPressed={selected.length >= OnboardingCatalog.minInterests ? onContinue : null}
    >
      <View>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', marginBottom: 12 }}>
            {row.map((interest, i) => (
              <StaggerIn key={interest.value} index={r * 2 + i} step={40} style={{ flex: 1, aspectRatio: 1.55, marginLeft: i === 0 ? 0 : 12 }}>
                <InterestGridTile
                  label={interest.label}
                  icon={interest.icon}
                  selected={selected.includes(interest.value)}
                  onTap={() => {
                    const updated = selected.includes(interest.value)
                      ? selected.filter((s) => s !== interest.value)
                      : [...selected, interest.value];
                    useOnboardingFlow.getState().update((a) => ({ ...a, interests: updated }));
                  }}
                />
              </StaggerIn>
            ))}
          </View>
        ))}
      </View>
    </OnboardingStepLayout>
  );
}
