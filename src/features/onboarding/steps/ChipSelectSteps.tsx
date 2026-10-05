import React from 'react';

import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { SkillChipInput } from '@/shared/ui/SkillChipInput';
import { SuggestChipInput } from '@/shared/ui/SuggestFields';
import { searchJobTitles } from '../data/locationSearchService';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

/** Template F — search-and-add input producing removable chips. */
export function ChipSelectStepView({
  title,
  hintLabel,
  helperText,
  values,
  onChanged,
  onContinue,
  min,
  max,
}: {
  title: string;
  hintLabel: string;
  helperText?: string;
  values: string[];
  onChanged: (v: string[]) => void;
  onContinue: () => void;
  min: number;
  max: number;
}) {
  return (
    <OnboardingStepLayout title={title} buttonText="Continue" onPressed={values.length >= min ? onContinue : null}>
      <SkillChipInput skills={values} onChanged={onChanged} maxSkills={max} hintLabel={hintLabel} helperText={helperText} />
    </OnboardingStepLayout>
  );
}

/** Experienced branch — target roles, suggested from the job-title catalog. */
export function RolesOpenToStep({ onContinue }: { onContinue: () => void }) {
  const roles = useOnboardingFlow((s) => s.answers.rolesOpenTo);
  return (
    <OnboardingStepLayout
      title="What kind of role are you open to?"
      buttonText="Continue"
      onPressed={roles.length ? onContinue : null}
    >
      <SuggestChipInput
        values={roles}
        max={OnboardingCatalog.maxJobRoles}
        hint="Search job roles"
        helperText={`Add up to ${OnboardingCatalog.maxJobRoles} roles you'd consider. Pick from the list, or type your own and press enter.`}
        onSearch={searchJobTitles}
        onChanged={(updated) => useOnboardingFlow.getState().update((a) => ({ ...a, rolesOpenTo: updated }))}
      />
    </OnboardingStepLayout>
  );
}

/** Rejoin A — both candidate sub-branches merge here. */
export function SkillsStep({ onContinue }: { onContinue: () => void }) {
  const skills = useOnboardingFlow((s) => s.answers.skills);
  return (
    <ChipSelectStepView
      title="Write your top 5 skills"
      hintLabel="Add skill"
      helperText={`Search and select from the list or choose Other to type a custom skill. Add at least ${OnboardingCatalog.minSkills}.`}
      values={skills}
      min={OnboardingCatalog.minSkills}
      max={OnboardingCatalog.maxSkills}
      onChanged={(updated) => useOnboardingFlow.getState().update((a) => ({ ...a, skills: updated }))}
      onContinue={onContinue}
    />
  );
}
