import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { useRanhDraftStore } from '../../src/stores/ranh-draft';
import {
  BanDoRanh,
  type BanDoRanhHandle,
} from '../../src/features/den-thua/components/BanDoRanh';
import { areaHa, chuViM, tuCat, type Ring } from '../../src/features/den-thua/geo';
import { updatePlot } from '../../src/api/erp/growing-areas';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';

/** Trên bản đồ KHÔNG chặn cứng sai số — chỉ cảnh báo, vì KTV nhìn thấy đỉnh và kéo được. */
const NGUONG_SAI_SO_M = 50;

/** Nút tròn nổi trên bản đồ. */
function Fab({
  icon,
  label,
  onPress,
  disabled,
  mau = '#111827',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  mau?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.fab, disabled && { opacity: 0.5 }]}
    >
      <Ionicons name={icon} size={22} color={mau} />
    </Pressable>
  );
}

export default function VeRanh() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; plotId?: string }>();
  const lat0 = Number(params.lat) || 0;
  const lng0 = Number(params.lng) || 0;
  const initialCenter: [number, number] | null = lat0 && lng0 ? [lng0, lat0] : null;
  // plotId có = luồng SỬA ranh của thửa đã lưu → PATCH backend + refetch. Không
  // có = luồng vẽ mới cho wizard tạo thửa → chỉ bàn giao ring qua store, back.
  const plotId = typeof params.plotId === 'string' ? params.plotId : null;

  const qc = useQueryClient();
  const datRing = useRanhDraftStore((s) => s.datRing);

  const banDoRef = useRef<BanDoRanhHandle>(null);
  const [ring, setRing] = useState<Ring>(() => useRanhDraftStore.getState().ring);
  const [mapLoi, setMapLoi] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [canhBao, setCanhBao] = useState<string | null>(null);

  const {
    state: gpsState,
    viTri,
    layViTri,
  } = useDeviceLocation({ auto: true, accuracy: Location.Accuracy.High, timeoutMs: 15000 });

  const gps = viTri ? { lng: viTri.lng, lat: viTri.lat, doChinhXac: viTri.doChinhXac } : null;

  const soDinh = ring.length;
  const xoan = soDinh >= 4 && tuCat(ring);
  const coTheXong = soDinh >= 3 && !xoan;

  const themViTri = async () => {
    const vt = await layViTri();
    if (!vt) {
      Alert.alert('Chưa lấy được vị trí', 'Ra chỗ thoáng rồi thử lại.');
      return;
    }
    if (vt.doChinhXac != null && vt.doChinhXac > NGUONG_SAI_SO_M) {
      setCanhBao(
        `GPS sai số ±${Math.round(vt.doChinhXac)} m — đối chiếu đỉnh trên ảnh vệ tinh, kéo chỉnh nếu lệch.`,
      );
    } else {
      setCanhBao(null);
    }
    // Luôn thả đỉnh tại đúng GPS; page tự flyTo + bắn ring về (cập nhật `ring`).
    banDoRef.current?.themDinhTaiGps({ lng: vt.lng, lat: vt.lat, doChinhXac: vt.doChinhXac });
  };

  const hoanTac = () => setRing((r) => r.slice(0, -1));
  const doXoaHet = () => {
    setRing([]);
    setCanhBao(null);
    // Cho phép map re-center về GPS mới khi vẽ lại từ đầu — user thường muốn
    // xem lại chỗ mình đang đứng để đặt đỉnh đầu tiên.
    banDoRef.current?.resetGpsJump();
  };
  const xoaHet = () => {
    // Mode SỬA (plotId có): ranh đã lưu, xoá là mất → confirm chống lỡ tay.
    // Mode VẼ MỚI: chưa lưu gì → xoá luôn cho nhanh.
    if (plotId) {
      Alert.alert(
        'Xoá toàn bộ ranh?',
        'Ranh cũ sẽ mất, phải vẽ lại 3+ đỉnh rồi Lưu.',
        [
          { text: 'Huỷ', style: 'cancel' },
          { text: 'Xoá', style: 'destructive', onPress: doXoaHet },
        ],
      );
      return;
    }
    doXoaHet();
  };

  // Luồng SỬA: PATCH backend + refetch chi tiết thửa. onSuccess → back.
  // Luồng VẼ MỚI: chỉ datRing rồi back (wizard tự lưu qua createPlot sau).
  const luuRanh = useMutation({
    mutationFn: (r: Ring) => updatePlot(plotId!, { boundary: r }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thua', plotId] });
      qc.invalidateQueries({ queryKey: ['thua-list'] });
      qc.invalidateQueries({ queryKey: ['thua-by-party'] });
      router.back();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const xong = () => {
    if (plotId) {
      luuRanh.mutate(ring);
    } else {
      datRing(ring);
      router.back();
    }
  };

  // Callback từ bản đồ khi user chạm gần đỉnh đầu (chấm xanh to). Ring đầu ra
  // chưa qua validate xoắn — kiểm lại như logic nút Xong; xoắn thì cảnh báo
  // thay vì đóng ngầm.
  const dongVongTuBanDo = (ringMoi: Ring) => {
    if (ringMoi.length < 3) return;
    if (tuCat(ringMoi)) {
      setCanhBao('Ranh bị xoắn — kéo lại đỉnh cho hết cắt chéo trước khi đóng vòng.');
      return;
    }
    if (plotId) {
      luuRanh.mutate(ringMoi);
    } else {
      datRing(ringMoi);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <BanDoRanh
        key={reloadKey}
        ref={banDoRef}
        mode="ve"
        ring={ring}
        onChangeRing={setRing}
        onRingClosed={dongVongTuBanDo}
        gps={gps}
        initialCenter={initialCenter}
        onMapError={setMapLoi}
      />

      {/* Lớp điều khiển nổi — box-none để bản đồ vẫn nhận cử chỉ ở vùng trống.
          Dùng View + useSafeAreaInsets thay SafeAreaView: trong fullScreenModal
          (app/thua/_layout.tsx) inset của SafeAreaView không ổn định trên Android
          edge-to-edge → X bị status bar đè. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Trên: đóng + gợi ý */}
        <View style={[styles.topRow, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color="#111827" />
          </Pressable>
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Chạm để thêm góc · kéo đỉnh để chỉnh</Text>
          </View>
        </View>

        {canhBao ? (
          <View style={styles.canhBao} pointerEvents="none">
            <Ionicons name="warning-outline" size={16} color="#92400e" />
            <Text style={styles.canhBaoText}>{canhBao}</Text>
          </View>
        ) : null}

        {/* FAB dọc bên phải */}
        <View style={styles.fabCol} pointerEvents="box-none">
          <Fab
            icon="locate"
            label="Vị trí của tôi"
            mau="#2563eb"
            disabled={gpsState === 'dang-lay'}
            onPress={themViTri}
          />
          <Fab icon="arrow-undo" label="Hoàn tác" onPress={hoanTac} disabled={soDinh === 0} />
          <Fab icon="trash-outline" label="Xoá hết" onPress={xoaHet} disabled={soDinh === 0} mau="#b91c1c" />
        </View>

        {/* Dưới: số đo + Huỷ/Xong */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          <View style={[styles.pill, xoan && styles.pillXoan]} pointerEvents="none">
            {xoan ? (
              <Text style={styles.pillXoanText}>Ranh bị xoắn — kéo lại đỉnh cho hết cắt chéo</Text>
            ) : soDinh >= 3 ? (
              <>
                <Text style={styles.pillText}>
                  {soDinh} đỉnh · {areaHa(ring).toLocaleString('vi-VN')} ha · chu vi ~{chuViM(ring)} m
                </Text>
                {/* Hint đóng vòng bằng chạm — user không cần bấm nút. */}
                <Text style={styles.pillHintText}>
                  Chạm chấm xanh (đỉnh đầu) để đóng vòng, hoặc bấm Xong
                </Text>
              </>
            ) : (
              <Text style={styles.pillText}>
                Chạm ≥3 góc thửa trên ảnh vệ tinh{soDinh > 0 ? ` · đã có ${soDinh}` : ''}
              </Text>
            )}
          </View>
          <View style={styles.bottomRow} pointerEvents="box-none">
            <View style={{ flex: 1 }}>
              <Button label="Huỷ" variant="secondary" onPress={() => router.back()} />
            </View>
            <View style={{ flex: 1 }}>
              {/* Xanh chốt khi đủ điều kiện — nổi hẳn trên pill/nền vệ tinh đỏ.
                  Label kèm diện tích để user thấy rõ sẽ lưu bao nhiêu ha. */}
              <Button
                label={
                  plotId
                    ? coTheXong
                      ? `Lưu · ${areaHa(ring).toLocaleString('vi-VN')} ha`
                      : 'Lưu'
                    : coTheXong
                    ? `Xong · ${areaHa(ring).toLocaleString('vi-VN')} ha`
                    : 'Xong'
                }
                variant={coTheXong ? 'success' : 'primary'}
                loading={luuRanh.isPending}
                disabled={!coTheXong || luuRanh.isPending}
                onPress={xong}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Lỗi bản đồ → thử lại hoặc khai nhanh */}
      {mapLoi ? (
        <View style={styles.loiOverlay}>
          <Ionicons name="cloud-offline-outline" size={40} color="#fff" />
          <Text style={styles.loiTitle}>Không tải được bản đồ vệ tinh</Text>
          <Text style={styles.loiMsg}>{mapLoi}</Text>
          <View style={{ height: 16 }} />
          <View style={{ width: 260, gap: 8 }}>
            <Button
              label="Thử lại"
              onPress={() => {
                setMapLoi(null);
                setReloadKey((k) => k + 1);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
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
  hint: {
    backgroundColor: 'rgba(17,24,39,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  canhBao: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    maxWidth: '92%',
  },
  canhBaoText: { color: '#92400e', fontSize: 12, flexShrink: 1 },
  fabCol: {
    position: 'absolute',
    right: 12,
    top: '38%',
    gap: 12,
  },
  fab: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#dd1c2e',
    maxWidth: '100%',
  },
  pillText: { color: '#9f1239', fontSize: 12, fontWeight: '700' },
  pillHintText: { color: '#166534', fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  pillXoan: { backgroundColor: '#fef2f2', borderColor: '#b91c1c' },
  pillXoanText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', gap: 8 },
  loiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loiTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  loiMsg: { color: '#d1d5db', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
