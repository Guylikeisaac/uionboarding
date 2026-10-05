import { ApiConstants } from '@/core/constants/apiConstants';
import { apiClient } from '@/core/network/authenticatedClient';
import { RouteNames } from '@/core/router/routeNames';
import type { IconName } from '@/shared/ui/Icon';

/** A drawer row; a null route means the destination isn't wired yet (stub). */
export interface ProfileMenuItem {
  id: string;
  label: string;
  icon: IconName;
  route?: string;
}

export interface ManagedPage {
  id: string;
  name: string;
  logoAsset: string;
  route?: string;
}

export interface ProfileMenuContent {
  accountItems: ProfileMenuItem[];
  pagesSectionLabel: string;
  pages: ManagedPage[];
  footerItems: ProfileMenuItem[];
}

/** Static drawer content (identity is overlaid from real sources). */
export const profileMenuContent: ProfileMenuContent = {
  accountItems: [
    { id: 'profile', label: 'Profile', icon: 'person-outline', route: RouteNames.profile },
    { id: 'analytics', label: 'Profile Analytics', icon: 'show-chart' },
    { id: 'saved', label: 'Saved Items', icon: 'bookmark-border', route: RouteNames.savedItems },
    { id: 'settings', label: 'Settings', icon: 'settings', route: RouteNames.settings },
  ],
  pagesSectionLabel: 'Manage Pages',
  pages: [],
  footerItems: [
    { id: 'help', label: 'Help Centre', icon: 'person-outline' },
    { id: 'logout', label: 'Logout', icon: 'logout' },
  ],
};

function intField(body: any, key: string): number | null {
  const v = body?.data?.[key];
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

/** Live connection + follower counts for the signed-in user. */
export const profileSummaryRepository = {
  /** Derived from the accepted list (the count endpoint is unreliable). */
  async connectionCount(): Promise<number | null> {
    try {
      const res = await apiClient.get(ApiConstants.connection(ApiConstants.connectionAccepted), { params: { page: 1, limit: 100 } });
      const list = res.data?.data?.acceptedConnections;
      return Array.isArray(list) ? list.length : null;
    } catch {
      return null;
    }
  },
  async followerCount(userId: string): Promise<number | null> {
    if (!userId) return null;
    try {
      const res = await apiClient.get(ApiConstants.connection(ApiConstants.followFollowerCount), { params: { userId } });
      return intField(res.data, 'followerCount');
    } catch {
      return null;
    }
  },
};
