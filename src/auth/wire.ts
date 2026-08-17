import { router } from 'expo-router';
import { configureAuth } from '../api/client';
import { queryClient } from '../api/query';
import { useAuthStore } from './store';
import { useCartStore, CART_STORAGE_KEY } from '../stores/cart';
import AsyncStorage from '@react-native-async-storage/async-storage';

let unauthorizedInFlight = false;

export function wireApiAuth() {
  configureAuth({
    getToken: () => useAuthStore.getState().token,
    onUnauthorized: () => {
      if (unauthorizedInFlight) return;
      unauthorizedInFlight = true;
      void (async () => {
        try {
          await useAuthStore.getState().clearSession();
          useCartStore.getState().reset();
          await AsyncStorage.removeItem(CART_STORAGE_KEY);
          queryClient.clear();
          router.replace('/(auth)/login' as never);
        } finally {
          unauthorizedInFlight = false;
        }
      })();
    },
  });
}
