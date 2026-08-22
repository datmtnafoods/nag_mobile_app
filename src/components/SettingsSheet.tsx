import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from './Button';
import { SectionLabel } from './SectionLabel';
import { RowGroup } from './RowGroup';
import { ListRow } from './ListRow';

import { useKhoPicker } from '../stores/kho-picker';
import { useCartStore, CART_STORAGE_KEY } from '../stores/cart';
import {
  useReceiptDraftStore,
  RECEIPT_DRAFT_KEY,
} from '../stores/receipt-draft';
import { useKiemDraftStore, KIEM_DRAFT_KEY } from '../stores/kiem-draft';
import {
  usePhieuChuyenDraftStore,
  PHIEU_CHUYEN_DRAFT_KEY,
} from '../stores/phieu-chuyen-draft';
import { API_BASE_URL, MOCK_API } from '../api/client';
import { useAuthStore, usePermissions } from '../auth/store';
import { logout } from '../api/erp/auth';
import { MAU, ICON } from '../theme/tokens';

/**
 * Bottom sheet Cài đặt — hub tiện ích + Đăng xuất. Mở từ nút icon 3 gạch (hiện
 * ở góc trên phải Trang chủ, có thể tái dùng ở bất kỳ màn nào).
 *
 * Không tạo route mới → mở/đóng nhẹ, không mất context màn dưới. Tự chứa logic
 * logout để dùng lại giữa các màn mà không phải truyền handler qua prop.
 * Chỉ liệt kê chức năng đã có sẵn ở BE/client (không dựng UI rỗng cho i18n/push
 * chưa tồn tại).
 */
export function SettingsSheet({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const khoDangChon = useKhoPicker((s) => s.khoDangChon);
  const permissions = usePermissions();
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();

  const doLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          onDismiss();
          await logout();
          await clearSession();
          useCartStore.getState().reset();
          useReceiptDraftStore.getState().reset();
          useKiemDraftStore.getState().reset();
          usePhieuChuyenDraftStore.getState().reset();
          await Promise.all([
            AsyncStorage.removeItem(CART_STORAGE_KEY),
            AsyncStorage.removeItem(RECEIPT_DRAFT_KEY),
            AsyncStorage.removeItem(KIEM_DRAFT_KEY),
            AsyncStorage.removeItem(PHIEU_CHUYEN_DRAFT_KEY),
          ]);
          qc.clear();
        },
      },
    ]);
  };

  // Đóng sheet TRƯỚC khi push để user quay lại không thấy sheet cũ.
  const goTo = (href: string) => {
    onDismiss();
    setTimeout(() => router.push(href as never), 0);
  };

  const xoaDuLieuTam = () => {
    Alert.alert(
      'Xoá dữ liệu tạm?',
      'Bỏ mọi phiếu/đơn đang soạn dở (nhập, bán, kiểm, chuyển, đơn giống). Không hoàn tác được.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            useCartStore.getState().reset();
            useReceiptDraftStore.getState().reset();
            useKiemDraftStore.getState().reset();
            usePhieuChuyenDraftStore.getState().reset();
            await Promise.all([
              AsyncStorage.removeItem(CART_STORAGE_KEY),
              AsyncStorage.removeItem(RECEIPT_DRAFT_KEY),
              AsyncStorage.removeItem(KIEM_DRAFT_KEY),
              AsyncStorage.removeItem(PHIEU_CHUYEN_DRAFT_KEY),
            ]);
            onDismiss();
          },
        },
      ],
    );
  };

  const soQuyen = permissions.includes('*') ? 'toàn quyền' : `${permissions.length} quyền`;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onDismiss}>
        {/* Panel: chặn bubble để tap bên trong không đóng sheet */}
        <Pressable onPress={() => {}} className="mt-auto">
          <View className="bg-white rounded-t-frame p-4 pb-6">
            <View className="items-center mb-2">
              <View className="h-1 w-12 bg-neutral-300 rounded-full" />
            </View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-h2 text-ink">Cài đặt</Text>
              <Pressable
                onPress={onDismiss}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
              >
                <Ionicons name="close" size={ICON.lon} color={MAU.ink} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
            >
              <SectionLabel>Ứng dụng</SectionLabel>
              <RowGroup>
                <ListRow
                  grouped
                  icon="business-outline"
                  accent="xanh-duong"
                  title="Kho mặc định"
                  subtitle={khoDangChon ? `Đang chọn · ${khoDangChon}` : 'Chưa chọn'}
                  onPress={() => goTo('/kho')}
                />
                <ListRow
                  grouped
                  icon="trash-bin-outline"
                  accent="ho-phach"
                  title="Xoá dữ liệu tạm"
                  subtitle="Bỏ phiếu/đơn đang soạn dở"
                  onPress={xoaDuLieuTam}
                />
              </RowGroup>

              <View className="mt-4">
                <SectionLabel>Trợ giúp</SectionLabel>
                <RowGroup>
                  <ListRow
                    grouped
                    icon="information-circle-outline"
                    accent="xanh-duong"
                    title="Giới thiệu NaGreen"
                    subtitle="Phiên bản, tính năng"
                    onPress={() => goTo('/gioi-thieu')}
                  />
                  <ListRow
                    grouped
                    icon="help-buoy-outline"
                    accent="xanh-la"
                    title="Trợ giúp & liên hệ"
                    subtitle="Hỗ trợ, hotline, email"
                    onPress={() => goTo('/tro-giup')}
                  />
                </RowGroup>
              </View>

              {__DEV__ ? (
                <View className="mt-4">
                  <SectionLabel>Nhà phát triển</SectionLabel>
                  <RowGroup>
                    <ListRow
                      grouped
                      icon="cloud-outline"
                      accent="cham"
                      title="Backend"
                      subtitle={MOCK_API ? 'Mock API (offline)' : API_BASE_URL}
                      onPress={() => {}}
                    />
                    <ListRow
                      grouped
                      icon="shield-checkmark-outline"
                      accent="tim"
                      title="Quyền tài khoản"
                      subtitle={soQuyen}
                      onPress={() =>
                        Alert.alert(
                          'Quyền tài khoản',
                          permissions.length ? permissions.join('\n') : 'Không có quyền nào.',
                        )
                      }
                    />
                  </RowGroup>
                </View>
              ) : null}
            </ScrollView>

            <View className="mt-4">
              <Button label="Đăng xuất" variant="danger" onPress={doLogout} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
