import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { openInExternalBrowser } from '@/core/helpers/externalBrowser';
import { param } from '@/core/router/nav';
import { bgMain, textMuted, textPrimary, themeColor } from '@/core/theme/colors';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { Icon } from '@/shared/ui/Icon';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';

function hostOf(url: string): string {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1] : url;
}

/**
 * Generic in-app web view. The host is shown in the title bar and "Open in
 * browser" is always offered, so the user can always see where they are.
 */
export function InAppBrowserScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = param(params.url) ?? '';
  const title = param(params.title);
  const valid = /^https?:\/\//i.test(url);
  const [loading, setLoading] = useState(valid);
  const [error, setError] = useState<string | null>(valid ? null : "That link doesn't look valid.");
  const host = hostOf(url);

  const openExternally = async () => {
    const ok = await openInExternalBrowser(url);
    if (!ok) showSnackbar("Couldn't open this link.", { isError: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgMain }} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <View style={{ width: 60, alignItems: 'center' }}>
          <AppBackButton />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.title}>
            {title ?? host}
          </Text>
          <Text numberOfLines={1} style={styles.host}>
            {host}
          </Text>
        </View>
        <Pressable onPress={openExternally} accessibilityLabel="Open in browser" style={{ padding: 12 }}>
          <Icon name="open-in-new" size={20} color={textPrimary} />
        </Pressable>
      </View>
      {error ? (
        <View style={styles.errorWrap}>
          <Icon name="link-off" size={40} color={textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={openExternally} style={{ marginTop: 16, padding: 8 }}>
            <Text style={{ color: themeColor, fontWeight: '600' }}>Open in browser</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: url }}
            originWhitelist={['http://*', 'https://*']}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError("Couldn't load this page.");
            }}
          />
          {loading ? <View style={styles.progress} /> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: bgMain },
  title: { fontSize: 15, fontWeight: '600', color: textPrimary },
  host: { fontSize: 11, color: textMuted },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { marginTop: 12, fontSize: 14, color: textMuted, textAlign: 'center' },
  progress: { position: 'absolute', top: 0, left: 0, height: 2, width: '40%', backgroundColor: themeColor },
});
