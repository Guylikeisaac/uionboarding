import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';

import { stroke, textInverted, textMuted } from '@/core/theme/colors';
import type { LocationResult } from '@/features/onboarding/data/models/locationResult';
import { useFieldBox } from './AppTextField';
import { DarkUi, useDark } from './darkScope';
import { InputChipTag } from './InputChipTag';
import { useScrollIntoView } from './stepScroll';
import { Text, TextInput } from './Text';

const MIN_QUERY = 1;

/**
 * Multi-select for locations: type to search via [onSearch], pick from the
 * suggestion list, selections render as removable chips above the field.
 * Set [maxSelections] to 1 for a single-select variant. Stale responses are
 * discarded via a monotonic search id.
 */
export function CityMultiSelectField({
  selectedLocations,
  onChanged,
  onSearch,
  label,
  hint = 'Search and select cities...',
  maxSelections,
}: {
  selectedLocations: LocationResult[];
  onChanged: (v: LocationResult[]) => void;
  onSearch: (q: string) => Promise<LocationResult[]>;
  label?: string;
  hint?: string;
  maxSelections?: number;
}) {
  const fieldBox = useFieldBox();
  const dark = useDark();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<RNTextInput>(null);
  // Scrolls this field to the top of the step when focused (room for suggestions).
  const anchorRef = useRef<View>(null);
  const scrollIntoView = useScrollIntoView();
  const selectedRef = useRef(selectedLocations);
  useEffect(() => {
    selectedRef.current = selectedLocations;
  }, [selectedLocations]);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const onChange = (raw: string) => {
    setText(raw);
    const query = raw.trim();
    if (debounce.current) clearTimeout(debounce.current);
    searchId.current++;
    if (query.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(() => runSearch(query), 350);
  };

  const runSearch = async (query: string) => {
    const id = searchId.current;
    try {
      const res = await onSearch(query);
      if (id !== searchId.current) return;
      const filtered = res.filter((r) => !selectedRef.current.some((s) => s.id === r.id));
      filtered.sort((a, b) => compareByPrefix(a, b, query));
      setResults(filtered);
    } catch {
      if (id !== searchId.current) return;
      setResults([]);
    }
    setLoading(false);
    setSearched(true);
  };

  const select = (loc: LocationResult) => {
    const next = [...selectedLocations, loc];
    onChanged(next);
    setText('');
    setResults([]);
    setLoading(false);
    setSearched(false);
    if (maxSelections != null && next.length >= maxSelections) inputRef.current?.blur();
  };

  const canAddMore = maxSelections == null || selectedLocations.length < maxSelections;
  const showPanel = focused && text.trim().length >= MIN_QUERY && (loading || searched || results.length > 0);

  return (
    <View ref={anchorRef} collapsable={false}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {selectedLocations.length > 0 ? (
        <View style={styles.chips}>
          {selectedLocations.map((loc) => (
            <InputChipTag
              key={loc.id}
              label={loc.label}
              onRemove={() => onChanged(selectedLocations.filter((l) => l.id !== loc.id))}
            />
          ))}
        </View>
      ) : null}
      {canAddMore ? (
        <>
          <View style={fieldBox}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={onChange}
              placeholder={hint}
              onFocus={() => {
                setFocused(true);
                scrollIntoView?.(anchorRef.current);
              }}
              onBlur={() => setFocused(false)}
              style={styles.input}
              autoCorrect={false}
            />
          </View>
          {showPanel ? (
            <View style={[styles.panel, dark && { backgroundColor: DarkUi.fieldHi, borderColor: DarkUi.border, shadowOpacity: 0 }]}>
              {loading ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" />
                </View>
              ) : results.length === 0 ? (
                <Text style={styles.empty}>No matches found</Text>
              ) : (
                <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="always" nestedScrollEnabled>
                  {results.map((loc) => (
                    <Pressable key={loc.id} onPress={() => select(loc)} style={styles.row}>
                      <Text style={styles.rowText}>{loc.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function compareByPrefix(a: LocationResult, b: LocationResult, query: string): number {
  const ap = hasPrefix(a, query);
  const bp = hasPrefix(b, query);
  if (ap !== bp) return ap ? -1 : 1;
  return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
}

function hasPrefix(l: LocationResult, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const sw = (v: string) => v.trim().toLowerCase().startsWith(q);
  return sw(l.city) || sw(l.label) || sw(l.state) || sw(l.country);
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: textInverted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: textInverted },
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
  empty: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: textMuted },
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { fontSize: 14, color: textInverted },
});
