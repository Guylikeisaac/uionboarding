import React, { createContext, useContext } from 'react';
import type { View } from 'react-native';

/**
 * Lets a field inside an onboarding step ask the step's ScrollView to bring
 * it to the top — so its suggestion list has room above the keyboard.
 */
export const StepScrollContext = createContext<((node: View | null) => void) | null>(null);

export function useScrollIntoView() {
  return useContext(StepScrollContext);
}

export function StepScrollProvider({ value, children }: { value: (node: View | null) => void; children: React.ReactNode }) {
  return <StepScrollContext.Provider value={value}>{children}</StepScrollContext.Provider>;
}
