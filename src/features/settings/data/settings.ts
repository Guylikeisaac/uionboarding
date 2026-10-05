import * as Application from 'expo-application';
import { useMemo } from 'react';
import { create } from 'zustand';

import { useAuth } from '@/core/auth/authManager';
import { sanitizeAvatarUrl } from '@/core/helpers/avatarUrl';
import { RouteNames } from '@/core/router/routeNames';
import type { IconName } from '@/shared/ui/Icon';

export interface SettingsProfile {
  name: string;
  headline: string;
  avatarUrl: string;
}

export type SettingsRowType = 'navigation' | 'toggle';

export interface SettingsRow {
  id: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  type: SettingsRowType;
  initialToggle: boolean;
  destructive: boolean;
  route?: string;
}

export interface SettingsSection {
  title?: string;
  rows: SettingsRow[];
}

export interface SettingsContent {
  profile: SettingsProfile;
  sections: SettingsSection[];
}

/** Row ids wired from the Settings screen. */
export const SettingsRowIds = {
  logout: 'logout',
  deleteAccount: 'delete_account',
  email: 'email',
  phone: 'phone',
  darkMode: 'dark_mode',
  privacyPolicy: 'privacy_policy',
  terms: 'terms',
  /** Toggle rows with NO backend — the screen refuses to flip these. */
  unimplementedToggles: new Set(['profile_visibility', 'private_profile', 'two_factor', 'push_notifications', 'email_alerts', 'dark_mode']),
};

export const kSettingsViewProfileRoute = RouteNames.profile;

const row = (p: Partial<SettingsRow> & Pick<SettingsRow, 'id' | 'icon' | 'title'>): SettingsRow => ({
  type: 'navigation',
  initialToggle: false,
  destructive: false,
  ...p,
});

const NA = 'Not available yet';

/** Static structure (mock); identity + contact rows are overlaid live. */
const baseContent: SettingsContent = {
  profile: { name: 'Alex Johnson', headline: 'Product Designer • ABC...', avatarUrl: '' },
  sections: [
    {
      title: 'Account',
      rows: [
        row({ id: 'email', icon: 'mail-outline', title: 'Email & Password', subtitle: 'alex@synctiv.com' }),
        row({ id: 'phone', icon: 'phone-iphone', title: 'Phone Number', subtitle: '+91 98765 43210' }),
        row({ id: 'language', icon: 'language', title: 'Language', subtitle: 'English (US)' }),
      ],
    },
    {
      title: 'Privacy & Safety',
      rows: [
        row({ id: 'profile_visibility', icon: 'visibility', title: 'Profile Visibility', subtitle: NA, type: 'toggle' }),
        row({ id: 'private_profile', icon: 'lock-outline', title: 'Private Profile', subtitle: NA, type: 'toggle' }),
        row({ id: 'two_factor', icon: 'shield', title: 'Two-Factor Authentication', subtitle: NA, type: 'toggle' }),
        row({ id: 'blocked_users', icon: 'description', title: 'Blocked Users', subtitle: '0 blocked' }),
      ],
    },
    {
      title: 'Notifications',
      rows: [
        row({ id: 'push_notifications', icon: 'notifications-none', title: 'Push Notifications', subtitle: NA, type: 'toggle' }),
        row({ id: 'email_alerts', icon: 'mail-outline', title: 'Email Alerts', subtitle: NA, type: 'toggle' }),
      ],
    },
    {
      title: 'Display',
      rows: [
        row({ id: 'dark_mode', icon: 'dark-mode', title: 'Dark Mode', subtitle: NA, type: 'toggle' }),
        row({ id: 'accessibility', icon: 'smartphone', title: 'Accessibility' }),
      ],
    },
    {
      title: 'Data & Privacy',
      rows: [
        row({ id: 'download_data', icon: 'file-download', title: 'Download your data' }),
        row({ id: 'privacy_policy', icon: 'description', title: 'Privacy Policy' }),
        row({ id: 'terms', icon: 'description', title: 'Terms of Service' }),
      ],
    },
    {
      title: 'Support',
      rows: [
        row({ id: 'help_centre', icon: 'help-outline', title: 'Help Centre' }),
        row({ id: 'report_problem', icon: 'description', title: 'Report a Problem' }),
      ],
    },
    {
      rows: [
        row({ id: 'logout', icon: 'logout', title: 'Log Out', destructive: true }),
        row({ id: 'delete_account', icon: 'delete-outline', title: 'Delete Account', subtitle: 'Permanently remove your data', destructive: true }),
      ],
    },
  ],
};

/** Settings content with the real identity + email/phone overlaid. */
export function useSettingsContent(): SettingsContent {
  const user = useAuth((a) => a.currentUser);
  return useMemo(() => {
    if (!user) return baseContent;
    const email = user.email.trim();
    const phone = user.phone.trim();
    return {
      profile: {
        name: user.name.trim() || baseContent.profile.name,
        headline: user.userTitle.trim() || baseContent.profile.headline,
        avatarUrl: sanitizeAvatarUrl(user.profilePic),
      },
      sections: baseContent.sections.map((s) => ({
        title: s.title,
        rows: s.rows.map((r) =>
          r.id === SettingsRowIds.email && email
            ? { ...r, subtitle: email }
            : r.id === SettingsRowIds.phone && phone
              ? { ...r, subtitle: phone }
              : r,
        ),
      })),
    };
  }, [user]);
}

const toggleSeed: Record<string, boolean> = {};
for (const s of baseContent.sections) for (const r of s.rows) if (r.type === 'toggle') toggleSeed[r.id] = r.initialToggle;

/** In-memory toggle state (no backend). */
export const useSettingsToggles = create<{ toggles: Record<string, boolean>; toggle: (id: string) => void }>((set, get) => ({
  toggles: { ...toggleSeed },
  toggle: (id) => set({ toggles: { ...get().toggles, [id]: !(get().toggles[id] ?? false) } }),
}));

/** The real installed version. */
export function appVersionLabel(): string {
  const version = (Application.nativeApplicationVersion ?? '').trim();
  const build = (Application.nativeBuildVersion ?? '').trim();
  if (!version) return 'SyncUp';
  return build ? `SyncUp v${version} • Build ${build}` : `SyncUp v${version}`;
}
