import { create } from 'zustand';
import { UserType } from '../api/types/user';
import { authApi } from '../api/client/auth';

interface AuthState {
  user: UserType | null;
  isAuthenticated: boolean;
  setUser: (user: UserType) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  clearUserWithOutSignout: () => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  setUser: user => set({ user }),
  setIsAuthenticated: isAuthenticated => set({ isAuthenticated }),
  clearUserWithOutSignout: () => set({ user: null, isAuthenticated: false }),
  clearUser: async () => {
    set({ user: null, isAuthenticated: false });
    await authApi.signout();
  },
}));
