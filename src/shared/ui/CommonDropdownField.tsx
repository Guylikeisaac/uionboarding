import React from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { accentRed, stroke, textDisabled, textInverted, textMuted, textPrimary } from '@/core/theme/colors';
import { useFieldBox } from './AppTextField';
import { DarkUi, useDark } from './darkScope';
import { Icon } from './Icon';
import { showAppBottomSheet } from './overlay';
import { Text } from './Text';

export interface DropdownItem<T> {
  value: T;
  label: string;
}

/**
 * App-styled dropdown with an optional label above the field. Opens the
 * options in a bottom sheet (native RN has no Material dropdown menu).
 */
export function CommonDropdownField<T>({
  label,
  hint,
  value,
  items,
  onChanged,
  error,
  onTap,
  sheetTitle,
}: {
  label?: string;
  hint: string;
  value: T | null | undefined;
  items: DropdownItem<T>[];
  onChanged: (v: T) => void;
  error?: string | null;
  onTap?: () => void;
  sheetTitle?: string;
}) {
  const fieldBox = useFieldBox();
  const selected = items.find((i) => i.value === value);
  const open = async () => {
    Keyboard.dismiss();
    onTap?.();
    const picked = await pickFromList({ title: sheetTitle ?? label ?? hint, items, selected: value ?? undefined });
    if (picked !== undefined) onChanged(picked);
  };
  return (
    <View>
      {label?.trim() ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        style={[fieldBox, styles.field, error ? { borderColor: accentRed } : null]}
      >
        <Text numberOfLines={1} style={[styles.value, { color: selected ? textInverted : textDisabled }]}>
          {selected ? selected.label : hint}
        </Text>
        <Icon name="keyboard-arrow-down" color={textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Bottom-sheet single-choice list. Resolves the picked value. */
export function pickFromList<T>({
  title,
  items,
  selected,
}: {
  title?: string;
  items: DropdownItem<T>[];
  selected?: T;
}): Promise<T | undefined> {
  return showAppBottomSheet<T>(
    (close) => (
      <View style={{ maxHeight: 520 }}>
        {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSel = item.value === selected;
            return <DropdownRow label={item.label} selected={isSel} onTap={() => close(item.value)} />;
          }}
          ItemSeparatorComponent={() => <RowDivider />}
        />
      </View>
    ),
    { showHandle: true },
  );
}

function DropdownRow({ label, selected, onTap }: { label: string; selected: boolean; onTap: () => void }) {
  const dark = useDark();
  const sel = dark ? '#FFFFFF' : '#0A0A0A';
  return (
    <Pressable onPress={onTap} style={styles.row}>
      <Text style={[styles.rowLabel, selected ? { color: sel, fontWeight: '800' } : null]}>{label}</Text>
      {selected ? <Icon name="check" size={18} color={sel} /> : null}
    </Pressable>
  );
}

function RowDivider() {
  const dark = useDark();
  return <View style={{ height: 1, backgroundColor: dark ? DarkUi.border : stroke, marginLeft: 20 }} />;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '400', color: textInverted, marginBottom: 6 },
  field: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' },
  value: { flex: 1, fontSize: 14, marginRight: 8 },
  error: { fontSize: 11, color: accentRed, marginTop: 4, marginLeft: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: textPrimary, paddingHorizontal: 20, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: 14, color: textInverted },
});
