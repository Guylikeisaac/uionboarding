import React, { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';

import { showAppPopover } from '@/shared/ui/overlay';
import { Text } from '@/shared/ui/Text';
import { homeCardShadow } from './homePrimitives';

export interface ReactionOption {
  type: string;
  emoji: string;
  label: string;
  color: string;
}

/** The six reactions the backend accepts, in enum order. */
export const kReactions: ReactionOption[] = [
  { type: 'LIKE', emoji: '👍', label: 'Like', color: '#2D6CDF' },
  { type: 'LOVE', emoji: '❤️', label: 'Love', color: '#E3352A' },
  { type: 'WOW', emoji: '😮', label: 'Wow', color: '#F7B928' },
  { type: 'SAD', emoji: '😢', label: 'Sad', color: '#F7B928' },
  { type: 'ANGRY', emoji: '😠', label: 'Angry', color: '#EC6B2D' },
  { type: 'SMILE', emoji: '😄', label: 'Haha', color: '#F7B928' },
];

export const reactionOf = (type?: string) => (type ? kReactions.find((r) => r.type === type) : undefined);

/** Floating reaction bar centred above [anchor] (window coordinates). */
export function showReactionPicker(anchor: { x: number; y: number; width: number; height: number }, onPick: (type: string) => void) {
  const barWidth = 300;
  const screenWidth = Dimensions.get('window').width;
  let left = anchor.x + anchor.width / 2 - barWidth / 2;
  left = Math.max(12, Math.min(left, screenWidth - barWidth - 12));
  const top = anchor.y - 62;
  void showAppPopover<string>((close) => (
    <View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: barWidth,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
        },
        homeCardShadow,
      ]}
    >
      {kReactions.map((r) => (
        <ReactionButton key={r.type} option={r} onTap={() => close(r.type)} />
      ))}
    </View>
  )).then((type) => {
    if (type) onPick(type);
  });
}

function ReactionButton({ option, onTap }: { option: ReactionOption; onTap: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onTap}
      accessibilityLabel={option.label}
      style={{ paddingHorizontal: 3, paddingVertical: 2, transform: [{ scale: pressed ? 1.25 : 1 }] }}
    >
      <Text style={{ fontSize: 30 }}>{option.emoji}</Text>
    </Pressable>
  );
}
