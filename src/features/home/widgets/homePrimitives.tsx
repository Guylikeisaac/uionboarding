import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { grey, textPrimary, themeColor } from '@/core/theme/colors';
import { AppNetworkImage } from '@/shared/ui/AppNetworkImage';
import { Icon } from '@/shared/ui/Icon';
import { Text } from '@/shared/ui/Text';
import { initialsOf } from '@/shared/ui/UserAvatar';

/** Home-specific surface / semantic tones. */
export const HomeColors = {
  page: '#FFFFFF',
  panel: '#EEF3F7',
  control: '#F1F4F9',
  likeRed: '#E3352A',
  unread: '#22C55E',
  bannerBorder: '#B8C2F5',
  divider: '#ECECEF',
  actionGrey: '#5C5C64',
  logoTile: '#F5F5FF',
};

/** Soft ambient card shadow used by post / people / job cards. */
export const homeCardShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

const avatarPalette = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const paletteColorFor = (name: string) => avatarPalette[hashString(name) % avatarPalette.length];

/** Circular avatar: photo (https URL) else coloured initials. */
export function HomeAvatar({ name, assetPath = '', size = 40 }: { name: string; assetPath?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const color = paletteColorFor(name);
  if (assetPath && !failed) {
    return (
      <Image
        source={assetPath.startsWith('http') ? { uri: assetPath } : assetPath}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.36 }}>{initialsOf(name)}</Text>
    </View>
  );
}

function LogoLetter({ company }: { company: string }) {
  return <Text style={{ color: themeColor, fontWeight: '800', fontSize: 22 }}>{company ? company[0].toUpperCase() : '?'}</Text>;
}

/** Tinted rounded-square logo tile (URL logo, else first letter). */
export function LogoTile({ company, assetPath = '', size = 56 }: { company: string; assetPath?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 13, backgroundColor: HomeColors.logoTile, alignItems: 'center', justifyContent: 'center' }}>
      {assetPath ? (
        <View style={{ width: size - 20, height: size - 20 }}>
          {assetPath.startsWith('http') ? (
            <AppNetworkImage url={assetPath} width="100%" height="100%" fit="contain" error={<LogoLetter company={company} />} style={{ backgroundColor: 'transparent' }} />
          ) : (
            <LogoLetter company={company} />
          )}
        </View>
      ) : (
        <LogoLetter company={company} />
      )}
    </View>
  );
}

/** Placeholder for post media. */
export function MediaPlaceholder({ height = 200 }: { height?: number }) {
  return (
    <LinearGradient
      colors={['#E9EDF3', '#DDE3EC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height, width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="image" size={40} color={grey[500]} />
    </LinearGradient>
  );
}

/** Gray rounded module panel: header row (title + "See all →") above content. */
export function ModulePanel({
  title,
  seeAllLabel,
  onSeeAll,
  children,
}: {
  title: string;
  seeAllLabel: string;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: textPrimary }}>{title}</Text>
        <Pressable onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={8}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: themeColor }}>{seeAllLabel}</Text>
          <Icon name="arrow-forward" size={15} color={themeColor} style={{ marginLeft: 3 }} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 12, marginBottom: 12, paddingVertical: 16, backgroundColor: HomeColors.panel, borderRadius: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
});
