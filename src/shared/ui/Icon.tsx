import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
export type CommunityIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Material icon (Flutter `Icons.*` equivalent; snake_case → kebab-case). */
export function Icon({
  name,
  size = 24,
  color = '#111111',
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}

/** Glyphs Material Icons lacks (brand marks, some outlined variants). */
export function CIcon({
  name,
  size = 24,
  color = '#111111',
  style,
}: {
  name: CommunityIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
