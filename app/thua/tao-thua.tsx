import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createPlot } from '../../src/api/erp/growing-areas';
import { reverseGeocode, ghepDiaChi } from '../../src/api/erp/geocode';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DateField } from '../../src/components/DateField';
import { areaHa, centroid, tuCat } from '../../src/features/den-thua/geo';
import { RanhThuaPreview } from '../../src/features/den-thua/components/RanhThuaPreview';
import { BanDoRanh } from '../../src/features/den-thua/components/BanDoRanh';
import { ChonCayTrong } from '../../src/features/den-thua/components/ChonCayTrong';
import { ChonNhieuCayXen } from '../../src/features/den-thua/components/ChonNhieuCayXen';
import { TimelineCanhTac } from '../../src/features/den-thua/components/TimelineCanhTac';
import {
  chiSoMocHienTai,
  nhanDangCayTrong,
  tinhMocCanhTac,
} from '../../src/features/den-thua/lich-canh-tac';
import {
  ChonNongHo,
  giaiQuyetHo,
  hoHopLe,
  type KetQuaChonHo,
} from '../../src/features/den-thua/components/ChonNongHo';
import { useRanhDraftStore } from '../../src/stores/ranh-draft';

export default function TaoThua() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const qc = useQueryClient();

  const [buoc, setBuoc] = useState<1 | 2>(1);

  // Toạ độ ghim từ màn dò — tâm bản đồ khi vẽ ranh + vị trí mặc định của hộ mới.
  const lat = Number(params.lat) || 0;
  const lng = Number(params.lng) || 0;

  // ─ Bước 1: thửa đất
  // Ranh vẽ được bàn giao qua store tạm (màn full-screen ghi, wizard đọc).
  const ringBanDo = useRanhDraftStore((s) => s.ring);
  const xoaRanhDraft = useRanhDraftStore((s) => s.xoa);

  const [cayTrong, setCayTrong] = useState('');
  const [cayXenList, setCayXenList] = useState<string[]>([]);
  // Mốc gốc của timeline canh tác. Mặc định hôm nay, nhưng vườn đã trồng lâu thì
  // KTV phải chỉnh lại — không thì lịch lệch cả năm.
  const [ngayGoc, setNgayGoc] = useState<string | undefined>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [ghiChu, setGhiChu] = useState('');
  // Bản đồ vệ tinh xem-trước hỏng (mất mạng) → rơi về hình SVG ranh.
  const [mapPreviewLoi, setMapPreviewLoi] = useState<string | null>(null);

  // ─ Bước 2: nông hộ (OPTIONAL — vẽ thửa trước, gán hộ sau)
  const [hoKq, setHoKq] = useState<KetQuaChonHo>({ loai: 'bo_qua' });

  // Tạo thửa mới → xoá ranh nháp cũ để không dính ranh của lần trước.
  useEffect(() => {
    xoaRanhDraft();
  }, [xoaRanhDraft]);

  const diaChiQuery = useQuery({
    queryKey: ['geocode', lat, lng],
    // Cùng key với màn dò thửa nên PHẢI cùng shape — trả nguyên DiaChiGeocode,
    // ghép chuỗi ở chỗ render.
    queryFn: () => reverseGeocode(lat, lng),
    enabled: lat !== 0 && lng !== 0,
    staleTime: 60_000,
  });

  const diaChiMacDinh = diaChiQuery.data ? ghepDiaChi(diaChiQuery.data) : undefined;

  const luu = useMutation({
    mutationFn: async () => {
      // Nông hộ optional — 'bo_qua' trả undefined; 'moi' tạo hộ rồi lấy id.
      const partyId = await giaiQuyetHo(hoKq, { lat, lng, diaChiMacDinh });

      if (ringBanDo.length < 3) throw new Error('Vẽ ít nhất 3 đỉnh ranh thửa trên bản đồ.');
      if (tuCat(ringBanDo)) {
        throw new Error('Ranh bị xoắn — kéo lại đỉnh cho hết cắt chéo.');
      }

      return createPlot({
        partyId,
        boundary: ringBanDo,
        cropName: cayTrong.trim() || undefined,
        // Cây xen: list rỗng = không xen; ChonNhieuCayXen đã dedupe + loại cây chính.
        cropXen: cayXenList.length ? cayXenList : undefined,
        ngayGoc: ngayGoc ? new Date(ngayGoc).toISOString() : undefined,
        note: ghiChu.trim() || undefined,
      });
    },
    onSuccess: (thua) => {
      // Bồi mọi cache list/detail thửa: `do-thua` = dò theo GPS ở tab Đến thửa;
      // `thua-list` = danh sách chung; `thua-by-party` = thửa của một hộ ở màn
      // chi tiết nông hộ. Thiếu 2 key sau ⇒ user vừa tạo xong không thấy hộ.
      qc.invalidateQueries({ queryKey: ['do-thua'] });
      qc.invalidateQueries({ queryKey: ['thua-list'] });
      qc.invalidateQueries({ queryKey: ['thua-by-party'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
      if (thua.partyId) {
        Alert.alert(
          'Đã tạo thửa đất',
          `${thua.id} · ${thua.areaHa} ha. Thửa đang chờ văn phòng duyệt.`,
          [
            {
              text: 'Ghi nhật ký luôn',
              onPress: () =>
                router.replace(
                  `/thua/nhat-ky?plotId=${thua.id}&partyId=${thua.partyId}` as never,
                ),
            },
            { text: 'Xong', onPress: () => router.back() },
          ],
        );
      } else {
        Alert.alert(
          'Đã tạo thửa đất',
          `${thua.id} · ${thua.areaHa} ha. Thửa chưa gán nông hộ — có thể gán ở màn chi tiết.`,
          [
            { text: 'Mở thửa', onPress: () => router.replace(`/thua/${thua.id}` as never) },
            { text: 'Xong', onPress: () => router.back() },
          ],
        );
      }
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const ranhXoan = ringBanDo.length >= 4 && tuCat(ringBanDo);
  const buoc1Xong = ringBanDo.length >= 3 && !ranhXoan;
  const buoc2Xong = hoHopLe(hoKq);

  // Xem trước lịch canh tác từ cây chính + ngày kích hoạt (cùng logic màn chi tiết).
  const lichPreview = useMemo(() => nhanDangCayTrong(cayTrong), [cayTrong]);
  const mocsPreview = useMemo(
    () =>
      lichPreview && ngayGoc ? tinhMocCanhTac(new Date(ngayGoc).toISOString(), lichPreview) : [],
    [lichPreview, ngayGoc],
  );
  const idxPreview = useMemo(() => chiSoMocHienTai(mocsPreview), [mocsPreview]);

  const moManVe = () => router.push(`/thua/ve-ranh?lat=${lat}&lng=${lng}` as never);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: buoc === 1 ? 'Bước 1 · Thửa đất' : 'Bước 2 · Nông hộ' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Thanh tiến trình */}
        <View className="flex-row px-4 pt-3 pb-2 bg-white border-b border-border">
          {([1, 2] as const).map((b) => (
            <View key={b} className="flex-1 flex-row items-center">
              <View
                className={`h-7 w-7 rounded-full items-center justify-center ${
                  buoc >= b ? 'bg-primary' : 'bg-neutral-200'
                }`}
              >
                <Text
                  className={`text-caption font-semibold ${
                    buoc >= b ? 'text-white' : 'text-ink-muted'
                  }`}
                >
                  {b}
                </Text>
              </View>
              <Text
                className={`text-caption ml-2 ${
                  buoc >= b ? 'text-ink font-semibold' : 'text-ink-muted'
                }`}
              >
                {b === 1 ? 'Thửa đất' : 'Nông hộ'}
              </Text>
              {b === 1 ? <View className="flex-1 h-px bg-border mx-2" /> : null}
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {buoc === 1 ? (
            <>
              {/* Ranh thửa trên ảnh vệ tinh */}
              <View className="rounded-card bg-white border border-border p-4 mb-4">
                <Text className="text-caption text-ink-muted uppercase mb-2">
                  Ranh thửa · vẽ trên ảnh vệ tinh
                </Text>

                {ringBanDo.length >= 3 ? (
                  mapPreviewLoi ? (
                    <RanhThuaPreview ring={ringBanDo} />
                  ) : (
                    <BanDoRanh
                      mode="xem"
                      ring={ringBanDo}
                      initialCenter={centroid(ringBanDo)}
                      onMapError={setMapPreviewLoi}
                      height={200}
                    />
                  )
                ) : (
                  <View
                    className="rounded-input border border-dashed border-border bg-bg-soft items-center justify-center"
                    style={{ height: 120 }}
                  >
                    <Ionicons name="map-outline" size={24} color="#9ca3af" />
                    <Text className="text-small text-ink-muted mt-2 px-4 text-center">
                      Chưa có ranh. Bấm nút dưới để mở bản đồ vệ tinh và chạm từng góc thửa.
                    </Text>
                  </View>
                )}

                {ringBanDo.length >= 3 ? (
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-caption text-ink-muted">{ringBanDo.length} đỉnh</Text>
                    <Text className="text-caption text-ink">
                      {areaHa(ringBanDo).toLocaleString('vi-VN')} ha
                    </Text>
                  </View>
                ) : null}

                {ranhXoan ? (
                  <View className="rounded-input bg-red-50 border border-red-200 p-3 mt-3 flex-row">
                    <Ionicons name="warning" size={18} color="#b91c1c" />
                    <Text className="text-small text-red-700 ml-2 flex-1">
                      Ranh bị xoắn — mở bản đồ và kéo lại đỉnh cho hết cắt chéo.
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3">
                  <Button
                    label={ringBanDo.length > 0 ? 'Sửa ranh trên bản đồ' : 'Vẽ ranh trên bản đồ'}
                    onPress={moManVe}
                  />
                </View>
              </View>

              {/* Cây trồng + xen canh */}
              <View className="rounded-card bg-white border border-border p-4 mb-4">
                <ChonCayTrong
                  label="Cây trồng chính"
                  giaTri={cayTrong}
                  onChange={setCayTrong}
                  loaiTru={cayXenList.length ? cayXenList : undefined}
                />

                <View className="mt-3">
                  <ChonNhieuCayXen
                    label="Cây xen (có thể chọn nhiều)"
                    giaTri={cayXenList}
                    onChange={setCayXenList}
                    loaiTru={cayTrong.trim() || undefined}
                  />
                </View>
              </View>

              {/* Ngày kích hoạt + xem trước lịch canh tác */}
              <View className="rounded-card bg-white border border-border p-4 mb-4">
                <DateField
                  label="Ngày kích hoạt / bắt đầu trồng"
                  value={ngayGoc}
                  onChange={setNgayGoc}
                  maximumDate={new Date()}
                />
                <Text className="text-small text-ink-muted -mt-2 mb-3">
                  Lịch canh tác tính từ ngày này. Vườn đã trồng lâu thì chỉnh lại cho đúng.
                </Text>

                <Text className="text-caption text-ink-muted uppercase mb-1">
                  Lịch canh tác (dự kiến)
                </Text>
                {!cayTrong.trim() ? (
                  <Text className="text-caption text-ink-muted">
                    Chọn cây trồng để xem lịch dự kiến.
                  </Text>
                ) : !lichPreview ? (
                  <Text className="text-caption text-ink-muted">
                    Chưa có lịch canh tác cho cây "{cayTrong.trim()}". Vẫn ghi nhật ký bình thường
                    được.
                  </Text>
                ) : !ngayGoc ? (
                  <Text className="text-caption text-amber-800">
                    Chọn ngày kích hoạt để dựng lịch.
                  </Text>
                ) : (
                  <>
                    <TimelineCanhTac mocs={mocsPreview} hienTai={idxPreview} />
                    <Text className="text-small text-ink-muted mt-2">
                      Lịch dự kiến từ ngày kích hoạt. Xác nhận từng mốc ở màn chi tiết sau khi tạo
                      thửa.
                    </Text>
                  </>
                )}
              </View>

              {/* Ghi chú */}
              <View className="rounded-card bg-white border border-border p-4 mb-4">
                <Input
                  label="Ghi chú"
                  placeholder="Đặc điểm nhận biết, đường vào…"
                  multiline
                  numberOfLines={3}
                  value={ghiChu}
                  onChangeText={setGhiChu}
                />
              </View>
            </>
          ) : (
            <>
              <View className="mb-3">
                <Text className="text-caption text-ink-muted">
                  Gán nông hộ cho thửa, hoặc bỏ qua để gán sau.
                </Text>
              </View>
              <ChonNongHo
                giaTri={hoKq}
                onChange={setHoKq}
                choBoQua
                diaChiMacDinh={diaChiMacDinh}
              />
            </>
          )}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          {buoc === 2 ? (
            <View className="flex-1">
              <Button label="Quay lại" variant="secondary" onPress={() => setBuoc(1)} />
            </View>
          ) : null}
          <View className="flex-1">
            {buoc === 1 ? (
              <Button label="Tiếp tục" disabled={!buoc1Xong} onPress={() => setBuoc(2)} />
            ) : (
              <Button
                label="Lưu thửa đất"
                loading={luu.isPending}
                disabled={!buoc2Xong || luu.isPending}
                onPress={() => luu.mutate()}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
