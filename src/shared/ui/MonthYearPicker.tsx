import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { bgMain, textMuted, textPrimary } from '@/core/theme/colors';
import { monthShortNames } from '@/core/helpers/relativeTime';
import { DarkUi, useDark } from './darkScope';
import { Icon, type IconName } from './Icon';
import { showAppDialog } from './overlay';
import { Text } from './Text';

export const kMonthShort = monthShortNames;

/** Formats a date as e.g. "Jan 2024" — the canonical month-year label. */
export function formatMonthYear(date: Date | null | undefined): string {
  return date ? `${kMonthShort[date.getMonth()]} ${date.getFullYear()}` : '';
}

/**
 * Reusable month + year picker. Resolves the first day of the chosen month,
 * or undefined if cancelled.
 */
export function showMonthYearPicker(opts: {
  initial?: Date | null;
  firstYear?: number;
  lastYear?: number;
  title?: string;
} = {}): Promise<Date | undefined> {
  const now = new Date();
  return showAppDialog<Date>((close) => (
    <MonthYearDialog
      initial={opts.initial ?? null}
      firstYear={opts.firstYear ?? now.getFullYear() - 60}
      lastYear={opts.lastYear ?? now.getFullYear() + 10}
      title={opts.title ?? 'Select date'}
      close={close}
    />
  ));
}

function MonthYearDialog({
  initial,
  firstYear,
  lastYear,
  title,
  close,
}: {
  initial: Date | null;
  firstYear: number;
  lastYear: number;
  title: string;
  close: (v?: Date) => void;
}) {
  const base = initial ?? new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth() + 1);
  const dark = useDark();
  const fg = dark ? '#FFFFFF' : '#0A0A0A';
  const dialogBg = dark ? DarkUi.fieldHi : '#FFFFFF';
  return (
    <View style={[styles.dialog, dark && { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }]}>
      {dark ? (
        <>
          <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,18,18,0.6)' }]} />
        </>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.yearRow}>
        <StepArrow icon="chevron-left" onTap={year > firstYear ? () => setYear(year - 1) : undefined} />
        <Text style={styles.year}>{year}</Text>
        <StepArrow icon="chevron-right" onTap={year < lastYear ? () => setYear(year + 1) : undefined} />
      </View>
      <View style={styles.grid}>
        {kMonthShort.map((m, i) => {
          const selected = i + 1 === month;
          return (
            <Pressable
              key={m}
              onPress={() => setMonth(i + 1)}
              style={[styles.cell, { borderColor: dark ? 'transparent' : dialogBg, backgroundColor: selected ? fg : dark ? 'rgba(255,255,255,0.08)' : '#F4F4F4' }]}
            >
              <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? (dark ? '#000000' : '#FFFFFF') : textPrimary }}>
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => close(undefined)} style={styles.action}>
          <Text style={{ color: textMuted, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Pressable onPress={() => close(new Date(year, month - 1, 1))} style={styles.action}>
          <Text style={{ color: fg, fontWeight: '800' }}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StepArrow({ icon, onTap }: { icon: IconName; onTap?: () => void }) {
  const dark = useDark();
  return (
    <Pressable onPress={onTap} disabled={!onTap} style={[styles.arrow, dark && { backgroundColor: '#262626' }]}>
      <Icon name={icon} size={20} color={onTap ? (dark ? '#FFFFFF' : textPrimary) : dark ? '#4A4A4A' : '#C2C6D0'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dialog: { backgroundColor: bgMain, borderRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: textPrimary },
  yearRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  year: { fontSize: 18, fontWeight: '700', color: textPrimary },
  grid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: {
    width: '25%',
    aspectRatio: 1.7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: bgMain,
  },
  actions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  action: { paddingHorizontal: 12, paddingVertical: 8 },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F2F6', alignItems: 'center', justifyContent: 'center' },
});
