import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { openLegalPage } from '@/core/helpers/legalLinks';
import { textPrimary } from '@/core/theme/colors';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';

/**
 * Explicit consent gate on the mobile-number screen. An unticked box disables
 * the CTA — an affirmative act. Tapping a link must NOT toggle the box.
 */
export function LegalConsentCheckbox({ value, onChanged }: { value: boolean; onChanged: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChanged(!value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
        hitSlop={8}
        style={[styles.box, value ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' } : null]}
      >
        {value ? <Icon name="check" size={16} color="#000000" /> : null}
      </Pressable>
      <Pressable style={{ flex: 1, paddingTop: 2 }} onPress={() => onChanged(!value)}>
        <Text style={styles.text}>
          I agree to SyncUp&apos;s{' '}
          <Text style={styles.link} onPress={() => openLegalPage('terms')}>
            Terms &amp; Conditions
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => openLegalPage('privacy')}>
            Privacy Policy
          </Text>
          .
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  box: {
    width: 20,
    height: 20,
    marginTop: 2,
    marginRight: 10,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#3D3D3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12.5, lineHeight: 18, color: textPrimary },
  link: { textDecorationLine: 'underline', fontWeight: '600', fontSize: 12.5, color: textPrimary },
});
