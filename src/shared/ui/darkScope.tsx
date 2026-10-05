import React, { createContext, useContext, useEffect } from 'react';
import { create } from 'zustand';

/**
 * Dark scope: screens wrapped in <DarkScope> (onboarding + signup) render on a
 * black canvas. Inside it, Text/TextInput remap the app's dark text tokens to
 * light ones, and shared fields switch to dark surfaces — so existing step
 * code needs no per-colour edits.
 */
const DarkContext = createContext(false);

/** Live count of mounted dark scopes — overlays opened from one go dark too. */
export const useDarkUi = create<{ depth: number; enter: () => void; leave: () => void }>((set, get) => ({
  depth: 0,
  enter: () => set({ depth: get().depth + 1 }),
  leave: () => set({ depth: Math.max(0, get().depth - 1) }),
}));

export function DarkScope({ children, track = true }: { children: React.ReactNode; track?: boolean }) {
  useEffect(() => {
    if (!track) return;
    useDarkUi.getState().enter();
    return () => useDarkUi.getState().leave();
  }, [track]);
  return <DarkContext.Provider value>{children}</DarkContext.Provider>;
}

export const useDark = () => useContext(DarkContext);

/** Dark-surface tokens used by shared fields inside a dark scope. */
export const DarkUi = {
  bg: '#000000',
  // Translucent "glass" surfaces (they sit over the ambient backdrop).
  field: 'rgba(255,255,255,0.06)',
  fieldHi: 'rgba(30,30,30,0.96)',
  border: 'rgba(255,255,255,0.14)',
  borderFocus: '#FFFFFF',
  text: '#FFFFFF',
  textSoft: '#A1A1A1',
  textFaint: '#626262',
  placeholder: '#5E5E5E',
};

// The app's light-theme text colours → their dark-canvas counterparts.
// Pure black (#000000 / #0A0A0A) is deliberately NOT mapped: it's the label
// colour on white pills and the light card.
const textMap: Record<string, string> = {
  '#111111': '#FFFFFF', // textPrimary
  '#292929': '#FFFFFF', // textSecondary
  '#282248': '#FFFFFF', // textInverted
  '#1C1F2A': '#FFFFFF',
  '#3F4144': '#E5E5E5',
  '#374151': '#E5E5E5',
  '#696969': '#A1A1A1', // textTertiary
  '#7E7E8C': '#A1A1A1', // textMuted
  '#757575': '#A1A1A1', // authSupportText
  '#6B7280': '#A1A1A1',
  '#9E9E9E': '#7A7A7A', // authLabelMuted
  '#BBBBBB': '#5E5E5E', // textDisabled
};

export function darkText(color: unknown): unknown {
  if (typeof color !== 'string') return color;
  return textMap[color.toUpperCase()] ?? color;
}
