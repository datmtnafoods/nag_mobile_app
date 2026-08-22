import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsOnline } from '../hooks/useIsOnline';

/**
 * Bọc toàn app: khi offline, chèn dải nhắc Ở TRÊN nội dung (CHIẾM CHỖ THẬT, đẩy
 * cả header native xuống) — KHÔNG dùng overlay tuyệt đối vì overlay đè lên header
 * ("Chi tiết thửa" …).
 *
 * Dải tự nhuộm luôn vùng status bar (`paddingTop: insets.top`). Sau đó ép
 * `SafeAreaInsetsContext.top = 0` cho subtree: dải đã "ăn" trọn top inset nên
 * header native / màn con không được chừa status bar lần nữa (tránh khoảng trắng
 * đôi). `SafeAreaView` v5 là native frame-aware nên tự co top về ~0 khi bị đẩy
 * xuống — nhất quán. Online → passthrough, không chi phí.
 */
export function OfflineTopBanner({ children }: { children: ReactNode }) {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();

  if (online) return <>{children}</>;

  return (
    <View style={{ flex: 1 }}>
      <View className="bg-amber-500" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-center px-3 py-1">
          <Ionicons name="cloud-offline-outline" size={14} color="#78350f" />
          <Text className="text-small text-amber-950 ml-1.5 font-semibold">
            Đang offline — một số dữ liệu có thể chưa mới
          </Text>
        </View>
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
