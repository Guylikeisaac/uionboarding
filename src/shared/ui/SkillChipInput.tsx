import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { textInverted, textMuted } from '@/core/theme/colors';
import { useFieldBox } from './AppTextField';
import { InputChipTag } from './InputChipTag';
import { Text, TextInput } from './Text';

/**
 * Tag-style multi-select input. Typing a comma or submitting adds a chip, up
 * to [maxSkills]. Chips render **below** the input.
 */
export function SkillChipInput({
  skills,
  onChanged,
  maxSkills = 5,
  hintLabel,
  helperText,
}: {
  skills: string[];
  onChanged: (v: string[]) => void;
  maxSkills?: number;
  hintLabel?: string;
  helperText?: string;
}) {
  const fieldBox = useFieldBox();
  const [text, setText] = useState('');
  const isFull = skills.length >= maxSkills;
  const countInHint = hintLabel != null;
  const hint = countInHint ? `${hintLabel} (${skills.length}/${maxSkills})` : 'Type a skill and press enter';

  const add = (raw: string) => {
    const skill = raw.replace(/,/g, '').trim();
    setText('');
    if (!skill) return;
    const already = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (skills.length >= maxSkills || already) return;
    onChanged([...skills, skill]);
  };

  return (
    <View>
      <View style={[fieldBox, { opacity: isFull ? 0.6 : 1 }]}>
        <TextInput
          value={text}
          editable={!isFull}
          placeholder={hint}
          returnKeyType="done"
          blurOnSubmit={false}
          onChangeText={(v) => (v.includes(',') ? add(v) : setText(v))}
          onSubmitEditing={() => add(text)}
          style={styles.input}
        />
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      {skills.length > 0 ? (
        <View style={styles.chips}>
          {skills.map((s) => (
            <InputChipTag key={s} label={s} onRemove={() => onChanged(skills.filter((x) => x !== s))} />
          ))}
        </View>
      ) : null}
      {!countInHint ? (
        <Text style={styles.counter}>
          {skills.length}/{maxSkills} skills
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: textInverted },
  helper: { marginTop: 8, fontSize: 11, color: textMuted, lineHeight: 15.4 },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { marginTop: 6, alignSelf: 'flex-end', fontSize: 12, color: textMuted },
});
