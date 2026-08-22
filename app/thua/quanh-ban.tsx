import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { listPlotsKemHo } from '../../src/api/erp/growing-areas';
import type { ThuaDatKemHo } from '../../src/features/den-thua/types';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { ThuaDatCard } from '../../src/features/den-thua/components/ThuaDatCard';
import {
  BanDoRanh,
  type PlotHienThi,
} from '../../src/features/den-thua/components/BanDoRanh';
import { centroid, khoangCachM, pointInRing } from '../../src/features/den-thua/geo';
import { locThuaTheoTuKhoa, MAU_THEO_STATUS } from '../../src/features/den-thua/timKiem';

/**
 * "Thửa quanh bạn" — bản đồ vệ tinh full-screen zoom sát vị trí GPS của KTV.
 * Cùng vỏ trình bày như `ve-ranh.tsx` (không header, close nổi trên trái), khác
 * mục đích: mode="xem" để so nhanh các thửa quanh vị trí đứng, tap card → chi
 * tiết. Danh sách thửa (fit-bounds toàn bộ) vẫn ở tab Thửa, chọn qua Vùng trồng.
 */

// Đồng bộ với `BAN_KINH_GAN_M` ở growing-areas.ts — cùng ngưỡng "thửa gần" mà
// tab Thửa dùng cho khối "Thửa quanh bạn" text, nhất quán trải nghiệm.
const BAN_KINH_GAN_M = 500;
const SO_THUA_GAN_TOI_DA = 8;

const SCREEN_W = Dimensions.get('window').width;
// Coverflow: main to giữa (~72 % màn), 2 bên card kế thò ra + thu nhỏ scale 0.85.
const CARD_MAIN_W = Math.round(SCREEN_W * 0.72);
const CARD_GAP = 12;
const ITEM_STRIDE = CARD_MAIN_W + CARD_GAP;
// Padding trái/phải để card đầu/cuối vẫn snap được vào giữa màn hình.
const SIDE_PADDING = Math.max(0, (SCREEN_W - CARD_MAIN_W) / 2);

type QuanhBanItem = ThuaDatKemHo & { khoangCachM?: number };

const AnimatedFlatList = Animated.FlatList as unknown as typeof Animated.FlatList;

