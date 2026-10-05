import { authManager } from '@/core/auth/authManager';
import { WelcomeSheetStateStore, welcomeSheetStateStore } from '@/core/services/welcomeSheetStateStore';

/** One-time welcome sheet gate, keyed to a freshly created account. */
export const welcomeSheetController = {
  async shouldShowForCurrentUser(): Promise<boolean> {
    const key = WelcomeSheetStateStore.userKeyFor(authManager.currentUser);
    if (!key) return false;
    return welcomeSheetStateStore.shouldShowForUser(key);
  },
  async markShownForCurrentUser(): Promise<void> {
    const key = WelcomeSheetStateStore.userKeyFor(authManager.currentUser);
    if (!key) return;
    await welcomeSheetStateStore.markShownForUser(key);
  },
};
