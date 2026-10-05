import React, { useEffect, useState } from 'react';
import { Animated, Easing, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/shared/ui/Text';

/** Fades + slides its children in after `index * step` ms (list stagger). */
export function StaggerIn({
  index = 0,
  step = 55,
  delay = 180,
  from = 18,
  style,
  children,
}: {
  index?: number;
  step?: number;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 420,
      delay: delay + index * step,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [a, index, step, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Title that types itself in word by word, each word rising into place. */
export function WordReveal({ text, style, delay = 60, step = 70 }: { text: string; style: StyleProp<TextStyle>; delay?: number; step?: number }) {
  const words = text.split(' ');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {words.map((w, i) => (
        <Word key={`${w}-${i}`} word={w} last={i === words.length - 1} style={style} delay={delay + i * step} />
      ))}
    </View>
  );
}

function Word({ word, last, style, delay }: { word: string; last: boolean; style: StyleProp<TextStyle>; delay: number }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      <Text style={style}>
        {word}
        {last ? '' : ' '}
      </Text>
    </Animated.View>
  );
}
