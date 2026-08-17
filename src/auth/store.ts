import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../api/erp/auth';

const TOKEN_KEY = 'nag.access_token';
const USER_KEY = 'nag.user';

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: { token: string; user: User }) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      set({
        token: token ?? null,
        user: userRaw ? (JSON.parse(userRaw) as User) : null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setSession: async ({ token, user }) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },
  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ token: null, user: null });
  },
}));

export function useIsAuthenticated() {
  return useAuthStore((s) => Boolean(s.token && s.user));
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}
