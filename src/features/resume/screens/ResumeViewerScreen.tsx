import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { openInExternalBrowser } from '@/core/helpers/externalBrowser';
import { param, push, readExtra } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { bgLight, bgMain, textPrimary, textTertiary, themeColor } from '@/core/theme/colors';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

export interface ResumeViewArgs {
  url: string;
  fileName: string;
}

/**
 * iOS — in-app WKWebView preview (renders PDF / DOC natively). Android — the
 * system browser (Android WebView has no renderer for these formats).
 */
export async function openResumeFile(args: ResumeViewArgs): Promise<boolean> {
  if (Platform.OS === 'ios') {
    push(RouteNames.resumeView, { url: args.url, fileName: args.fileName });
    return true;
  }
  return openInExternalBrowser(args.url);
}

export function ResumeViewerScreen() {
  const params = useLocalSearchParams<{ url?: string; fileName?: string; x?: string }>();
  const extra = readExtra<ResumeViewArgs>(params.x);
  const url = extra?.url ?? param(params.url) ?? '';
  const fileName = extra?.fileName ?? param(params.fileName) ?? 'Resume';
  const [progress, setProgress] = useState(0);

  if (!url) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgMain }}>
        <View style={styles.bar}>
          <AppBackButton />
          <Text style={[styles.title, { marginLeft: 12 }]}>Resume unavailable</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ textAlign: 'center' }}>This resume preview has expired. Open it again from your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgMain }}>
      <View style={styles.bar}>
        <AppBackButton onTap={() => router.back()} />
        <Text numberOfLines={1} style={[styles.title, { flex: 1, marginLeft: 12 }]}>
          {fileName}
        </Text>
        <Pressable onPress={() => openInExternalBrowser(url)} style={{ padding: 10 }} accessibilityLabel="Open in external browser">
          <Icon name="open-in-new" size={20} color={textTertiary} />
        </Pressable>
      </View>
      {progress < 1 ? (
        <View style={{ height: 2, backgroundColor: bgLight }}>
          <View style={{ height: 2, width: `${Math.max(10, progress * 100)}%`, backgroundColor: themeColor }} />
        </View>
      ) : null}
      <WebView source={{ uri: url }} onLoadProgress={(e) => setProgress(e.nativeEvent.progress)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingVertical: 8 },
  title: { fontSize: 15, fontWeight: '700', color: textPrimary },
});
