import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { themeColor } from '@/core/theme/colors';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';
import { AppUserAvatar } from '@/shared/ui/UserAvatar';

export const NetworkColors = {
  page: '#F4F6FA',
  header: '#FFFFFF',
  card: '#FFFFFF',
  control: '#EFF1F6',
  divider: '#ECECEF',
  chipBorder: '#E2E5EA',
  ink: '#1C1F2A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  unread: '#22C55E',
  accentTint: '#EAEAFF',
};

export const networkCardShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

/** Opens a person's public profile by handle (honest notice when there's none). */
export function openPersonProfile(handle: string) {
  const h = handle.trim();
  if (!h) {
    showSnackbar("This profile isn't available yet.", { isError: true });
    return;
  }
  push(RouteNames.profilePublic, { userId: h });
}

export function NetworkAvatar({ name, imageUrl = '', size = 44 }: { name: string; imageUrl?: string; size?: number }) {
  return <AppUserAvatar name={name} avatarUrl={imageUrl} size={size} />;
}

/** Stadium button: outlined brand (default) or filled. */
export function NetworkPillButton({
  label,
  onTap,
  filled = false,
  showCheck = false,
  expand = false,
  height = 38,
  horizontalPadding = 18,
}: {
  label: string;
  onTap: () => void;
  filled?: boolean;
  showCheck?: boolean;
  expand?: boolean;
  height?: number;
  horizontalPadding?: number;
}) {
  const fg = filled ? '#FFFFFF' : themeColor;
  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => ({
        height,
        paddingHorizontal: horizontalPadding,
        borderRadius: height / 2,
        backgroundColor: filled ? themeColor : '#FFFFFF',
        borderWidth: filled ? 0 : 1,
        borderColor: themeColor,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: expand ? 'stretch' : 'auto',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {showCheck ? <Icon name="check" size={16} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function NetworkIconButton({ icon, onTap }: { icon: IconName; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: NetworkColors.chipBorder, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={NetworkColors.textSecondary} />
    </Pressable>
  );
}

export function NetworkCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ padding: 16, backgroundColor: NetworkColors.card, borderRadius: 16 }, networkCardShadow, style]}>{children}</View>;
}
