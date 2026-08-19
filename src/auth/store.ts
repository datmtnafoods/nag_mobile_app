import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../features/auth/types';

const TOKEN_KEY = 'nag.access_token';
const USER_KEY = 'nag.user';
const PERMS_KEY = 'nag.permissions';

type AuthState = {
  token: string | null;
  user: User | null;
  permissions: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: { token: string; user: User; permissions: string[] }) => Promise<void>;
  clearSession: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  canAny: (perms: string[]) => boolean;
  canAll: (perms: string[]) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  permissions: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [token, userRaw, permsRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(PERMS_KEY),
      ]);
      set({
        token: token ?? null,
        user: userRaw ? (JSON.parse(userRaw) as User) : null,
        permissions: permsRaw ? (JSON.parse(permsRaw) as string[]) : [],
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  setSession: async ({ token, user, permissions }) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
      SecureStore.setItemAsync(PERMS_KEY, JSON.stringify(permissions)),
    ]);
    set({ token, user, permissions });
  },
  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(PERMS_KEY),
    ]);
    set({ token: null, user: null, permissions: [] });
  },
  hasPerm: (perm) => {
    const perms = get().permissions;
    return perms.includes('*') || perms.includes(perm);
  },
  canAny: (perms) => {
    const state = get().permissions;
    if (state.includes('*')) return true;
    return perms.some((p) => state.includes(p));
  },
  canAll: (perms) => {
    const state = get().permissions;
    if (state.includes('*')) return true;
    return perms.every((p) => state.includes(p));
  },
}));

export function useIsAuthenticated() {
  return useAuthStore((s) => Boolean(s.token && s.user));
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useHasPerm(perm: string) {
  return useAuthStore((s) => s.permissions.includes('*') || s.permissions.includes(perm));
}

export function useCanAny(perms: string[]) {
  return useAuthStore((s) => {
    if (s.permissions.includes('*')) return true;
    return perms.some((p) => s.permissions.includes(p));
  });
}
