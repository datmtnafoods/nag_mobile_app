import { useCallback } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

/**
 * Hook trả về hàm đóng: nếu có history thì router.back(), không thì router.replace(fallback).
 */
export function useCloseHandler(fallbackHref: string = '/') {
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref as never);
  }, [fallbackHref]);
}

type Props = {
  /** Route để redirect khi không có history. Mặc định '/'. */
  fallbackHref?: string;
  /** Ghi đè handler mặc định (VD force replace về home ngay cả khi có history). */
  onPress?: () => void;
};

export function HeaderCloseButton({ fallbackHref, onPress }: Props) {
  const defaultClose = useCloseHandler(fallbackHref);
  const handler = onPress ?? defaultClose;
  return (
    <Pressable
      onPress={handler}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Đóng"
      style={{ paddingHorizontal: 4 }}
    >
      <Ionicons name="close" size={26} color="#111827" />
    </Pressable>
  );
}
