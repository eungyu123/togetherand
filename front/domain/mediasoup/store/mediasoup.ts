import { create } from 'zustand';

interface MediasoupState {
  focusedUserId: string | null;
  setFocusedUserId: (focusedUserId: string | null) => void;
  toggleFocusedUserId: (focusedUserId: string | null) => void;
}

export const useMediasoupStore = create<MediasoupState>((set, get) => ({
  focusedUserId: null,
  setFocusedUserId: (focusedUserId: string | null) => set({ focusedUserId }),
  toggleFocusedUserId: (focusedUserId: string | null) =>
    set({ focusedUserId: focusedUserId === get().focusedUserId ? null : focusedUserId }),
}));
