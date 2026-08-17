import { configureAuth } from '../api/client';
import { useAuthStore } from './store';

export function wireApiAuth() {
  configureAuth({
    getToken: () => useAuthStore.getState().token,
    onUnauthorized: () => {
      void useAuthStore.getState().clearSession();
    },
  });
}
