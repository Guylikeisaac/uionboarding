import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const indigo = '#5B5FF5';
const indigoTint = '#EEF0FE';

/**
 * Honest under-development state for surfaces that have no backend yet.
 * Embeddable — it renders inside a tab body.
 */
export function ComingSoonView({ icon, title, bottomPadding = 0 }: { icon: IconName; title: string; bottomPadding?: number }) {
  return (
    <View style={styles.center}>
      <View style={[styles.inner, { paddingBottom: bottomPadding }]}>
        <View style={{ width: 96, height: 96 }}>
          <View style={styles.circle}>
            <Icon name={icon} size={40} color={indigo} />
          </View>
          <View style={styles.badge}>
            <Icon name="construction" size={18} color="#9AA0A6" />
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>This section is currently under development.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { paddingHorizontal: 40, alignItems: 'center' },
  circle: { width: 96, height: 96, borderRadius: 48, backgroundColor: indigoTint, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 22, fontSize: 18, fontWeight: '700', color: '#1C1F2A', textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#6B7280', textAlign: 'center' },
});