export default function ThuaQuanhBanScreen() {
  const [chonId, setChonId] = useState<string | null>(null);
  const [mapLoi, setMapLoi] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tim, setTim] = useState('');
  // Debounce để không bơm setPlots mỗi phím gõ — khớp pattern tab Thửa.
  const timTre = useDebouncedValue(tim, 250);

  const { viTri } = useDeviceLocation({
    auto: true,
    accuracy: Location.Accuracy.High,
    timeoutMs: 15000,
  });
  const gpsProp = viTri
    ? { lng: viTri.lng, lat: viTri.lat, doChinhXac: viTri.doChinhXac }
    : null;

  const dsQuery = useQuery({
    queryKey: ['thua-list'],
    queryFn: () => listPlotsKemHo(),
    staleTime: 30_000,
    // Dùng cache thửa khi offline (tên hộ ẩn — PII không cache).
    networkMode: 'offlineFirst',
  });
  const ds = dsQuery.data ?? [];

  // Ô search chỉ ảnh hưởng plots trên bản đồ (map view), KHÔNG đụng carousel
  // dưới — carousel là "vị trí vật lý", không phải kết quả tìm kiếm.
  const dsLoc = useMemo(() => locThuaTheoTuKhoa(ds, timTre), [ds, timTre]);
  const plots = useMemo<PlotHienThi[]>(() => {
    const out: PlotHienThi[] = [];
    for (const t of dsLoc) {
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
  }, [dsLoc]);

  // Cùng logic `timThuaTheoToaDo` (growing-areas.ts:228) nhưng chạy trên `ds`
  // đã fetch — không tốn call thêm; `ds` cũng có sẵn `tenHo` từ listPlotsKemHo.
  const trungGan = useMemo(() => {
    if (!viTri || ds.length === 0) return { trung: [] as QuanhBanItem[], ganDo: [] as QuanhBanItem[] };
    const gpsPt: [number, number] = [viTri.lng, viTri.lat];
    const trung: QuanhBanItem[] = [];
    const con: ThuaDatKemHo[] = [];
    for (const t of ds) {
      if (!t.boundary || t.boundary.length < 3) continue;
      if (pointInRing(gpsPt, t.boundary)) trung.push(t);
      else con.push(t);
    }
    const ganDo: QuanhBanItem[] = con
      .map((t) => {
        const c = centroid(t.boundary);
        const d = c
          ? khoangCachM({ lat: viTri.lat, lng: viTri.lng }, { lat: c[1], lng: c[0] })
          : Number.MAX_SAFE_INTEGER;
        return { t, d };
      })
      .filter((x) => x.d <= BAN_KINH_GAN_M)
      .sort((a, b) => a.d - b.d)
      .slice(0, SO_THUA_GAN_TOI_DA)
      .map((x) => ({ ...x.t, khoangCachM: x.d }));
    return { trung, ganDo };
  }, [ds, viTri]);

  // Sort theo kinh độ centroid ASC: card càng bên TRÁI trong carousel càng nằm
  // bên TRÁI trên bản đồ. Bản đồ MapLibre đã `disableRotation` nên "trái/phải"
  // luôn khớp west/east — pattern trực quan cho KTV.
  const carouselData = useMemo<QuanhBanItem[]>(() => {
    const withLng = [...trungGan.trung, ...trungGan.ganDo].map((t) => {
      const c = centroid(t.boundary);
      return { t, lng: c ? c[0] : 0 };
    });
    withLng.sort((a, b) => a.lng - b.lng);
    return withLng.map((x) => x.t);
  }, [trungGan]);
  const inCarouselIds = useMemo(() => new Set(carouselData.map((t) => t.id)), [carouselData]);
  const trungIds = useMemo(() => new Set(trungGan.trung.map((t) => t.id)), [trungGan.trung]);

  // Main = thửa đang đứng nếu có, else thửa gần nhất. `initialScrollIndex` sẽ
  // đưa carousel về đúng card này khi mount.
  const mainIndex = useMemo(() => {
    const mainId = trungGan.trung[0]?.id ?? trungGan.ganDo[0]?.id;
    if (!mainId) return 0;
    const i = carouselData.findIndex((t) => t.id === mainId);
    return Math.max(0, i);
  }, [carouselData, trungGan]);

  // Init `chonId` = main (thửa đang đứng nếu có) một lần khi carousel sẵn sàng.
  // Nếu KTV đã có lựa chọn (tap hoặc vuốt) → tôn trọng, không đè.
  useEffect(() => {
    if (carouselData.length === 0) return;
    if (chonId != null) return;
    setChonId(carouselData[mainIndex]?.id ?? carouselData[0].id);
  }, [carouselData, chonId, mainIndex]);

  // Ref kiểu FlatList<any> — Animated.FlatList wrap qua createAnimatedComponent,
  // forwardRef về FlatList thật, các method scroll đầy đủ nhưng typings hay lệch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatListRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(mainIndex * ITEM_STRIDE)).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (first?.item) setChonId((first.item as QuanhBanItem).id);
    },
  ).current;

  // Khi mainIndex đổi (GPS về sau data, hoặc data refresh) mà user chưa vuốt
  // sang card khác → đẩy scrollX + scroll list về main mới. Nếu user đã tự
  // chọn card khác (chonId khác main) → tôn trọng, không đè.
  useEffect(() => {
    if (carouselData.length === 0) return;
    const mainId = carouselData[mainIndex]?.id;
    if (!mainId) return;
    if (chonId != null && chonId !== mainId) return;
    const offset = mainIndex * ITEM_STRIDE;
    scrollX.setValue(offset);
    flatListRef.current?.scrollToOffset?.({ offset, animated: false });
  }, [mainIndex, carouselData, chonId, scrollX]);

  const onPlotTap = useCallback(
    (id: string) => {
      // setChonId TRƯỚC — bản đồ tô đậm ngay, không phụ thuộc scroll xong.
      setChonId(id);
      const idx = carouselData.findIndex((t) => t.id === id);
      if (idx < 0) return; // thửa ngoài carousel (pan xa) — chỉ tô đậm là đủ.
      // scrollToOffset ổn hơn scrollToIndex khi có initialScrollIndex/measurement
      // chưa xong — stride cố định nên offset chuẩn xác.
      flatListRef.current?.scrollToOffset?.({ offset: idx * ITEM_STRIDE, animated: true });
    },
    [carouselData],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<QuanhBanItem> | null | undefined, index: number) => ({
      length: ITEM_STRIDE,
      offset: ITEM_STRIDE * index,
      index,
    }),
    [],
  );

  const thuLaiBanDo = () => {
    setMapLoi(null);
    setReloadKey((k) => k + 1);
  };

  // Caption phản ánh MAIN đang xem (không phải toàn tập):
  // - Main ∈ trung → "Đang đứng trong thửa" (hoặc số nếu >1 thửa trùng).
  // - Main ∈ ganDo → "Thửa gần đây" — khoảng cách hiện trên card, không đúp.
  const mainInTrung = chonId != null && trungIds.has(chonId);
  const caption = mainInTrung
    ? trungGan.trung.length > 1
      ? `Đang đứng trong ${trungGan.trung.length} thửa`
      : 'Đang đứng trong thửa'
    : carouselData.length > 0
    ? 'Thửa gần đây'
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <BanDoRanh
        key={reloadKey}
        mode="xem"
        ring={[]}
        plots={plots}
        gps={gpsProp}
        initialFocus="gps"
        focusPlotId={chonId}
        onPlotTap={onPlotTap}
        onMapTap={() => {
          // Không đóng carousel khi tap chỗ trống — carousel luôn hiện là hữu ý.
        }}
        onMapError={(reason) => setMapLoi(reason)}
      />

      {/* Overlay điều khiển — box-none để bản đồ vẫn nhận cử chỉ ở vùng trống. */}
      <SafeAreaView
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        edges={['top', 'bottom']}
      >
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={styles.closeBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Tìm theo hộ, cây trồng, mã thửa…"
              leftIcon="search-outline"
              value={tim}
              onChangeText={setTim}
              autoCapitalize="none"
            />
            <View style={styles.badgeRow} pointerEvents="none">
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {timTre.trim()
                    ? plots.length > 0
                      ? `${plots.length} thửa khớp`
                      : 'Không có thửa khớp'
                    : `${plots.length} thửa`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {carouselData.length > 0 ? (
          <View style={styles.carouselWrap} pointerEvents="box-none">
            {caption ? (
              <View style={styles.captionPill} pointerEvents="none">
                <Text style={styles.captionText}>{caption}</Text>
              </View>
            ) : null}
            <AnimatedFlatList
              ref={flatListRef}
              data={carouselData}
              keyExtractor={(item) => (item as QuanhBanItem).id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_STRIDE}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
              getItemLayout={getItemLayout}
              initialScrollIndex={mainIndex}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => {
                const inputRange = [
                  (index - 1) * ITEM_STRIDE,
                  index * ITEM_STRIDE,
                  (index + 1) * ITEM_STRIDE,
                ];
                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.85, 1, 0.85],
                  extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp',
                });
                const t = item as QuanhBanItem;
                return (
                  <Animated.View
                    style={{
                      width: CARD_MAIN_W,
                      marginHorizontal: CARD_GAP / 2,
                      transform: [{ scale }],
                      opacity,
                    }}
                  >
                    <ThuaDatCard
                      thua={t}
                      khoangCachM={t.khoangCachM}
                      onPress={() => router.push(`/thua/${t.id}` as never)}
                    />
                  </Animated.View>
                );
              }}
            />
          </View>
        ) : null}
      </SafeAreaView>

      {dsQuery.isPending && !mapLoi ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : null}

      {mapLoi ? (
        <View style={styles.loiOverlay}>
          <Ionicons name="cloud-offline-outline" size={40} color="#fff" />
          <Text style={styles.loiTitle}>Không tải được bản đồ vệ tinh</Text>
          <Text style={styles.loiMsg}>{mapLoi}</Text>
          <View style={{ height: 16 }} />
          <View style={{ width: 260, gap: 8 }}>
            <Button label="Thử lại" onPress={thuLaiBanDo} />
            <Button label="Về Vùng trồng" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      ) : dsQuery.isError ? (
        <View style={styles.loiOverlay}>
          <Ionicons name="alert-circle-outline" size={40} color="#fff" />
          <Text style={styles.loiTitle}>Chưa tải được danh sách thửa</Text>
          <Text style={styles.loiMsg}>{apiErrorMessage(dsQuery.error)}</Text>
          <View style={{ height: 16 }} />
          <View style={{ width: 260, gap: 8 }}>
            <Button label="Thử lại" onPress={() => void dsQuery.refetch()} />
            <Button label="Về Vùng trồng" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  badgeRow: { flexDirection: 'row', marginTop: -4 },
  badge: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  closeBtn: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
  },
  captionPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(17,24,39,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  captionText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loiTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  loiMsg: { color: '#d1d5db', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
