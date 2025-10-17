import { create } from 'zustand';

interface MatchState {
  gameType: string;
  setGameType: (gameType: string) => void;
}

export const useMatchStore = create<MatchState>(set => ({
  gameType: 'any_option',
  setGameType: (gameType: string) => set({ gameType }),
}));
