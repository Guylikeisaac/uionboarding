import React, { useEffect } from 'react';
import { View } from 'react-native';

import { authManager } from '@/core/auth/authManager';
import { showConfirmDialog } from '@/shared/ui/dialogs';
import type { IconName } from '@/shared/ui/Icon';
import { OnboardingRadioOption } from '@/shared/ui/OnboardingRadioOption';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { StaggerIn } from '../genz/motion';
import { OnboardingCatalog } from '../data/onboardingFlowCatalog';
import { intentIsCandidate, intentLabel, onboardingIntents } from '../models/onboardingAnswers';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

export interface SelectOption {
  label: string;
  subtitle?: string;
  icon?: IconName;
}

/** Template D — the single-select list. */
export function SingleSelectStepView({
  title,
  subtitle,
  options,
  selectedLabel,
  onSelect,
  onContinue,
  buttonText = 'Continue',
  indicatorOnRight = false,
}: {
  title: string;
  subtitle?: string;
  options: SelectOption[];
  selectedLabel?: string | null;
  onSelect: (label: string) => void;
  onContinue: (() => void) | null;
  buttonText?: string;
  indicatorOnRight?: boolean;
}) {
  return (
    <OnboardingStepLayout
      title={title}
      subtitle={subtitle}
      buttonText={buttonText}
      // Gated on a selection — nothing is pre-selected.
      onPressed={selectedLabel != null ? onContinue : null}
    >
      <View>
        {options.map((o, i) => (
          <StaggerIn key={o.label} index={i} style={{ marginBottom: 12 }}>
            <OnboardingRadioOption
              label={o.label}
              subtitle={o.subtitle}
              leadingIcon={o.icon}
              indicatorOnRight={indicatorOnRight}
              selected={selectedLabel === o.label}
              onTap={() => onSelect(o.label)}
            />
          </StaggerIn>
        ))}
      </View>
    </OnboardingStepLayout>
  );
}

/** Asks before discarding answers that a fork change would orphan. */
export function confirmDiscardDownstream(): Promise<boolean> {
  return showConfirmDialog({
    title: 'Change this answer?',
    message: "Changing this will clear what you've already added below it.",
    cancelLabel: 'Keep it',
    confirmLabel: 'Change',
  });
}

/** The primary fork. Required — no skip. */
export function IntentStep({ onContinue }: { onContinue: () => void }) {
  const intent = useOnboardingFlow((s) => s.answers.intent);
  return (
    <SingleSelectStepView
      title="What brings you here?"
      options={onboardingIntents.map((v) => ({ label: intentLabel(v) }))}
      selectedLabel={intent ? intentLabel(intent) : null}
      onContinue={onContinue}
      onSelect={async (label) => {
        const picked = onboardingIntents.find((v) => intentLabel(v) === label)!;
        if (picked === intent) return;
        const flow = useOnboardingFlow.getState();
        const crosses = intent != null && intentIsCandidate(intent) !== intentIsCandidate(picked);
        if (crosses && flow.hasAnswersBelowIntent()) {
          if (!(await confirmDiscardDownstream())) return;
        }
        useOnboardingFlow.getState().setIntent(picked);
      }}
    />
  );
}

const FRESHER = 'Student / Fresher';
const EXPERIENCED = 'Experienced Professional';

/** Icon-card variant. Never pre-selected from resume extraction. */
export function ProfileTypeStep({ onContinue }: { onContinue: () => void }) {
  const type = useOnboardingFlow((s) => s.answers.profileType);
  const selected = type === 'fresher' ? FRESHER : type === 'experienced' ? EXPERIENCED : null;
  return (
    <SingleSelectStepView
      title="Which best describes you?"
      indicatorOnRight
      options={[
        { label: FRESHER, subtitle: 'Just starting out or still studying', icon: 'school' },
        { label: EXPERIENCED, subtitle: "I've work experience to add", icon: 'work-outline' },
      ]}
      selectedLabel={selected}
      onContinue={onContinue}
      onSelect={(label) => useOnboardingFlow.getState().setProfileType(label === FRESHER ? 'fresher' : 'experienced')}
    />
  );
}

