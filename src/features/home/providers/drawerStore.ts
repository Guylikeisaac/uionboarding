import { create } from 'zustand';

/** Open/closed state of the shell's left profile drawer (Scaffold.openDrawer). */
export const useProfileDrawer = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

export const openProfileDrawer = () => useProfileDrawer.getState().show();
