import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authManager, useAuth } from '@/core/auth/authManager';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { pushForResult } from '@/core/router/nav';
import { RouteNames } from '@/core/router/routeNames';
import {
  accentAmber,
  accentBlueLight,
  accentGreen,
  accentGreenLight,
  accentPurpleLight,
  bgLight,
  bgMain,
  textMuted,
  textPrimary,
  textTertiary,
  themeColor,
} from '@/core/theme/colors';
import { NetworkKeys } from '@/features/network/providers/networkProviders';
import { invalidateMyProfile, useMyProfile } from '@/features/profile/providers/profileProviders';
import { invalidateProfileResume } from '@/features/resume/providers/profileResume';
import { queryClient } from '@/core/query/queryClient';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { showAppBottomSheet } from '@/shared/ui/overlay';
import { Text } from '@/shared/ui/Text';
import {
  invalidateHasCreatedPost,
  useWelcomeProgress,
  welcomeCompletedCount,
  welcomeMilestones,
  welcomeNextIncomplete,
  type WelcomeMilestone,
} from '../providers/welcomeProgress';

const milestoneRoute: Record<WelcomeMilestone, string> = {
  profileBasics: RouteNames.profileEdit,
  resume: RouteNames.resumeUpload,
  firstPost: RouteNames.postComposer,
  connections: RouteNames.connectPeople,
};

/** Re-fetches every milestone source after a task flow returns. */
async function refreshAfterFlow() {
  await authManager.refreshCurrentUser().catch(() => {});
  void invalidateProfileResume();
  void invalidateHasCreatedPost();
  void queryClient.invalidateQueries({ queryKey: NetworkKeys.accepted });
  void queryClient.invalidateQueries({ queryKey: NetworkKeys.sentCount });
  await invalidateMyProfile();
}

/**
 * Presents the one-time welcome sheet. Overlays render in a Modal above the
 * navigator, so a row's task screen is opened with the sheet closed and the
 * sheet is re-presented when the user comes back — the same "pop back to the
 * checklist" behaviour as Flutter's root-navigator push above the sheet.
 */
export async function showWelcomeSheet(): Promise<void> {
  for (;;) {
    const picked = await showAppBottomSheet<WelcomeMilestone>((close) => <WelcomeSheet onPick={close} onClose={() => close()} />, {
      showHandle: false,
      sheetStyle: { backgroundColor: 'transparent', padding: 0, paddingBottom: 0 },
      maxHeightFraction: 0.92,
    });
    if (!picked) return;
    await pushForResult(milestoneRoute[picked]);
    await refreshAfterFlow();
  }
}

interface Row {
  milestone: WelcomeMilestone;
  icon: IconName;
  iconBackground: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

const rows: Row[] = [
  { milestone: 'profileBasics', icon: 'person-outline', iconBackground: accentPurpleLight, iconColor: themeColor, title: 'Complete your profile', subtitle: 'Add photo, bio & headline to stand out' },
  { milestone: 'resume', icon: 'description', iconBackground: '#FFF3E0', iconColor: accentAmber, title: 'Upload your resume', subtitle: 'Get discovered by top companies' },
  { milestone: 'firstPost', icon: 'edit', iconBackground: accentBlueLight, iconColor: themeColor, title: 'Write your first post', subtitle: 'Share insights with your network' },
  { milestone: 'connections', icon: 'people-outline', iconBackground: accentGreenLight, iconColor: accentGreen, title: 'Connect with people', subtitle: 'Build your professional network' },
];

function WelcomeSheet({ onPick, onClose }: { onPick: (m: WelcomeMilestone) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const profile = useMyProfile().data;
  const user = useAuth((a) => a.currentUser);
  const displayName = (profile?.name ?? user?.name ?? '').trim();
  const firstName = displayName.split(' ')[0] ?? '';
  const greeting = firstName ? `${firstName}, let's build your profile` : "Let's build your profile";
  const avatarUrl = sanitizeAvatarUrl(profile?.profilePic ? profile.profilePic : user?.profilePic);

  const progress = useWelcomeProgress();
  const next = welcomeNextIncomplete(progress);
  const allDone = next == null;

  return (
    <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: bgLight, flexShrink: 1 }}>
      <LinearGradient colors={['#2D1B69', '#4C1D95', '#5052FF']} locations={[0.0367, 0.4073, 0.9633]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                backgroundColor: 'rgba(255,255,255,0.15)',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Icon name="person" color="#FFFFFF" size={30} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Welcome aboard!</Text>
              <Text style={{ marginTop: 6, color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 26.4 }}>{greeting}</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: 'absolute', top: 12, right: 14, padding: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name="close" color="#FFFFFF" size={18} />
        </Pressable>
      </LinearGradient>

      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22 }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 14 }}>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, color: textMuted }}>COMPLETE THESE STEPS</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: textMuted }}>
            {welcomeCompletedCount(progress)} of {welcomeMilestones.length} done
          </Text>
        </View>
        {rows.map((r) => (
          <ActionCard key={r.milestone} row={r} done={progress[r.milestone] === true} onTap={() => onPick(r.milestone)} />
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 16 + insets.bottom }}>
        <Pressable
          onPress={() => (allDone ? onClose() : onPick(next))}
          style={({ pressed }) => ({ height: 54, borderRadius: 14, backgroundColor: themeColor, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{allDone ? "You're all set — Done" : "Let's Get Started"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActionCard({ row, done, onTap }: { row: Row; done: boolean; onTap: () => void }) {
  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => ({
        marginBottom: 14,
        backgroundColor: pressed ? '#F7F7FB' : bgMain,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#1A1A40',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: row.iconBackground, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={row.icon} color={row.iconColor} size={24} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: done ? textMuted : textPrimary }}>{row.title}</Text>
        <Text style={{ marginTop: 3, fontSize: 13.5, lineHeight: 17.5, color: done ? accentGreen : textTertiary, fontWeight: done ? '600' : '400' }}>
          {done ? 'Completed' : row.subtitle}
        </Text>
      </View>
      <Icon name={done ? 'check-circle' : 'chevron-right'} color={done ? accentGreen : textMuted} size={22} style={{ marginLeft: 8 }} />
    </Pressable>
  );
}
