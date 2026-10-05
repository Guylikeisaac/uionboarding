import React, { useEffect, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authManager, useAuth } from '@/core/auth/authManager';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { compactCount } from '@/core/helpers/formatCount';
import { go, push } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import { themeColor } from '@/core/theme/colors';
import { useSignupFlow } from '@/features/auth/providers/signupFlowStore';
import { useAadhaarStatus } from '@/features/onboarding/aadhaar/aadhaar';
import { useStoredProfileStrength } from '@/features/onboarding/genz/profileStrength';
import { VerificationRing } from '@/features/onboarding/genz/VerificationBadge';
import { useProfileDrawer } from '@/features/home/providers/drawerStore';
import { showConfirmDialog } from '@/shared/ui/dialogs';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { showSnackbar } from '@/shared/ui/snackbar';
import { Text } from '@/shared/ui/Text';
import { AppUserAvatar } from '@/shared/ui/UserAvatar';
import { profileMenuContent, type ManagedPage, type ProfileMenuItem } from '../data/profileMenu';
import { useProfileSummary } from '../providers/profileMenuProviders';

export const ProfileMenuColors = {
  tile: '#F1F3F7',
  divider: '#ECECEF',
  ink: '#111111',
  muted: '#9AA0A6',
  stat: '#6B7280',
};

const close = () => useProfileDrawer.getState().hide();

function stub(label: string) {
  close();
  showSnackbar(`${label} isn't implemented yet.`);
}

function goRoute(route: string) {
  close();
  push(route);
}

async function confirmLogout() {
  const ok = await showConfirmDialog({
    title: 'Log out?',
    message: 'Are you sure you want to log out?',
    confirmLabel: 'Log out',
    destructive: true,
  });
  if (!ok) return;
  close();
  useSignupFlow.getState().reset();
  await authManager.logout();
  go(RouteNames.loggedOutEntry);
}

function handleTap(item: ProfileMenuItem) {
  if (item.id === 'logout') return void confirmLogout();
  if (item.route) goRoute(item.route);
  else stub(item.label);
}

/**
 * Left slide-in profile drawer (Flutter `Drawer` on the shell Scaffold):
 * scrim tap / back closes it.
 */
export function ProfileDrawerHost() {
  const open = useProfileDrawer((s) => s.open);
  const { width: screenW } = useWindowDimensions();
  const width = screenW * 0.86;
  const anim = useState(() => new Animated.Value(0))[0];
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 250 : 200,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, anim]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [open]);

  if (!mounted) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.54)', opacity: anim }]} />
      </Pressable>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }],
        }}
      >
        <DrawerContent />
      </Animated.View>
    </View>
  );
}

function DrawerContent() {
  const insets = useSafeAreaInsets();
  const content = profileMenuContent;
  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
      <IdentityBlock />
      <Divider style={{ marginTop: 18, marginBottom: 10 }} />
      {content.accountItems.map((item) => (
        <MenuRow key={item.id} item={item} onTap={() => handleTap(item)} />
      ))}
      <Divider style={{ marginTop: 10, marginBottom: 14 }} />
      <Text style={{ fontSize: 13, fontWeight: '500', color: ProfileMenuColors.muted, marginBottom: 6 }}>{content.pagesSectionLabel}</Text>
      {content.pages.map((page) => (
        <PageRow key={page.id} page={page} onTap={() => (page.route ? goRoute(page.route) : stub(page.name))} />
      ))}
      <Pressable onPress={() => stub('Add Page')} style={styles.row}>
        <View style={[styles.tile, { borderRadius: 20 }]}>
          <Icon name="add" size={22} color="#1F2430" />
        </View>
        <Text style={styles.pageLabel}>Add Page</Text>
      </Pressable>
      <Divider style={{ marginVertical: 10 }} />
      {content.footerItems.map((item) => (
        <MenuRow key={item.id} item={item} onTap={() => handleTap(item)} />
      ))}
    </ScrollView>
  );
}

function IdentityBlock() {
  const summary = useProfileSummary().data;
  const user = useAuth((a) => a.currentUser);
  const name = user?.name ?? '';
  const handle = user?.userId ? `@${user.userId}` : '';
  const avatarUrl = sanitizeAvatarUrl(user?.profilePic);
  const label = (n?: number | null) => (n == null ? '—' : compactCount(n));
  return (
    <View>
      <Pressable onPress={close} accessibilityLabel="Close" style={[styles.circle, { alignSelf: 'flex-end' }]}>
        <Icon name="close" size={18} color="#1F2430" />
      </Pressable>
      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
        <AppUserAvatar name={name} avatarUrl={avatarUrl} size={60} borderColor={themeColor} borderWidth={2} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => stub('Profile QR code')} style={[styles.tile, { borderRadius: 12 }]}>
          <Icon name="qr-code" size={22} color={themeColor} />
        </Pressable>
      </View>
      <Text style={{ marginTop: 14, fontSize: 20, fontWeight: '700', color: ProfileMenuColors.ink }}>{name || ' '}</Text>
      {handle ? <Text style={{ marginTop: 2, fontSize: 13.5, fontWeight: '500', color: themeColor }}>{handle}</Text> : null}
      <VerificationChip />
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <Stat value={label(summary?.followers)} label="Followers" />
        <View style={{ width: 1, height: 22, marginHorizontal: 16, backgroundColor: ProfileMenuColors.divider }} />
        <Stat value={label(summary?.connections)} label="Connections" />
      </View>
    </View>
  );
}

/** Aadhaar-verified chip, or profile strength while unverified. */
function VerificationChip() {
  const aadhaar = useAadhaarStatus().data;
  const strength = useStoredProfileStrength().data;
  if (aadhaar?.verified) {
    return (
      <View style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0A0A0A' }}>
        <Icon name="verified-user" size={15} color="#FFFFFF" />
        <Text style={{ marginLeft: 6, fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>Aadhaar verified</Text>
      </View>
    );
  }
  if (strength == null) return null;
  return (
    <View style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F4F4F4' }}>
      <VerificationRing score={strength} size={28} stroke={3} animate={false} />
      <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: '#0A0A0A' }}>Profile {strength}% complete</Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: themeColor }}>{value}</Text>
      <Text style={{ marginLeft: 6, fontSize: 13, color: ProfileMenuColors.stat }}>{label}</Text>
    </View>
  );
}

function MenuRow({ item, onTap }: { item: ProfileMenuItem; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={[styles.tile, { borderRadius: 12 }]}>
        <Icon name={item.icon as IconName} size={20} color="#1F2430" />
      </View>
      <Text style={{ marginLeft: 14, fontSize: 16, fontWeight: '500', color: ProfileMenuColors.ink }}>{item.label}</Text>
    </Pressable>
  );
}

function PageRow({ page, onTap }: { page: ManagedPage; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={styles.row}>
      <View style={[styles.tile, { borderRadius: 20 }]}>
        <Text style={{ color: themeColor, fontWeight: '800', fontSize: 18 }}>{page.name ? page.name[0].toUpperCase() : '?'}</Text>
      </View>
      <Text style={styles.pageLabel}>{page.name}</Text>
    </Pressable>
  );
}

function Divider({ style }: { style?: object }) {
  return <View style={[{ height: 1, backgroundColor: ProfileMenuColors.divider }, style]} />;
}

const styles = StyleSheet.create({
  row: { height: 52, flexDirection: 'row', alignItems: 'center' },
  tile: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: ProfileMenuColors.tile },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ProfileMenuColors.tile },
  pageLabel: { marginLeft: 14, fontSize: 16, fontWeight: '600', color: ProfileMenuColors.ink },
});
