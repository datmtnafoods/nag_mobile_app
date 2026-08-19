import { router } from 'expo-router';
import { Alert } from 'react-native';
import type { AxiosError } from 'axios';
import { configureAuth } from '../api/client';
import { queryClient } from '../api/query';
import { useAuthStore } from './store';
import { useCartStore, CART_STORAGE_KEY } from '../stores/cart';
import { useReceiptDraftStore, RECEIPT_DRAFT_KEY } from '../stores/receipt-draft';
import { useKiemDraftStore, KIEM_DRAFT_KEY } from '../stores/kiem-draft';
import AsyncStorage from '@react-native-async-storage/async-storage';

let unauthorizedInFlight = false;

type ErrorPayload = { code?: string; message?: string; error?: string } | undefined;

function extractCode(err: AxiosError | undefined): string | undefined {
  const data = err?.response?.data as ErrorPayload;
  return data?.code;
}

export function wireApiAuth() {
  configureAuth({
    getToken: () => useAuthStore.getState().token,
    onUnauthorized: (err) => {
      if (unauthorizedInFlight) return;
      unauthorizedInFlight = true;
      const code = extractCode(err);
      const wasLoggedIn = Boolean(useAuthStore.getState().token);
      void (async () => {
        try {
          await useAuthStore.getState().clearSession();
          useCartStore.getState().reset();
          useReceiptDraftStore.getState().reset();
          useKiemDraftStore.getState().reset();
          await Promise.all([
            AsyncStorage.removeItem(CART_STORAGE_KEY),
            AsyncStorage.removeItem(RECEIPT_DRAFT_KEY),
            AsyncStorage.removeItem(KIEM_DRAFT_KEY),
          ]);
          queryClient.clear();
          if (wasLoggedIn && code === 'token_expired') {
            Alert.alert(
              'Phiên đăng nhập hết hạn',
              'Vui lòng đăng nhập lại để tiếp tục.',
            );
          }
          router.replace('/(auth)/login' as never);
        } finally {
          unauthorizedInFlight = false;
        }
      })();
    },
  });
}
