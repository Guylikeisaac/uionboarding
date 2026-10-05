import { create } from 'zustand';

import { prefs } from '@/core/storage/storage';

/**
 * The voice onboarding speaks in, picked right after email verification.
 *   • genz — slang, emoji, gradient accents.
 *   • pro  — plain, professional copy.
 * Presentation only: nothing here is sent to the backend.
 */
export type Vibe = 'genz' | 'pro';

const kVibeKey = 'onboarding_vibe';

interface VibeState {
  /** null until the user picks (or before the stored value loads). */
  vibe: Vibe | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setVibe: (vibe: Vibe) => void;
}

export const useVibeStore = create<VibeState>((set, get) => ({
  vibe: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    let stored: string | null = null;
    try {
      stored = await prefs.getString(kVibeKey);
    } catch {
      // unreadable → treat as unpicked
    }
    // A pick made while loading wins over the stored value.
    set((s) => ({ hydrated: true, vibe: s.vibe ?? (stored === 'genz' || stored === 'pro' ? stored : null) }));
  },
  setVibe: (vibe) => {
    set({ vibe });
    void prefs.setString(kVibeKey, vibe).catch(() => {});
  },
}));

void useVibeStore.getState().hydrate();

/** The active vibe; unpicked falls back to the professional voice. */
export const useVibe = (): Vibe => useVibeStore((s) => s.vibe) ?? 'pro';
export const currentVibe = (): Vibe => useVibeStore.getState().vibe ?? 'pro';
export const useIsGenz = () => useVibe() === 'genz';

/** Gen Z accent gradient (used only in the Gen Z experience). */
export const genzGradient = ['#A855F7', '#EC4899', '#FB923C'] as const;
