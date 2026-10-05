import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accentRed, stroke, textInverted, textMuted } from '@/core/theme/colors';
import { useFieldBox } from './AppTextField';
import { DarkUi, useDark } from './darkScope';
import { CIcon, type CommunityIconName } from './Icon';
import { Text, TextInput } from './Text';

/** Icon + label + URL field card used on the work-links onboarding step. */
export function WorkLinkTile({
  icon,
  iconColor,
  label,
  value,
  onChangeText,
  hint,
  validator,
  forceValidate = false,
}: {
  icon: CommunityIconName;
  iconColor: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  hint: string;
  validator?: (v: string) => string | null;
  /** Show the validator result even before the user edits (form submit). */
  forceValidate?: boolean;
}) {
  const fieldBox = useFieldBox();
  const dark = useDark();
  const [touched, setTouched] = useState(false);
  const error = (touched || forceValidate) && validator ? validator(value) : null;
  return (
    <View style={[styles.card, dark && { backgroundColor: DarkUi.field, borderColor: DarkUi.border, borderRadius: 16 }]}>
      <View style={styles.row}>
        <CIcon name={icon} color={iconColor} size={20} />
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {value.length > 0 ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <CIcon name="close" size={16} color={textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={[fieldBox, { marginTop: 8 }, error ? { borderColor: accentRed } : null]}>
        <TextInput
          value={value}
          onChangeText={(v) => {
            setTouched(true);
            onChangeText(v);
          }}
          placeholder={hint}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: stroke },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600', color: textInverted },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 13, color: textInverted },
  error: { fontSize: 11, color: accentRed, marginTop: 4, marginLeft: 4 },
});
