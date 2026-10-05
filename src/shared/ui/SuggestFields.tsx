import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';

import { stroke, textInverted, textMuted } from '@/core/theme/colors';
import { useFieldBox } from './AppTextField';
import { DarkUi, useDark } from './darkScope';
import { InputChipTag } from './InputChipTag';
import { useScrollIntoView } from './stepScroll';
import { Text, TextInput } from './Text';

/** Debounced async search with stale-response protection. */
function useSuggestSearch(onSearch: (q: string) => Promise<string[]>, filter?: (r: string[]) => string[]) {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const reset = () => {
    setResults([]);
    setLoading(false);
    setSearched(false);
  };

  const onText = (raw: string) => {
    const query = raw.trim();
    if (debounce.current) clearTimeout(debounce.current);
    searchId.current++;
    if (!query) {
      reset();
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      const id = searchId.current;
      try {
        const r = await onSearch(query);
        if (id !== searchId.current) return;
        setResults(filter ? filter(r) : r);
      } catch {
        if (id !== searchId.current) return;
        setResults([]);
      }
      setLoading(false);
      setSearched(true);
    }, 350);
  };

  return { results, loading, searched, onText, reset };
}

function SuggestPanel({
  loading,
  results,
  onPick,
  emptyLabel,
}: {
  loading: boolean;
  results: string[];
  onPick: (v: string) => void;
  emptyLabel: string;
}) {
  const dark = useDark();
  return (
    <View style={[styles.panel, dark && { backgroundColor: DarkUi.fieldHi, borderColor: DarkUi.border, shadowOpacity: 0 }]}>
      {loading ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator size="small" />
        </View>
      ) : results.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="always" nestedScrollEnabled>
          {results.map((r) => (
            <Pressable key={r} onPress={() => onPick(r)} style={styles.row}>
              <Text style={styles.rowText}>{r}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Type-to-search over a **string** catalog, with free text still allowed.
 * Selections render as chips below the input.
 */
export function SuggestChipInput({
  values,
  onChanged,
  onSearch,
  max,
  label,
  hint = 'Search and select...',
  helperText,
}: {
  values: string[];
  onChanged: (v: string[]) => void;
  onSearch: (q: string) => Promise<string[]>;
  max: number;
  label?: string;
  hint?: string;
  helperText?: string;
}) {
  const fieldBox = useFieldBox();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  // Scrolls this field to the top of the step when focused (room for suggestions).
  const anchorRef = useRef<View>(null);
  const scrollIntoView = useScrollIntoView();
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  const s = useSuggestSearch(onSearch, (r) => {
    const taken = new Set(valuesRef.current.map((v) => v.toLowerCase()));
    return r.filter((x) => !taken.has(x.toLowerCase()));
  });
  const canAddMore = values.length < max;

  const add = (raw: string) => {
    const value = raw.trim();
    setText('');
    if (!value || !canAddMore) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChanged([...values, value]);
    s.reset();
    if (values.length + 1 >= max) inputRef.current?.blur();
  };

  const showPanel = focused && text.trim().length > 0 && (s.loading || s.searched || s.results.length > 0);
  return (
    <View ref={anchorRef} collapsable={false}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {canAddMore ? (
        <>
          <View style={fieldBox}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={(t) => {
                setText(t);
                s.onText(t);
              }}
              onSubmitEditing={() => add(text)}
              blurOnSubmit={false}
              returnKeyType="done"
              autoCapitalize="words"
              placeholder={`${hint} (${values.length}/${max})`}
              onFocus={() => {
                setFocused(true);
                scrollIntoView?.(anchorRef.current);
              }}
              onBlur={() => setFocused(false)}
              style={styles.input}
            />
          </View>
          {showPanel ? (
            <SuggestPanel
              loading={s.loading}
              results={s.results}
              onPick={add}
              emptyLabel="No matches — press enter to use what you typed"
            />
          ) : null}
        </>
      ) : null}
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      {values.length > 0 ? (
        <View style={styles.chips}>
          {values.map((v) => (
            <InputChipTag key={v} label={v} onRemove={() => onChanged(values.filter((x) => x !== v))} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Single-value variant: one suggested-or-typed string, committed on blur. */
export function SuggestSingleField({
  value,
  onChanged,
  onSearch,
  label,
  hint = 'Search and select...',
}: {
  value?: string | null;
  onChanged: (v: string | undefined) => void;
  onSearch: (q: string) => Promise<string[]>;
  label?: string;
  hint?: string;
}) {
  const fieldBox = useFieldBox();
  const [text, setText] = useState(value ?? '');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);
  // Scrolls this field to the top of the step when focused (room for suggestions).
  const anchorRef = useRef<View>(null);
  const scrollIntoView = useScrollIntoView();
  const s = useSuggestSearch(onSearch);

  const pick = (v: string) => {
    setText(v);
    onChanged(v || undefined);
    s.reset();
    inputRef.current?.blur();
  };

  const showPanel = focused && text.trim().length > 0 && (s.loading || s.searched || s.results.length > 0);
  return (
    <View ref={anchorRef} collapsable={false}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={fieldBox}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (!t.trim()) onChanged(undefined);
            s.onText(t);
          }}
          onSubmitEditing={() => pick(text.trim())}
          autoCapitalize="words"
          placeholder={hint}
          onFocus={() => {
                setFocused(true);
                scrollIntoView?.(anchorRef.current);
              }}
          onBlur={() => {
            setFocused(false);
            const typed = text.trim();
            onChanged(typed ? typed : undefined);
          }}
          style={styles.input}
        />
      </View>
      {showPanel ? (
        <SuggestPanel
          loading={s.loading}
          results={s.results}
          onPick={pick}
          emptyLabel="No matches — we'll use what you typed"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: textInverted, marginBottom: 6 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: textInverted },
  helper: { marginTop: 8, fontSize: 12, color: textMuted, lineHeight: 16.8 },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stroke,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  empty: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 13, color: textMuted },
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { fontSize: 14, color: textInverted },
});
