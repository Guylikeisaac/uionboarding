import { prefs } from '../storage/storage';
import type { User } from '@/features/auth/data/authModels';

/**
 * Persists whether the welcome sheet should be shown for a specific account.
 * - `pending`: this account was freshly created in this install and should
 *   see the welcome sheet once onboarding completes.
 * - `seen`: the welcome sheet has already been shown for this account.
 */
export class WelcomeSheetStateStore {
  private static readonly seenPrefix = 'welcome_sheet.seen.';
  private static readonly pendingPrefix = 'welcome_sheet.pending.';
  private static readonly legacySeenKey = 'welcome_sheet_seen_v1';

  static userKeyFor(user: User | null | undefined): string | null {
    if (!user) return null;
    return WelcomeSheetStateStore.normalizeKeyParts(user.userId, user.id, user.email);
  }

  static normalizeKeyParts(userId?: string, id?: string, email?: string): string | null {
    for (const c of [userId?.trim(), id?.trim(), email?.trim().toLowerCase()]) {
      if (c) return c;
    }
    return null;
  }

  async shouldShowForUser(userKey: string): Promise<boolean> {
    const pending = (await prefs.getBool(`${WelcomeSheetStateStore.pendingPrefix}${userKey}`)) ?? false;
    const seen = (await prefs.getBool(`${WelcomeSheetStateStore.seenPrefix}${userKey}`)) ?? false;
    return pending && !seen;
  }

  async markPendingForUser(userKey: string): Promise<void> {
    await prefs.setBool(`${WelcomeSheetStateStore.pendingPrefix}${userKey}`, true);
  }

  async markShownForUser(userKey: string): Promise<void> {
    await prefs.setBool(`${WelcomeSheetStateStore.seenPrefix}${userKey}`, true);
    await prefs.remove(`${WelcomeSheetStateStore.pendingPrefix}${userKey}`);
    await prefs.remove(WelcomeSheetStateStore.legacySeenKey);
  }
}

export const welcomeSheetStateStore = new WelcomeSheetStateStore();
