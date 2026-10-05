import React from 'react';
import { Keyboard, Pressable, type StyleProp, type ViewStyle } from 'react-native';

/** Tapping any empty area of the screen dismisses the software keyboard. */
export function KeyboardDismissible({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable style={[{ flex: 1 }, style]} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}
