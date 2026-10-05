import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  accentRed,
  authCheckboxActive,
  authCheckboxBorder,
  textDisabled,
  textInverted,
  textMuted,
} from '@/core/theme/colors';
import { useFieldBox } from '@/shared/ui/AppTextField';
import { DarkUi, useDark } from '@/shared/ui/darkScope';
import { Icon } from '@/shared/ui/Icon';
import { formatMonthYear, showMonthYearPicker } from '@/shared/ui/MonthYearPicker';
import { Text } from '@/shared/ui/Text';

/** Label with the required asterisk appended. */
export function FieldLabel({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}
      {required ? '*' : ''}
    </Text>
  );
}

/** Tappable month/year field with the trailing calendar affordance. */
export function OnboardingDateField({
  label,
  value,
  onPicked,
  enabled = true,
  required = true,
  hint = 'mm-yyyy',
}: {
  label: string;
  value?: Date;
  onPicked: (d: Date) => void;
  enabled?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const fieldBox = useFieldBox();
  const text = formatMonthYear(value);
  return (
    <View>
      <FieldLabel text={label} required={required} />
      <Pressable
        disabled={!enabled}
        onPress={async () => {
          const picked = await showMonthYearPicker({ initial: value, title: `Select ${label}` });
          if (picked) onPicked(picked);
        }}
        style={[fieldBox, styles.dateBox, { opacity: enabled ? 1 : 0.7 }]}
      >
        <Text style={{ flex: 1, fontSize: 14, color: !enabled ? textDisabled : text ? textInverted : textDisabled }}>
          {text || hint}
        </Text>
        <Icon name="calendar-today" size={16} color={enabled ? textMuted : textDisabled} />
      </Pressable>
    </View>
  );
}

/** Small left-aligned checkbox row ("I currently work here"). */
export function OnboardingCheckboxRow({
  label,
  value,
  onChanged,
}: {
  label: string;
  value: boolean;
  onChanged: (v: boolean) => void;
}) {
  const dark = useDark();
  const on = dark ? '#FFFFFF' : authCheckboxActive;
  return (
    <Pressable
      onPress={() => onChanged(!value)}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View
        style={[
          styles.box,
          value ? { backgroundColor: on, borderColor: on } : { borderColor: dark ? DarkUi.border : authCheckboxBorder },
        ]}
      >
        {value ? <Icon name="check" size={14} color={dark ? '#000000' : '#FFFFFF'} /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

/** Caption under a field. */
export function FieldHelperText({ text, isError = false }: { text: string; isError?: boolean }) {
  return <Text style={[styles.helper, { color: isError ? accentRed : textMuted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: textInverted, marginBottom: 6 },
  dateBox: { paddingHorizontal: 16, paddingVertical: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { marginLeft: 8, fontSize: 12, color: textInverted },
  helper: { marginTop: 6, fontSize: 11, lineHeight: 14.9 },
});
