import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View } from 'react-native';

import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { Text } from './Text';

const palette = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Shared user avatar that prefers the real photo and otherwise falls back to
 * a colored initials circle.
 */
export function AppUserAvatar({
  name,
  avatarUrl = '',
  size = 40,
  borderColor,
  borderWidth = 0,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
}) {
  const [failed, setFailed] = useState(false);
  const safeUrl = sanitizeAvatarUrl(avatarUrl);
  const color = palette[hashString(name) % palette.length];
  const inner = Math.max(0, Math.min(size, size - borderWidth * 2));

  const avatar =
    safeUrl && !failed ? (
      <Image
        source={{ uri: safeUrl }}
        style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color }}
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    ) : (
      <View
        style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: inner * 0.36 }}>{initialsOf(name)}</Text>
      </View>
    );

  if (borderWidth <= 0 || !borderColor) return avatar;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {avatar}
    </View>
  );
}