export function NoticePeriodStep({ onContinue }: { onContinue: () => void }) {
  const notice = useOnboardingFlow((s) => s.answers.noticePeriod);
  return (
    <SingleSelectStepView
      title="What is your notice period?"
      options={OnboardingCatalog.noticePeriods.map((o) => ({ label: o }))}
      selectedLabel={notice || null}
      onSelect={(label) => useOnboardingFlow.getState().update((a) => ({ ...a, noticePeriod: label }))}
      onContinue={onContinue}
    />
  );
}

/** Same screen as NoticePeriodStep with a shorter list. */
export function JoinAvailabilityStep({ onContinue }: { onContinue: () => void }) {
  const join = useOnboardingFlow((s) => s.answers.joinAvailability);
  return (
    <SingleSelectStepView
      title="When can you join?"
      options={OnboardingCatalog.joinAvailability.map((o) => ({ label: o }))}
      selectedLabel={join || null}
      onSelect={(label) => useOnboardingFlow.getState().update((a) => ({ ...a, joinAvailability: label }))}
      onContinue={onContinue}
    />
  );
}

/** Conditional gate — "Yes" inserts the internship form into the sequence. */
export function InternshipQuestionStep({ onContinue }: { onContinue: () => void }) {
  const did = useOnboardingFlow((s) => s.answers.didInternship);
  return (
    <SingleSelectStepView
      title="Did you do any internship?"
      options={[{ label: 'Yes' }, { label: 'No' }]}
      selectedLabel={did === true ? 'Yes' : did === false ? 'No' : null}
      onContinue={onContinue}
      onSelect={async (label) => {
        const picked = label === 'Yes';
        if (picked === did) return;
        if (!picked && useOnboardingFlow.getState().hasInternshipData()) {
          if (!(await confirmDiscardDownstream())) return;
        }
        useOnboardingFlow.getState().setDidInternship(picked);
      }}
    />
  );
}

/** A data flag, not a fork. */
export function HiringStep({ onContinue }: { onContinue: () => void }) {
  const hiring = useOnboardingFlow((s) => s.answers.currentlyHiring);
  return (
    <SingleSelectStepView
      title="Are you currently hiring?"
      options={[
        { label: 'Yes', subtitle: "Hiring — we'll help you post a job later." },
        { label: 'No', subtitle: 'Just networking / visibility for now' },
      ]}
      selectedLabel={hiring === true ? 'Yes' : hiring === false ? 'No' : null}
      onSelect={(label) => useOnboardingFlow.getState().update((a) => ({ ...a, currentlyHiring: label === 'Yes' }))}
      onContinue={onContinue}
    />
  );
}

/** Terminal step ("Proceed"). Prefilled from the session user's gender. */
export function GenderStep({ onContinue, isSubmitting }: { onContinue: () => void; isSubmitting: boolean }) {
  const gender = useOnboardingFlow((s) => s.answers.gender);

  useEffect(() => {
    const flow = useOnboardingFlow.getState();
    if (flow.answers.gender != null) return;
    const apiValue = authManager.currentUser?.gender?.trim().toLowerCase();
    if (!apiValue) return;
    for (const [label, value] of Object.entries(OnboardingCatalog.genderToApiValue)) {
      if (value === apiValue) {
        flow.update((a) => ({ ...a, gender: label }));
        return;
      }
    }
  }, []);

  return (
    <SingleSelectStepView
      title="What's your gender?"
      buttonText={isSubmitting ? 'Finishing...' : 'Proceed'}
      options={OnboardingCatalog.genders.map((o) => ({ label: o }))}
      selectedLabel={gender ?? null}
      onSelect={(label) => useOnboardingFlow.getState().update((a) => ({ ...a, gender: label }))}
      onContinue={isSubmitting ? null : onContinue}
    />
  );
}
