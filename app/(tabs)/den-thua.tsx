import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { timThuaTheoToaDo } from '../../src/api/erp/growing-areas';
import { reverseGeocode, ghepDiaChi } from '../../src/api/erp/geocode';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { ErrorState } from '../../src/components/ErrorState';
import { ThuaDatCard } from '../../src/features/den-thua/components/ThuaDatCard';
import { permsDenThua } from '../../src/features/den-thua/perms';
import { useAuthStore } from '../../src/auth/store';

/**
 * Sai số tối đa còn dò thửa được. Thửa vài sào chỉ ~30–60 m cạnh — GPS lệch quá
 * ngưỡng này thì kết luận "trong/ngoài thửa" là đoán mò, thà chặn còn hơn cho
 * người dùng tạo thửa trùng hoặc ghi nhật ký vào nhầm thửa.
 */
const NGUONG_SAI_SO_M = 50;

export default function DenThua() {
  const permissions = useAuthStore((s) => s.permissions);
  const perms = permsDenThua(permissions);

  const {
    state: gpsState,
    viTri,
    loi: gpsLoi,
    canAskAgain,
    layViTri,
  } = useDeviceLocation({ auto: true, accuracy: Location.Accuracy.High, timeoutMs: 15000 });

  const [dangLamMoi, setDangLamMoi] = useState(false);

  const saiSo = viTri?.doChinhXac;
  const gpsDuChinhXac = viTri != null && (saiSo == null || saiSo <= NGUONG_SAI_SO_M);

  const doQuery = useQuery({
    queryKey: ['do-thua', viTri?.lat, viTri?.lng],
    queryFn: () => timThuaTheoToaDo(viTri!.lat, viTri!.lng),
    enabled: gpsDuChinhXac,
    staleTime: 15_000,
  });

  const diaChiQuery = useQuery({
    queryKey: ['geocode', viTri?.lat, viTri?.lng],
    queryFn: async () => {
      const dc = await reverseGeocode(viTri!.lat, viTri!.lng);
      return { chuoi: ghepDiaChi(dc), nguon: dc.nguon };
    },
    enabled: viTri != null,
    staleTime: 60_000,
  });

  // Quay lại tab sau khi tạo thửa → dò lại để thấy thửa vừa tạo.
  useFocusEffect(
    useCallback(() => {
      if (gpsDuChinhXac) void doQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gpsDuChinhXac]),
  );

  const doLai = async () => {
    setDangLamMoi(true);
    await layViTri();
    setDangLamMoi(false);
  };

  const trung = doQuery.data?.trung ?? [];
  const ganDo = doQuery.data?.ganDo ?? [];

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={doLai} />}
      >
        <View className="mb-4">
          <Text className="text-h1 text-ink">Đến thửa</Text>
          <Text className="text-caption text-ink-muted mt-1">
            Đứng giữa vườn rồi để app dò xem đã có thửa đất chưa.
          </Text>
        </View>

        {/* Trạng thái GPS */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          {gpsState === 'dang-lay' ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#dd1c2e" />
              <Text className="text-body text-ink ml-3">Đang định vị…</Text>
            </View>
          ) : viTri ? (
            <>
              <View className="flex-row items-center">
                <Ionicons
                  name="location"
                  size={18}
                  color={gpsDuChinhXac ? '#166534' : '#92400e'}
                />
                <Text className="text-body text-ink font-semibold ml-2 flex-1">
                  {diaChiQuery.data?.chuoi ?? 'Đang tra địa chỉ…'}
                </Text>
              </View>
              <Text className="text-caption text-ink-muted font-mono mt-1">
                {viTri.lat.toFixed(5)}, {viTri.lng.toFixed(5)}
                {saiSo != null ? ` · ±${Math.round(saiSo)} m` : ''}
              </Text>
              {diaChiQuery.data?.nguon === 'mock' ? (
                <Text className="text-small text-ink-soft mt-0.5">
                  địa chỉ ước lượng — chưa nối máy chủ
                </Text>
              ) : null}
            </>
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={18} color="#92400e" />
              <Text className="text-body text-ink ml-2 flex-1">
                {gpsState === 'tu-choi' ? 'Chưa cấp quyền vị trí' : 'Chưa có vị trí'}
              </Text>
            </View>
          )}

          <View className="mt-3">
            <Button
              label={gpsState === 'dang-lay' ? 'Đang định vị…' : 'Đo lại vị trí'}
              variant="secondary"
              disabled={gpsState === 'dang-lay'}
              onPress={doLai}
            />
          </View>
        </View>

        {/* Chặn khi GPS chưa đủ chính xác */}
        {viTri && !gpsDuChinhXac ? (
          <View className="rounded-card bg-amber-50 border border-amber-200 p-4 mb-4 flex-row">
            <Ionicons name="warning-outline" size={20} color="#92400e" />
            <View className="ml-2 flex-1">
              <Text className="text-body text-amber-900 font-semibold">
                GPS chưa đủ chính xác để dò thửa
              </Text>
              <Text className="text-small text-amber-900 mt-1">
                Sai số ±{Math.round(saiSo ?? 0)} m, trong khi thửa vài sào chỉ rộng vài chục
                mét. Ra chỗ thoáng, tránh tán cây và nhà tôn, đợi vài giây rồi bấm "Đo lại".
              </Text>
            </View>
          </View>
        ) : null}

        {gpsState === 'tu-choi' || gpsState === 'loi' ? (
          <View className="rounded-card bg-amber-50 border border-amber-200 p-4 mb-4">
            <Text className="text-small text-amber-900">
              {gpsState === 'tu-choi'
                ? canAskAgain
                  ? 'Cần quyền vị trí để dò thửa. Bấm "Đo lại vị trí" để cấp quyền.'
                  : 'Bạn đã từ chối quyền vị trí. Vào Cài đặt để bật lại.'
                : (gpsLoi ?? 'Không lấy được vị trí.')}
            </Text>
          </View>
        ) : null}

        {/* Kết quả dò */}
        {gpsDuChinhXac ? (
          doQuery.isPending ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#dd1c2e" />
              <Text className="text-caption text-ink-muted mt-2">Đang dò thửa đất…</Text>
            </View>
          ) : doQuery.isError ? (
            <ErrorState
              message={apiErrorMessage(doQuery.error)}
              onRetry={() => void doQuery.refetch()}
            />
          ) : trung.length > 0 ? (
            <>
              <Text className="text-caption text-ink-muted uppercase mb-2">
                {trung.length > 1 ? `Có ${trung.length} thửa ở đây` : 'Thửa đất tại đây'}
              </Text>
              {trung.map((t) => (
                <ThuaDatCard
                  key={t.id}
                  thua={t}
                  onPress={() =>
                    router.push(
                      `/thua/${t.id}` as never,
                    )
                  }
                />
              ))}
              <Text className="text-small text-ink-muted mb-4">
                Chạm vào thửa để xem lịch canh tác và ghi nhật ký.
              </Text>
            </>
          ) : (
            <>
              <View className="rounded-card bg-white border border-border p-5 items-center mb-3">
                <Ionicons name="map-outline" size={44} color="#d1d5db" />
                <Text className="text-h2 text-ink mt-3 text-center">
                  Chưa có thửa đất ở đây
                </Text>
                <Text className="text-caption text-ink-muted mt-2 text-center">
                  Vị trí này chưa nằm trong thửa nào đã ghi nhận. Tạo mới để lần sau đến là
                  nhận ra ngay.
                </Text>
                <View className="w-full mt-4">
                  <Button
                    label="Tạo thửa đất mới"
                    disabled={!perms.veThua}
                    onPress={() =>
                      router.push(
                        `/thua/tao-thua?lat=${viTri!.lat}&lng=${viTri!.lng}` as never,
                      )
                    }
                  />
                </View>
                {!perms.veThua ? (
                  <Text className="text-small text-ink-muted mt-2 text-center">
                    Cần quyền {'"'}growing-area:draw{'"'} để tạo thửa.
                  </Text>
                ) : null}
              </View>

              {ganDo.length > 0 ? (
                <>
                  <Text className="text-caption text-ink-muted uppercase mb-2">
                    Thửa gần đây — có thể bạn đang đứng ở rìa
                  </Text>
                  {ganDo.map((t) => (
                    <ThuaDatCard
                      key={t.id}
                      thua={t}
                      khoangCachM={t.khoangCachM}
                      onPress={() =>
                        router.push(
                          `/thua/${t.id}` as never,
                        )
                      }
                    />
                  ))}
                </>
              ) : null}
            </>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
