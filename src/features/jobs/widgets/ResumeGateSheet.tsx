import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accentPurpleLight, bgMain, stroke, textPrimary, textTertiary, themeColor } from '@/core/theme/colors';
import { AppPrimaryButton } from '@/shared/ui/AppPrimaryButton';
import { Icon } from '@/shared/ui/Icon';
import { showAppBottomSheet } from '@/shared/ui/overlay';
import { Text } from '@/shared/ui/Text';

/** "Add your resume to apply" gate. Resolves true on "Upload Resume". */
export function showResumeGateSheet(): Promise<boolean | undefined> {
  return showAppBottomSheet<boolean>((close) => <ResumeGateSheet close={close} />, {
    sheetStyle: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  });
}

function ResumeGateSheet({ close }: { close: (v?: boolean) => void }) {
  return (
    <View style={styles.body}>
      <View style={styles.handle} />
      <View style={styles.iconBox}>
        <Icon name="description" color={themeColor} size={28} />
      </View>
      <Text style={styles.title}>Add your resume to apply</Text>
      <Text style={styles.sub}>Recruiters see your resume with your application. Upload it once and it attaches automatically.</Text>
      <View style={{ height: 24 }} />
      <AppPrimaryButton
        text="Upload Resume"
        onPressed={() => close(true)}
        backgroundColor={themeColor}
        height={54}
        borderRadius={14}
        textStyle={{ fontSize: 16, fontWeight: '700' }}
      />
      <Pressable onPress={() => close(false)} style={{ marginTop: 6, padding: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: textTertiary }}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { backgroundColor: bgMain, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: stroke },
  iconBox: { marginTop: 24, width: 56, height: 56, borderRadius: 16, backgroundColor: accentPurpleLight, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontSize: 18, fontWeight: '700', color: textPrimary, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 19.6, color: textTertiary, textAlign: 'center' },
});
