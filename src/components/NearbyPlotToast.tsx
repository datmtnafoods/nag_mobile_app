import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, ICON, MAU } from '../theme/tokens';
import type { ThuaDatKemHo } from '../features/den-thua/types';

/**
 * Popup "Có thửa quanh bạn" — đẩy từ đáy lên, overlay toàn app (treo ở
 * `_layout.tsx` ngoài tabs nên nổi đè mọi tab). Card giàu thông tin nông hộ:
 * tên hộ, SĐT (bấm gọi), cây trồng, diện tích, trạng thái, mã, khoảng cách.
 * Chạm card → mở bản đồ dò thửa `/thua/quanh-ban` rồi tự ẩn; bấm `×` → chỉ ẩn.
 *
 * KHÔNG auto-hide theo giờ: đứng chờ tới khi người dùng nhấn/đóng. Việc quyết
 * định "khi nào bật / có nhắc lại không" nằm ở `useNearbyPlotDetection`, provider
 * này chỉ là bề mặt hiển thị.
 *
 * PII: `tenHo`/`dienThoaiHo` chỉ hiển thị tạm — KHÔNG log, KHÔNG persist.
 */

export type NearbyPayload = {
  /** Thửa chính để hiển thị (đang đứng trên, hoặc gần nhất). */
  thua: ThuaDatKemHo;
  /** Khoảng cách (m) — có khi thửa chính thuộc nhóm "gần". */
  khoangCachM?: number;
  /** Tổng thửa còn lại quanh đây (trúng + gần − 1). */
  soThuaKhac: number;
  /** true = đang đứng trên thửa này; false = chỉ ở gần. */
  dangDungTren: boolean;
};

type Ctx = {
  show: (payload: NearbyPayload) => void;
  hide: () => void;
};

const NearbyPlotToastContext = createContext<Ctx | null>(null);

export function useNearbyPlotToast(): Ctx {
  const ctx = useContext(NearbyPlotToastContext);
  if (!ctx) throw new Error('useNearbyPlotToast phải nằm trong <NearbyPlotToastProvider>');
  return ctx;
}

const STATUS_META = {
  pending: { nhan: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { nhan: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { nhan: 'Bị từ chối', bg: 'bg-red-50', text: 'text-red-700' },
} as const;

export function NearbyPlotToastProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<NearbyPayload | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((p: NearbyPayload) => setPayload(p), []);
  const hide = useCallback(() => setPayload(null), []);

  const ctx = useMemo(() => ({ show, hide }), [show, hide]);

  const a = ACCENT['xanh-la'];
  const thua = payload?.thua;
  const meta = thua ? STATUS_META[thua.status] : null;

  const goiDien = (sdt: string) => {
    void Linking.openURL(`tel:${sdt.replace(/\s+/g, '')}`);
  };

  return (
    <NearbyPlotToastContext.Provider value={ctx}>
      {children}
      {payload && thua && meta ? (
        // insets.bottom + 64 = tab bar (~56) + gap 8, sát trên tab bar để không có
        // khoảng trắng dư. UndoSnackbar ở +72 chồng ~8px đáy Toast khi cả 2 hiện
        // — chấp nhận (hiếm khi trùng); iteration sau xử stack chung nếu cần.
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 64 }}
        >
          <Pressable
            onPress={() => {
              hide();
              router.push('/thua/quanh-ban' as never);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${payload.dangDungTren ? 'Bạn đang ở thửa' : 'Thửa gần bạn'} ${
              thua.tenHo ?? 'chưa gán nông hộ'
            }. Chạm để mở bản đồ.`}
            className="rounded-card-lg bg-white border border-border px-4 py-3 active:opacity-90"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.16,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {/* Eyebrow */}
            <Text className="text-small text-ink-soft mb-1">
              {payload.dangDungTren ? 'Bạn đang ở thửa' : 'Thửa gần bạn'}
              {!payload.dangDungTren && payload.khoangCachM != null
                ? ` · ~${Math.round(payload.khoangCachM)} m`
                : ''}
            </Text>

            {/* Hàng 1: icon + tên hộ + trạng thái + đóng */}
            <View className="flex-row items-center">
              <View className={`w-11 h-11 rounded-input items-center justify-center mr-3 ${a.bg}`}>
                <Ionicons name="location" size={ICON.vua} color={a.icon} />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-body text-ink font-semibold" numberOfLines={1}>
                  {thua.tenHo ?? 'Chưa gán nông hộ'}
                </Text>
                <Text className="text-caption text-ink-muted font-mono" numberOfLines={1}>
                  {thua.id}
                </Text>
              </View>
              <View className={`rounded-input px-2 py-1 mr-1 ${meta.bg}`}>
                <Text className={`text-small font-semibold ${meta.text}`}>{meta.nhan}</Text>
              </View>
              <Pressable
                onPress={hide}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={10}
                // Chip nền xám luôn hiện + icon đậm để nút đóng nổi rõ ngay cả khi
                // popup che nội dung màn dưới (rail Trang chủ / danh sách thửa).
                className="w-9 h-9 items-center justify-center rounded-full bg-neutral-100 active:bg-neutral-200"
              >
                <Ionicons name="close" size={ICON.vua} color={MAU.inkMuted} />
              </Pressable>
            </View>

            {/* Hàng 2: cây trồng + diện tích */}
            <View className="flex-row items-center flex-wrap mt-2">
              {thua.cropName ? (
                <View className="flex-row items-center mr-3">
                  <Ionicons name="leaf-outline" size={14} color="#166534" />
                  <Text className="text-caption text-ink ml-1">{thua.cropName}</Text>
                </View>
              ) : null}
              <View className="flex-row items-center">
                <Ionicons name="resize-outline" size={14} color="#6b7280" />
                <Text className="text-caption text-ink-muted ml-1">
                  {thua.areaHa.toLocaleString('vi-VN')} ha
                </Text>
              </View>
            </View>

            {/* Hàng SĐT — Pressable con, không kích hoạt điều hướng của card cha */}
            {thua.dienThoaiHo ? (
              <Pressable
                onPress={() => goiDien(thua.dienThoaiHo!)}
                accessibilityRole="button"
                accessibilityLabel={`Gọi ${thua.dienThoaiHo}`}
                hitSlop={6}
                className="flex-row items-center mt-2 active:opacity-70 self-start"
              >
                <Ionicons name="call-outline" size={14} color="#166534" />
                <Text className="text-caption text-primary font-medium ml-1">
                  {thua.dienThoaiHo}
                </Text>
              </Pressable>
            ) : null}

            {/* Footer hint */}
            <Text className="text-small text-ink-soft mt-2">
              Chạm để mở bản đồ
              {payload.soThuaKhac > 0 ? ` · và ${payload.soThuaKhac} thửa khác quanh đây` : ''}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </NearbyPlotToastContext.Provider>
  );
}
