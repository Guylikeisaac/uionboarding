import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { pickDocument } from '@/core/files/pickers';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { UploadDropZone } from '@/shared/ui/UploadDropZone';
import { UploadStatusCard, type UploadStatusVariant } from '@/shared/ui/UploadStatusCard';
import { AuthTextLink } from '@/features/auth/widgets/AuthEntryScaffold';
import { resumeRepository } from '@/features/resume/data/resumeRepository';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';

type ResumeState = 'empty' | 'extracting' | 'extracted' | 'error';

const maxBytes = 5 * 1024 * 1024;
const pollInterval = 2000;
const pollTimeout = 40_000;

/** "skills, education and links". */
function readableList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** What the user will actually see filled in on the next screens. */
function describePrefill(fromPayload: string[]): string[] {
  const a = useOnboardingFlow.getState().answers;
  const out: string[] = [];
  if (a.currentLocation) out.push('location');
  if (a.education.college.trim()) out.push('education');
  if (a.experience.jobTitle.trim() || a.experience.company.trim()) out.push('work experience');
  if (a.skills.length) out.push('skills');
  if (a.linkedinUrl || a.githubUrl || a.twitterUrl || a.websiteUrl) out.push('links');
  out.push(...fromPayload.filter((f) => !['education', 'work experience', 'skills', 'links'].includes(f)));
  return out;
}

/**
 * Template E — one screen, four states (empty → extracting → extracted /
 * error). "Enter details manually" stays enabled in every state.
 */
export function ResumeStep({ onContinue, onEnterManually }: { onContinue: () => void; onEnterManually: () => void }) {
  const existing = useOnboardingFlow.getState().answers.resumeFileName;
  const [state, setState] = useState<ResumeState>(existing ? 'extracted' : 'empty');
  const [fileName, setFileName] = useState<string | undefined>(existing);
  const [pickError, setPickError] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [prefilled, setPrefilled] = useState<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pickFile = async () => {
    if (state === 'extracting') return;
    setPickError(null);
    let file;
    try {
      file = await pickDocument();
    } catch {
      setPickError("Couldn't open the file picker.");
      return;
    }
    if (!mounted.current || !file) return;
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setPickError('Upload a PDF, DOC or DOCX file.');
      return;
    }
    if ((file.size ?? 0) > maxBytes) {
      setPickError('That file is over 5 MB. Try a smaller one.');
      return;
    }
    setFileName(file.name);
    setState('extracting');
    await uploadAndParse(file.uri, file.name, file.mimeType);
  };

  const uploadAndParse = async (uri: string, name: string, mimeType?: string) => {
    try {
      await resumeRepository.upload({ fileUri: uri, fileName: name, mimeType });
    } catch {
      if (!mounted.current) return;
      setState('error');
      setUploadFailed(true);
      return;
    }
    const flow = useOnboardingFlow.getState();
    flow.update((a) => ({ ...a, resumeFileName: name }));

    const deadline = Date.now() + pollTimeout;
    while (mounted.current && Date.now() < deadline) {
      const result = await resumeRepository.parseStatus();
      if (!mounted.current) return;
      if (result.status === 'ready') {
        useOnboardingFlow.getState().update((a) => ({ ...a, resumeParsed: true }));
        await useOnboardingFlow.getState().rehydrateFromServer();
        if (!mounted.current) return;
        const filled = result.data ? useOnboardingFlow.getState().applyResumePrefill(result.data) : [];
        setPrefilled(describePrefill(filled));
        setState('extracted');
        return;
      }
      if (result.status === 'failed') {
        setState('error');
        setUploadFailed(false);
        return;
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    if (!mounted.current) return;
    await useOnboardingFlow.getState().rehydrateFromServer();
    if (!mounted.current) return;
    setPrefilled(describePrefill([]));
    setState('extracted');
  };

  const variant: UploadStatusVariant = state === 'extracting' ? 'loading' : state === 'extracted' ? 'success' : 'error';
  const title =
    state === 'error'
      ? uploadFailed
        ? 'Upload failed'
        : "Couldn't read that file"
      : state === 'extracted'
        ? prefilled.length
          ? 'Resume added'
          : 'Resume saved'
        : 'Extracting resume';
  const message =
    state === 'error'
      ? uploadFailed
        ? "We couldn't upload that file. Check your connection and try again, or enter your details manually."
        : "Your resume was saved, but we couldn't pull details out of it. You can continue and fill them in yourself."
      : state === 'extracted'
        ? prefilled.length === 0
          ? "Your resume is saved to your profile. We couldn't pull any details out of it, so the next few screens start blank."
          : `We've filled in your ${readableList(prefilled)} from your resume. You can edit any of it on the next few screens.`
        : "We're reading your resume and filling profile details. Continue unlocks when this finishes.";

  return (
    <OnboardingStepLayout
      title="Upload your resume"
      buttonText={state === 'extracting' ? 'Extracting...' : 'Continue'}
      onPressed={state === 'extracted' || (state === 'error' && !uploadFailed) ? onContinue : null}
      belowButton={<AuthTextLink label="Enter details manually" onTap={onEnterManually} />}
    >
      <View>
        <UploadDropZone
          label={fileName ?? 'Tap to upload resume'}
          caption={fileName == null ? 'PDF, DOC, DOCX up to 5 MB' : undefined}
          errorText={pickError}
          onTap={pickFile}
        />
        {state !== 'empty' ? (
          <View style={{ marginTop: 16 }}>
            <UploadStatusCard
              variant={variant}
              title={title}
              message={message}
              onRetry={state === 'error' ? pickFile : undefined}
            />
          </View>
        ) : null}
      </View>
    </OnboardingStepLayout>
  );
}
