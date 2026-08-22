import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { useIsOnline } from '../../src/hooks/useIsOnline';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { timThuaTheoToaDo, listPlotsKemHo } from '../../src/api/erp/growing-areas';
import { reverseGeocode, ghepDiaChi } from '../../src/api/erp/geocode';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChip } from '../../src/components/FilterChip';
import { ThuaDatCard } from '../../src/features/den-thua/components/ThuaDatCard';
import { BanDoRanh, type PlotHienThi } from '../../src/features/den-thua/components/BanDoRanh';
import { centroid } from '../../src/features/den-thua/geo';
import { NGUONG_SAI_SO_M } from '../../src/features/den-thua/gps';
import { locThuaTheoTuKhoa, MAU_THEO_STATUS } from '../../src/features/den-thua/timKiem';
import { permsDenThua } from '../../src/features/den-thua/perms';
import { useAuthStore } from '../../src/auth/store';
import { useCloseHandler } from '../../src/components/HeaderCloseButton';
import { ICON, MAU } from '../../src/theme/tokens';

type CheDo = 'danh-sach' | 'ban-do';

export default function ThuaTab() {
  const permissions = useAuthStore((s) => s.permissions);
  const perms = permsDenThua(permissions);
  const dong = useCloseHandler('/vung-trong');
  // `?view=ban-do` (từ card "Danh sách thửa" trong Vùng trồng) → mở thẳng chế độ
  // Bản đồ. "Thửa quanh bạn" đã tách ra màn `/thua/quanh-ban` riêng.
  const { view } = useLocalSearchParams<{ view?: string }>();

  const {
    state: gpsState,
    viTri,
    canAskAgain,
    layViTri,
  } = useDeviceLocation({
    auto: true,
    accuracy: Location.Accuracy.High,
    timeoutMs: 15000,
    // Dò thửa cần điểm sạch — không nháy cache wifi sai số cả km ra xã lệch.
    lastKnownRequiredAccuracyM: 200,
  });

  const [dangLamMoi, setDangLamMoi] = useState(false);
  const [tim, setTim] = useState('');
  const [chedo, setChedo] = useState<CheDo>(view === 'ban-do' ? 'ban-do' : 'danh-sach');
  // Thửa đang chọn trên bản đồ → card nổi phía dưới (kiểu Booking).
  const [chonId, setChonId] = useState<string | null>(null);
  // Bản đồ hỏng (mất mạng/CDN chặn) → rơi về danh sách trong cùng chế độ.
  const [mapLoi, setMapLoi] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Route này là hidden-tab persist: lần push đầu mới mount, lần sau chỉ đổi
  // params → useState initializer không chạy lại. Đồng bộ chedo theo `view` để
  // mọi lần deep-link đúng đích, không dính hiện trạng phiên trước.
  useEffect(() => {
    if (view === 'ban-do') setChedo('ban-do');
  }, [view]);

  const online = useIsOnline();
  const saiSo = viTri?.doChinhXac;
  const gpsDuChinhXac = viTri != null && (saiSo == null || saiSo <= NGUONG_SAI_SO_M);

  // Thửa quanh vị trí đang đứng (GPS). `offlineFirst`: vẫn chạy queryFn khi mất
  // mạng để rơi vào cache thửa (dò thửa là point-in-polygon client-side).
  const doQuery = useQuery({
    queryKey: ['do-thua', viTri?.lat, viTri?.lng],
    queryFn: () => timThuaTheoToaDo(viTri!.lat, viTri!.lng),
    enabled: gpsDuChinhXac,
    staleTime: 15_000,
    networkMode: 'offlineFirst',
  });

  // Toàn bộ thửa (kèm tên hộ) cho danh sách quản lý. `offlineFirst` để danh sách
  // hiện từ cache khi offline (tên hộ ẩn — PII không cache).
  const dsQuery = useQuery({
    queryKey: ['thua-list'],
    queryFn: () => listPlotsKemHo(),
    staleTime: 30_000,
    networkMode: 'offlineFirst',
  });

  const diaChiQuery = useQuery({
    queryKey: ['geocode', viTri?.lat, viTri?.lng],
    queryFn: () => reverseGeocode(viTri!.lat, viTri!.lng),
    enabled: viTri != null,
    staleTime: 60_000,
  });

  // Quay lại tab sau khi tạo/sửa thửa → nạp lại danh sách + dò GPS.
  useFocusEffect(
    useCallback(() => {
      void dsQuery.refetch();
      if (gpsDuChinhXac) void doQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gpsDuChinhXac]),
  );

  const doLai = async () => {
    setDangLamMoi(true);
    await Promise.all([layViTri(), dsQuery.refetch()]);
    setDangLamMoi(false);
  };

  const taoThua = () => {
    const q = viTri ? `?lat=${viTri.lat}&lng=${viTri.lng}` : '';
    router.push(`/thua/tao-thua${q}` as never);
  };

  const trung = doQuery.data?.trung ?? [];
  const ganDo = doQuery.data?.ganDo ?? [];

  const ds = dsQuery.data ?? [];
  const needle = tim.trim().toLowerCase();
  const dsLoc = useMemo(() => locThuaTheoTuKhoa(ds, needle), [ds, needle]);

  // Chế độ bản đồ: debounce để không bơm setPlots mỗi phím gõ.
  const timTre = useDebouncedValue(tim, 250);
  const dsLocMap = useMemo(() => locThuaTheoTuKhoa(ds, timTre), [ds, timTre]);
  // LƯU Ý real mode: backend lọc thửa theo người tạo nếu user thiếu quyền
  // `growing-area:approve` (xem growing-areas.ts) → bản đồ có thể thiếu thửa của
  // người khác. Không vá client; nới quyền ở backend.
  const plots = useMemo<PlotHienThi[]>(() => {
    const out: PlotHienThi[] = [];
    for (const t of dsLocMap) {
      if (!t.boundary || t.boundary.length < 3) continue;
      const c = centroid(t.boundary);
      if (!c) continue;
      const mau = MAU_THEO_STATUS[t.status];
      out.push({
        id: t.id,
        ring: t.boundary,
        center: c,
        label: t.tenHo ?? t.id,
        mauFill: mau.fill,
        mauLine: mau.line,
      });
    }
    return out;
  }, [dsLocMap]);
  const chonThua = chonId ? dsLocMap.find((t) => t.id === chonId) ?? null : null;
  const gpsProp = viTri ? { lng: viTri.lng, lat: viTri.lat, doChinhXac: viTri.doChinhXac } : null;

  const thuLaiBanDo = () => {
    setMapLoi(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      {/* Header cố định + toggle chế độ (luôn hiện để đổi Danh sách/Bản đồ) */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-start">
          <Pressable
            onPress={dong}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            className="mr-1 -ml-1 mt-0.5"
          >
            <Ionicons name="chevron-back" size={ICON.lon} color={MAU.ink} />
          </Pressable>
          <View className="flex-1 pr-2">
            <Text className="text-h1 text-ink">Thửa</Text>
          </View>
        </View>

        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <FilterChip
            label="Danh sách"
            icon="list-outline"
            active={chedo === 'danh-sach'}
            onPress={() => setChedo('danh-sach')}
          />
          <FilterChip
            label="Bản đồ"
            icon="map-outline"
            active={chedo === 'ban-do'}
            onPress={() => setChedo('ban-do')}
          />
        </View>
      </View>

      {chedo === 'ban-do' ? (
        <View className="flex-1">
          {dsQuery.isPending ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#dd1c2e" />
            </View>
          ) : dsQuery.isError ? (
            <View className="p-4">
              <ErrorState
                message={apiErrorMessage(dsQuery.error)}
                onRetry={() => void dsQuery.refetch()}
              />
            </View>
          ) : mapLoi ? (
            // Bản đồ hỏng → danh sách thuần (search vẫn chạy) + nút thử lại.
            <View className="flex-1 px-4">
              <View className="rounded-input bg-amber-100 border border-amber-500 p-3 mt-1 mb-3 flex-row items-center">
                <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
                <Text className="text-small text-amber-800 ml-2 flex-1">
                  Không tải được bản đồ — đang hiển thị dạng danh sách.
                </Text>
                <Pressable
                  onPress={thuLaiBanDo}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Thử lại bản đồ"
                >
                  <Text className="text-small text-primary font-semibold">Thử lại</Text>
                </Pressable>
              </View>
              <Input
                placeholder="Tìm theo hộ, cây trồng, mã thửa…"
                leftIcon="search-outline"
                value={tim}
                onChangeText={setTim}
                autoCapitalize="none"
              />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {dsLoc.length > 0 ? (
                  dsLoc.map((t) => (
                    <ThuaDatCard
                      key={t.id}
                      thua={t}
                      onPress={() => router.push(`/thua/${t.id}` as never)}
                    />
                  ))
                ) : (
                  <Text className="text-caption text-ink-muted text-center mt-6">
                    {needle ? 'Không có thửa nào khớp tìm kiếm.' : 'Chưa có thửa nào.'}
                  </Text>
                )}
              </ScrollView>
            </View>
          ) : (
            <View className="flex-1">
              <BanDoRanh
                key={reloadKey}
                mode="xem"
                ring={[]}
                plots={plots}
                focusPlotId={chonThua ? chonId : null}
                gps={gpsProp}
                onPlotTap={(id) => setChonId(id)}
                onMapTap={() => setChonId(null)}
                onMapError={() => setMapLoi(true)}
              />

              {/* Ô tìm kiếm nổi trên bản đồ */}
              <View className="absolute left-4 right-4" style={{ top: 8 }} pointerEvents="box-none">
                <Input
                  placeholder="Tìm theo hộ, cây trồng, mã thửa…"
                  leftIcon="search-outline"
                  value={tim}
                  onChangeText={setTim}
                  autoCapitalize="none"
                />
                <View className="flex-row" pointerEvents="none" style={{ marginTop: -4 }}>
                  <View className="rounded-input bg-ink px-2.5 py-1">
                    <Text className="text-small text-white font-semibold">
                      {timTre.trim()
                        ? plots.length > 0
                          ? `${plots.length} thửa khớp`
                          : 'Không có thửa khớp'
                        : `${plots.length} thửa`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card thửa đang chọn (nổi dưới, kiểu Booking) */}
              {chonThua ? (
                <View
                  className="absolute left-4 right-4"
                  style={{ bottom: 16 }}
                  pointerEvents="box-none"
                >
                  <ThuaDatCard
                    thua={chonThua}
                    onPress={() => router.push(`/thua/${chonThua.id}` as never)}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={doLai} />}
        >
          {perms.veThua ? (
            <View className="mb-3">
              <Button label="Tạo thửa đất mới" onPress={taoThua} />
            </View>
          ) : null}

          {/* Thửa quanh bạn (GPS) */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-caption text-ink-muted uppercase">Thửa quanh bạn</Text>
            <Text
              className="text-caption text-primary font-semibold"
              onPress={gpsState === 'dang-lay' ? undefined : doLai}
            >
              {gpsState === 'dang-lay' ? 'Đang định vị…' : 'Đo lại'}
            </Text>
          </View>

          {!online ? (
            <View className="flex-row items-center rounded-input bg-amber-100 border border-amber-300 px-2 py-1 mb-2">
              <Ionicons name="cloud-offline-outline" size={13} color="#92400e" />
              <Text className="text-small text-amber-800 ml-1.5 flex-1">
                Dữ liệu offline — có thể chưa mới; chưa hiện tên hộ.
              </Text>
            </View>
          ) : null}

          {gpsState === 'dang-lay' ? (
            <View className="flex-row items-center py-1">
              <ActivityIndicator size="small" color="#dd1c2e" />
              <Text className="text-body text-ink ml-3">Đang định vị…</Text>
            </View>
          ) : viTri ? (
            <>
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color={gpsDuChinhXac ? '#166534' : '#92400e'} />
                <Text className="text-caption text-ink ml-2 flex-1">
                  {diaChiQuery.data
                    ? ghepDiaChi(diaChiQuery.data)
                    : diaChiQuery.isError || !online
                      ? 'Chưa tra được địa chỉ (đang offline)'
                      : 'Đang tra địa chỉ…'}
                  {saiSo != null ? ` · ±${Math.round(saiSo)} m` : ''}
                </Text>
              </View>

              {!gpsDuChinhXac ? (
                <Text className="text-small text-amber-800 mt-2">
                  GPS chưa đủ chính xác. Ra chỗ thoáng rồi "Đo lại".
                </Text>
              ) : doQuery.isPending ? (
                <View className="items-center py-3">
                  <ActivityIndicator color="#dd1c2e" />
                </View>
              ) : doQuery.isError ? (
                <Text className="text-small text-red-700 mt-2">{apiErrorMessage(doQuery.error)}</Text>
              ) : trung.length > 0 ? (
                <View className="mt-3">
                  <Text className="text-small text-ink-muted mb-2">
                    Đang đứng trong {trung.length > 1 ? `${trung.length} thửa` : 'thửa'}:
                  </Text>
                  {trung.map((t) => (
                    <ThuaDatCard key={t.id} thua={t} onPress={() => router.push(`/thua/${t.id}` as never)} />
                  ))}
                </View>
              ) : ganDo.length > 0 ? (
                <View className="mt-3">
                  <Text className="text-small text-ink-muted mb-2">
                    Không đứng trong thửa nào — thửa gần đây:
                  </Text>
                  {ganDo.map((t) => (
                    <ThuaDatCard
                      key={t.id}
                      thua={t}
                      khoangCachM={t.khoangCachM}
                      onPress={() => router.push(`/thua/${t.id}` as never)}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-small text-ink-muted mt-2">
                  Chưa có thửa nào quanh đây.
                </Text>
              )}
            </>
          ) : (
            <Text className="text-small text-ink-muted mt-1">
              {gpsState === 'tu-choi'
                ? canAskAgain
                  ? 'Cần quyền vị trí. Bấm "Đo lại".'
                  : 'Đã tắt quyền vị trí. Bật lại trong Cài đặt.'
                : 'Chưa có vị trí. Bấm "Đo lại".'}
            </Text>
          )}
        </View>

        {/* Danh sách tất cả thửa */}
        <Text className="text-caption text-ink-muted uppercase mb-2">
          Tất cả thửa{ds.length ? ` (${ds.length})` : ''}
        </Text>
        <Input
          placeholder="Tìm theo hộ, cây trồng, mã thửa…"
          leftIcon="search-outline"
          value={tim}
          onChangeText={setTim}
          autoCapitalize="none"
        />

        {dsQuery.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : dsQuery.isError ? (
          <ErrorState message={apiErrorMessage(dsQuery.error)} onRetry={() => void dsQuery.refetch()} />
        ) : dsLoc.length > 0 ? (
          dsLoc.map((t) => (
            <ThuaDatCard key={t.id} thua={t} onPress={() => router.push(`/thua/${t.id}` as never)} />
          ))
        ) : (
          <View className="rounded-card bg-white border border-border p-6 items-center">
            <Ionicons name="map-outline" size={40} color="#d1d5db" />
            <Text className="text-caption text-ink-muted mt-2 text-center">
              {needle ? 'Không có thửa nào khớp tìm kiếm.' : 'Chưa có thửa nào. Tạo thửa đầu tiên.'}
            </Text>
          </View>
        )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
