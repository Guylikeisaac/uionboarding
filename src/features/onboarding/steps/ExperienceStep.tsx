import React from 'react';
import { Pressable, View } from 'react-native';

import { queryClient } from '@/core/query/queryClient';
import { AppTextField } from '@/shared/ui/AppTextField';
import { CommonDropdownField } from '@/shared/ui/CommonDropdownField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { catalogDisplayName, type CatalogOption } from '../data/models/catalogOption';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { experienceIsComplete, type ExperienceEntry } from '../models/onboardingAnswers';
import { useExperienceCatalogs } from '../providers/experienceCatalogs';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';
import { FieldHelperText, FieldLabel, OnboardingCheckboxRow, OnboardingDateField } from './FormFields';

/**
 * Experienced branch — the anchor record of the profile. "I currently work
 * here" disables *and* clears the To date; To must be on or after From.
 */
export function ExperienceStep({ onContinue }: { onContinue: () => void }) {
  const entry = useOnboardingFlow((s) => s.answers.experience);
  const catalogs = useExperienceCatalogs();
  const patch = (mutate: (e: ExperienceEntry) => ExperienceEntry) =>
    useOnboardingFlow.getState().update((a) => ({ ...a, experience: mutate(a.experience) }));
  const retry = () => queryClient.invalidateQueries({ queryKey: ['experienceCatalogs'] });

  const dateOrderInvalid = !!entry.from && !!entry.to && entry.to.getTime() < entry.from.getTime();

  return (
    <OnboardingStepLayout
      title="Add your most recent experience"
      buttonText="Continue"
      onPressed={experienceIsComplete(entry) && !dateOrderInvalid ? onContinue : null}
    >
      <View>
        <AppTextField
          label="Job Title*"
          value={entry.jobTitle}
          onChangeText={(t) => patch((e) => ({ ...e, jobTitle: t }))}
          hint="eg: Software Engineer"
          autoCapitalize="words"
        />
        <View style={{ height: 16 }} />
        <CatalogDropdown
          label="Department*"
          hint="Select department"
          value={entry.department}
          options={catalogs.data?.departments}
          isLoading={catalogs.isLoading}
          hasError={catalogs.isError}
          onRetry={retry}
          onChanged={(v) => patch((e) => ({ ...e, department: v }))}
        />
        <View style={{ height: 16 }} />
        <CatalogDropdown
          label="Industry*"
          hint="Select industry"
          value={entry.industry}
          options={catalogs.data?.industries}
          isLoading={catalogs.isLoading}
          hasError={catalogs.isError}
          onRetry={retry}
          onChanged={(v) => patch((e) => ({ ...e, industry: v }))}
        />
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 45 }}>
            <CommonDropdownField<string>
              label="Employment Type*"
              hint="Select One"
              value={entry.employmentType}
              items={OnboardingCatalog.employmentTypes.map((t) => ({ value: t, label: t }))}
              onChanged={(v) => patch((e) => ({ ...e, employmentType: v }))}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 55 }}>
            <AppTextField
              label="Recent Company*"
              value={entry.company}
              onChangeText={(t) => patch((e) => ({ ...e, company: t }))}
              hint="eg: SyncUp"
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <OnboardingDateField label="From" value={entry.from} onPicked={(d) => patch((e) => ({ ...e, from: d }))} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <OnboardingDateField
              label="To"
              value={entry.to}
              enabled={!entry.currentlyWorkHere}
              onPicked={(d) => patch((e) => ({ ...e, to: d }))}
            />
          </View>
        </View>
        {dateOrderInvalid ? (
          <FieldHelperText text="The end date must be on or after the start date." isError />
        ) : null}
        <View style={{ height: 10 }} />
        <OnboardingCheckboxRow
          label="I currently work here"
          value={entry.currentlyWorkHere}
          onChanged={(v) => patch((e) => ({ ...e, currentlyWorkHere: v, to: v ? undefined : e.to }))}
        />
      </View>
    </OnboardingStepLayout>
  );
}

/** Dropdown backed by a server catalog, with visible loading/failure states. */
function CatalogDropdown({
  label,
  hint,
  value,
  options,
  isLoading,
  hasError,
  onRetry,
  onChanged,
}: {
  label: string;
  hint: string;
  value?: string;
  options?: CatalogOption[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onChanged: (v: string) => void;
}) {
  if (hasError) {
    return (
      <View>
        <FieldLabel text={label.replace('*', '')} required />
        <Pressable onPress={onRetry}>
          <FieldHelperText text="Couldn't load these options. Tap to retry." isError />
        </Pressable>
      </View>
    );
  }
  const items = options ?? [];
  return (
    <CommonDropdownField<string>
      label={label}
      hint={isLoading ? 'Loading...' : hint}
      value={items.some((o) => o.name === value) ? value : undefined}
      items={items.map((o) => ({ value: o.name, label: catalogDisplayName(o) }))}
      onChanged={(v) => {
        if (!isLoading) onChanged(v);
      }}
    />
  );
}
