import React, { useState } from 'react';
import { View } from 'react-native';

import { textInverted } from '@/core/theme/colors';
import { FormValidators } from '@/core/utils/formValidators';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { WorkLinkTile } from '@/shared/ui/WorkLinkTile';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

/** Warns when a link is pasted into the wrong platform's field. */
function hostValidator(host: string, platform: string) {
  return (value: string) => {
    const invalid = FormValidators.webAddress(value);
    if (invalid) return invalid;
    if (!value.trim()) return null;
    if (!value.toLowerCase().includes(host)) return `That doesn't look like a ${platform} link.`;
    return null;
  };
}

const linkedinV = hostValidator('linkedin.com', 'LinkedIn');
const githubV = hostValidator('github.com', 'GitHub');

/** External profile URLs. All optional — the CTA is never disabled. */
export function WorkLinksStep({ onContinue }: { onContinue: () => void }) {
  const initial = useOnboardingFlow.getState().answers;
  const [linkedin, setLinkedin] = useState(initial.linkedinUrl);
  const [twitter, setTwitter] = useState(initial.twitterUrl);
  const [github, setGithub] = useState(initial.githubUrl);
  const [website, setWebsite] = useState(initial.websiteUrl);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = () => {
    setSubmitted(true);
    const invalid =
      linkedinV(linkedin) || FormValidators.webAddress(twitter) || githubV(github) || FormValidators.webAddress(website);
    if (invalid) return;
    useOnboardingFlow.getState().update((a) => ({
      ...a,
      linkedinUrl: FormValidators.normalizeUrl(linkedin),
      twitterUrl: FormValidators.normalizeUrl(twitter),
      githubUrl: FormValidators.normalizeUrl(github),
      websiteUrl: FormValidators.normalizeUrl(website),
    }));
    onContinue();
  };

  return (
    <OnboardingStepLayout
      title="Add your work links"
      subtitle="Paste full profile URLs. We add https:// automatically if missing."
      buttonText="Continue"
      onPressed={onSubmit}
    >
      <View>
        <WorkLinkTile
          icon="link"
          iconColor={textInverted}
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          hint="paste link here"
          validator={linkedinV}
          forceValidate={submitted}
        />
        <View style={{ height: 14 }} />
        <WorkLinkTile
          icon="at"
          iconColor={textInverted}
          label="Twitter / X"
          value={twitter}
          onChangeText={setTwitter}
          hint="paste link here"
          validator={FormValidators.webAddress}
          forceValidate={submitted}
        />
        <View style={{ height: 14 }} />
        <WorkLinkTile
          icon="code-tags"
          iconColor={textInverted}
          label="GitHub"
          value={github}
          onChangeText={setGithub}
          hint="paste link here"
          validator={githubV}
          forceValidate={submitted}
        />
        <View style={{ height: 14 }} />
        <WorkLinkTile
          icon="web"
          iconColor={textInverted}
          label="Website"
          value={website}
          onChangeText={setWebsite}
          hint="paste link here"
          validator={FormValidators.webAddress}
          forceValidate={submitted}
        />
      </View>
    </OnboardingStepLayout>
  );
}
