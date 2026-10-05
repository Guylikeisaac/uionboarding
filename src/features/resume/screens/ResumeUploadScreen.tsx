import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authManager } from '@/core/auth/authManager';
import { RepositoryException } from '@/core/data/repositoryException';
import { pickDocument } from '@/core/files/pickers';
import { useRouteResult } from '@/core/router/useRouteResult';
import { accentPurpleLight, bgMain, stroke, textPrimary, textTertiary, themeColor } from '@/core/theme/colors';
import { AppPrimaryButton } from '@/shared/ui/AppPrimaryButton';
import { showSnackbar } from '@/shared/ui/snackbar';
import { StickyActionBar } from '@/shared/ui/StickyActionBar';
import { Text } from '@/shared/ui/Text';
import { invalidateMyProfile } from '@/features/profile/providers/profileProviders';
import { invalidateProfileSummary } from '@/features/profileMenu/providers/profileMenuProviders';
import { notifySprintOfProfileUpdate } from '@/features/readinessSprint/providers/sprintProviders';
import { sanitizeResumeDisplayName, resumeFileName } from '../data/resumeFile';
import { resumeRepository } from '../data/resumeRepository';
import { invalidateProfileResume } from '../providers/profileResume';
import { ResumeUploadDropZone, ResumeUploadHeader, ResumeUploadTipCard } from '../widgets/ResumeUploadWidgets';

type Status = 'idle' | 'existing' | 'selected' | 'uploading' | 'parsing' | 'success' | 'error';

interface UploadState {
  status: Status;
  fileName?: string;
  fileUri?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  error?: string;
  remoteUploaded: boolean;
  parsed: boolean;
}

const maxBytes = 5 * 1024 * 1024;

/**
 * Standalone resume upload flow. Pops `true` (route result) once the
 * backend confirmed the store.
 */
export function ResumeUploadScreen() {
  const { finish } = useRouteResult<boolean>();
  const [state, setState] = useState<UploadState>({ status: 'idle', remoteUploaded: false, parsed: false });
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    // Reflect an already-uploaded resume on (re-)open.
    (async () => {
      const u = authManager.currentUser;
      const userId = u ? (u.id ? u.id : u.userId) : '';
      if (!userId) return;
      try {
        const file = await resumeRepository.latestResumeFile(userId);
        if (disposed.current || !file) return;
        setState({ status: 'existing', fileName: resumeFileName(file), remoteUploaded: true, parsed: false });
      } catch {
        // stay idle
      }
    })();
    return () => {
      disposed.current = true;
    };
  }, []);

  const pickFile = async () => {
    const file = await pickDocument();
    if (!file) return;
    if ((file.size ?? 0) > maxBytes) {
      setState({ status: 'error', error: 'That file is larger than 5 MB. Please choose a smaller file.', remoteUploaded: false, parsed: false });
      return;
    }
    setState({
      status: 'selected',
      fileName: sanitizeResumeDisplayName(file.name),
      fileUri: file.uri,
      mimeType: file.mimeType,
      fileSizeBytes: file.size,
      remoteUploaded: false,
      parsed: false,
    });
  };

  /** Polls briefly; true only when parsing is confirmed ready. */
  const pollParse = async (): Promise<boolean> => {
    for (let i = 0; i < 4; i++) {
      if (disposed.current) return false;
      const r = await resumeRepository.parseStatus();
      if (disposed.current) return false;
      if (r.status === 'ready') return true;
      if (r.status === 'failed') return false;
      await new Promise((res) => setTimeout(res, 2000));
    }
    return false;
  };

  const upload = async () => {
    if (!state.fileUri) return;
    showSnackbar('Uploading your resume...');
    const name = state.fileName ?? 'resume.pdf';
    setState((s) => ({ ...s, status: 'uploading', error: undefined }));
    try {
      await resumeRepository.upload({ fileUri: state.fileUri, fileName: name, mimeType: state.mimeType });
      if (disposed.current) return;
      setState((s) => ({ ...s, status: 'parsing', remoteUploaded: true }));
      notifySprintOfProfileUpdate();
      const parsed = await pollParse();
      if (disposed.current) return;
      void invalidateProfileResume();
      if (parsed) {
        void invalidateMyProfile();
        void invalidateProfileSummary();
        showSnackbar("Resume parsed. We've updated your profile from it.");
      } else {
        showSnackbar("Resume uploaded. We're still reading it, your profile will update shortly.");
      }
      finish(true);
    } catch (e) {
      if (disposed.current) return;
      const msg = e instanceof RepositoryException ? e.message : 'Something went wrong. Please try again.';
      setState((s) => ({ ...s, status: 'error', error: msg }));
      showSnackbar(msg, { isError: true });
    }
  };

  const busy = state.status === 'uploading' || state.status === 'parsing';
  const hasLocalFile = !!state.fileUri;
  const canUpload = hasLocalFile && !busy;
  const label =
    state.status === 'uploading'
      ? 'Uploading...'
      : state.status === 'parsing'
        ? 'Parsing your resume...'
        : state.remoteUploaded && !hasLocalFile
          ? 'Resume Uploaded'
          : 'Upload Resume';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgMain }} edges={['top']}>
      <ResumeUploadHeader onClose={() => (router.canGoBack() ? router.back() : undefined)} />
      <View style={{ height: 1, backgroundColor: stroke }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
        <ResumeUploadDropZone
          fileName={state.fileName}
          fileSizeBytes={state.fileSizeBytes}
          onTap={busy ? undefined : pickFile}
        />
        {state.status === 'parsing' ? (
          <View style={styles.parsing}>
            <ActivityIndicator color={themeColor} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>Parsing your resume...</Text>
              <Text style={{ marginTop: 2, fontSize: 13, color: textTertiary }}>
                We&apos;re reading your details to fill your profile.
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ height: 16 }} />
        <ResumeUploadTipCard />
      </ScrollView>
      <StickyActionBar>
        <AppPrimaryButton
          text={label}
          onPressed={canUpload ? upload : null}
          isEnabled={canUpload}
          height={54}
          backgroundColor={themeColor}
          disabledBackgroundColor="#F0F1F6"
          disabledForegroundColor="#B2B6C4"
          borderRadius={16}
          textStyle={{ fontSize: 16, fontWeight: '700' }}
        />
      </StickyActionBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  parsing: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: accentPurpleLight,
  },
});
