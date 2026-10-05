import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppAssets } from '@/core/utils/appAssets';
import { authSupportText, textPrimary } from '@/core/theme/colors';
import { Text } from '@/shared/ui/Text';

/** "Or" rule used between the email CTA and the Google button. */
export function OrDivider() {
  return (
    <View style={styles.or}>
      <View style={styles.rule} />
      <Text style={styles.orText}>Or</Text>
      <View style={styles.rule} />
    </View>
  );
}

/** Outlined "Continue with Google" button. */
export function GoogleAuthButton({ onTap, loading = false }: { onTap?: () => void; loading?: boolean }) {
  return (
    <Pressable onPress={loading ? undefined : onTap} style={styles.btn} accessibilityRole="button">
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Image source={AppAssets.icGoogle} style={{ width: 18, height: 18 }} />
      )}
      <Text style={styles.label}>{loading ? 'Signing in...' : 'Continue with Google'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  orText: { marginHorizontal: 12, fontSize: 13, color: authSupportText },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginLeft: 12, fontSize: 14, fontWeight: '500', color: textPrimary },
});
