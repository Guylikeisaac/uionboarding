import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accentAmber, textPrimary, textTertiary } from '@/core/theme/colors';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

export function ResumeUploadHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <AppBackButton icon="close" onTap={onClose} />
      <View style={{ marginLeft: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary }}>Upload Resume</Text>
        <Text style={{ marginTop: 2, fontSize: 13, color: textTertiary }}>PDF or DOCX · max 5 MB</Text>
      </View>
    </View>
  );
}

function prettySize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ResumeUploadDropZone({
  fileName,
  fileSizeBytes,
  onTap,
}: {
  fileName?: string;
  fileSizeBytes?: number;
  onTap?: () => void;
}) {
  const hasFile = !!fileName;
  return (
    <Pressable
      onPress={onTap}
      disabled={!onTap}
      style={[styles.zone, { borderColor: hasFile ? '#0A0A0A' : '#D4D4D4' }]}
    >
      <View style={[styles.zoneIcon, { backgroundColor: hasFile ? '#EFF1FF' : '#F4F5F9' }]}>
        <Icon name={hasFile ? 'description' : 'upload'} color="#A0A8B7" size={34} />
      </View>
      <Text numberOfLines={2} style={styles.zoneTitle}>
        {hasFile ? fileName : 'Tap to select file'}
      </Text>
      <Text style={styles.zoneSub}>
        {hasFile
          ? fileSizeBytes != null
            ? `${prettySize(fileSizeBytes)} · Tap to change`
            : 'Already uploaded · Tap to replace'
          : 'PDF, DOCX · Max 5 MB'}
      </Text>
    </Pressable>
  );
}

export function ResumeUploadTipCard() {
  return (
    <View style={styles.tip}>
      <Icon name="lightbulb-outline" color="#D9A019" size={16} style={{ marginTop: 2 }} />
      <Text style={styles.tipText}>
        Tip: A tailored resume gets 3× more recruiter views. Highlight measurable achievements.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  zone: {
    width: '100%',
    paddingVertical: 54,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    backgroundColor: '#FCFCFE',
    alignItems: 'center',
  },
  zoneIcon: { width: 82, height: 82, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  zoneTitle: { marginTop: 18, fontSize: 16, fontWeight: '700', color: '#3C4355', textAlign: 'center' },
  zoneSub: { marginTop: 6, fontSize: 13, color: '#A3A8B5' },
  tip: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F1D77B',
  },
  tipText: { flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19.5, color: accentAmber },
});
