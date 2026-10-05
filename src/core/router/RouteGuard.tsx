import { usePathname, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';

import { authManager, useAuth } from '../auth/authManager';
import { dismissAllOverlays } from '@/shared/ui/overlay';
import { go } from './nav';
import { computeRedirect } from './redirect';

/**
 * Re-evaluates the redirect ladder whenever the location or the auth state
 * changes (go_router `refreshListenable: auth`).
 */
export function RouteGuard() {
  const pathname = usePathname();
  const navState = useRootNavigationState();
  const version = useAuth((a) => a.snapshotVersion);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!navState?.key) return;
    const target = computeRedirect(pathname, authManager);
    if (target == null || target === pathname) {
      last.current = null;
      return;
    }
    // Avoid re-issuing the same redirect while the navigation settles.
    const sig = `${pathname}->${target}`;
    if (last.current === sig) return;
    last.current = sig;
    if (__DEV__) console.log(`🔐 Router redirect: ${pathname} -> ${target}`);
    dismissAllOverlays();
    go(target);
  }, [pathname, version, navState?.key]);

  return null;
}
