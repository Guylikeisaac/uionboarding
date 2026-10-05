import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { extensionOf } from '@/core/files/pickedFile';
import { fileSize, pickImages } from '@/core/files/pickers';
import { putFileToS3 } from '@/core/network/s3Uploader';
import { accentRed, textInverted } from '@/core/theme/colors';
import { FormValidators } from '@/core/utils/formValidators';
import { AppTextField } from '@/shared/ui/AppTextField';
import { OnboardingStepLayout } from '@/shared/ui/OnboardingStepLayout';
import { Text } from '@/shared/ui/Text';
import { UploadDropZone } from '@/shared/ui/UploadDropZone';
import { AuthTextLink } from '@/features/auth/widgets/AuthEntryScaffold';
import { onboardingRepository } from '../data/onboardingRepository';
import { blankProject, projectIsComplete, type ProjectEntry } from '../models/onboardingAnswers';
import { useOnboardingFlow } from '../providers/onboardingFlowStore';
import { FieldHelperText, FieldLabel, OnboardingCheckboxRow, OnboardingDateField } from './FormFields';

const maxProjects = 5;
const maxImages = 5;
const maxImageBytes = 5 * 1024 * 1024;

function contentTypeFor(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/** Fresher branch — portfolio work: a repeatable block with an image picker. */
export function ProjectsStep({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const projects = useOnboardingFlow((s) => s.answers.projects);
  const update = useOnboardingFlow((s) => s.update);

  useEffect(() => {
    if (projects.length === 0) update((a) => ({ ...a, projects: [blankProject()] }));
  }, [projects.length, update]);

  if (projects.length === 0) return null;

  const canContinue = projects.every(projectIsComplete);
  const replace = (localId: string, mutate: (p: ProjectEntry) => ProjectEntry) =>
    update((a) => ({ ...a, projects: a.projects.map((p) => (p.localId === localId ? mutate(p) : p)) }));

  return (
    <OnboardingStepLayout
      title="Add your projects"
      buttonText="Continue"
      onPressed={canContinue ? onContinue : null}
      belowButton={<AuthTextLink label="Skip" onTap={onSkip} />}
    >
      <View>
        {projects.map((p, i) => (
          <View key={p.localId}>
            {i > 0 ? (
              <>
                <View style={{ height: 24 }} />
                <View style={{ height: 1, backgroundColor: '#2A2A2A' }} />
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>Project {i + 1}</Text>
                  <Pressable onPress={() => useOnboardingFlow.getState().removeProject(p.localId)} hitSlop={8}>
                    <Text style={{ fontSize: 12, color: accentRed }}>Remove</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            <ProjectBlock entry={p} onChange={(m) => replace(p.localId, m)} />
          </View>
        ))}
        {projects.length < maxProjects ? (
          <Pressable
            style={{ marginTop: 16, alignSelf: 'flex-start' }}
            onPress={() => update((a) => ({ ...a, projects: [...a.projects, blankProject()] }))}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF', textDecorationLine: 'underline' }}>+ Add project</Text>
          </Pressable>
        ) : null}
      </View>
    </OnboardingStepLayout>
  );
}

function ProjectBlock({ entry, onChange }: { entry: ProjectEntry; onChange: (m: (p: ProjectEntry) => ProjectEntry) => void }) {
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [descTouched, setDescTouched] = useState(false);
  const [linkTouched, setLinkTouched] = useState(false);
  const dateOrderInvalid = !!entry.start && !!entry.end && entry.end.getTime() < entry.start.getTime();

  /** Picks images and uploads them immediately (pick-time upload). */
  const pickAndUpload = async () => {
    if (uploading) return;
    const remaining = maxImages - entry.imageKeys.length;
    if (remaining <= 0) {
      setImageError(`You can add up to ${maxImages} images.`);
      return;
    }
    let picked;
    try {
      picked = await pickImages(remaining);
    } catch {
      setImageError("Couldn't open the photo picker.");
      return;
    }
    if (!picked.length) return;
    setUploading(true);
    setImageError(null);
    const keys: string[] = [];
    let error: string | null = null;
    for (const file of picked.slice(0, remaining)) {
      try {
        if ((await fileSize(file)) > maxImageBytes) {
          error = 'Images must be under 5 MB.';
          continue;
        }
        const ext = extensionOf(file.name) || 'jpg';
        const presign = await onboardingRepository.projectImageUploadUrl(ext, contentTypeFor(ext));
        if (!presign) {
          error = "Couldn't prepare the upload. Please try again.";
          continue;
        }
        await putFileToS3({ uploadUrl: presign.uploadUrl, filePath: file.uri, contentType: contentTypeFor(ext) });
        keys.push(presign.key);
      } catch {
        error = "Couldn't upload one of those images.";
      }
    }
    if (keys.length) onChange((p) => ({ ...p, imageKeys: [...p.imageKeys, ...keys] }));
    setUploading(false);
    setImageError(error);
  };

  return (
    <View>
      <AppTextField
        label="Title*"
        value={entry.title}
        onChangeText={(t) => onChange((p) => ({ ...p, title: t }))}
        hint="eg: Campus event app"
        autoCapitalize="sentences"
      />
      <View style={{ height: 16 }} />
      <FieldLabel text="Description" required />
      <AppTextField
        value={entry.description}
        onChangeText={(t) => {
          setDescTouched(true);
          onChange((p) => ({ ...p, description: t }));
        }}
        hint="What did you work on?"
        multiline
        multilineHeight={84}
        autoCapitalize="sentences"
        error={descTouched ? FormValidators.projectDescription(entry.description) : null}
      />
      <View style={{ height: 16 }} />
      <AppTextField
        label="Project link"
        value={entry.link}
        onChangeText={(t) => {
          setLinkTouched(true);
          onChange((p) => ({ ...p, link: t }));
        }}
        hint="https://github.com/"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        error={linkTouched ? FormValidators.webAddress(entry.link) : null}
      />
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <OnboardingDateField label="Start month/year" value={entry.start} onPicked={(d) => onChange((p) => ({ ...p, start: d }))} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <OnboardingDateField
            label="End month/year"
            value={entry.end}
            enabled={!entry.ongoing}
            onPicked={(d) => onChange((p) => ({ ...p, end: d }))}
          />
        </View>
      </View>
      {dateOrderInvalid ? <FieldHelperText text="The end date must be on or after the start date." isError /> : null}
      <View style={{ height: 10 }} />
      <OnboardingCheckboxRow
        label="Currently working on this"
        value={entry.ongoing}
        onChanged={(v) => onChange((p) => ({ ...p, ongoing: v, end: v ? undefined : p.end }))}
      />
      <View style={{ height: 16 }} />
      <FieldLabel text="Images (optional, up to 5)" />
      <UploadDropZone
        size="compact"
        label={
          uploading
            ? 'Uploading...'
            : entry.imageKeys.length === 0
              ? 'Add images of the projects'
              : `${entry.imageKeys.length} image(s) added`
        }
        errorText={imageError}
        onTap={() => {
          if (!uploading) pickAndUpload();
        }}
      />
      {entry.imageKeys.length > 0 && !uploading ? (
        <Pressable style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => onChange((p) => ({ ...p, imageKeys: [] }))}>
          <Text style={{ fontSize: 12, color: accentRed }}>Remove images</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blockHeader: { marginTop: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: 13, fontWeight: '600', color: textInverted },
});
