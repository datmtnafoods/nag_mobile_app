import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createParty, searchParties } from '../../src/api/erp/parties';
import { createPlot } from '../../src/api/erp/growing-areas';
import { reverseGeocode, ghepDiaChi } from '../../src/api/erp/geocode';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DateField } from '../../src/components/DateField';
import { EmptyState } from '../../src/components/EmptyState';
import { DiaChiField } from '../../src/features/location/components/DiaChiField';
import { DienTichInput } from '../../src/features/den-thua/components/DienTichInput';
import {
  doiRaM2,
  khoangCachM,
  oVuongTuDiem,
  tuCat,
  type DonViDienTich,
  type Ring,
} from '../../src/features/den-thua/geo';
import { RanhThuaPreview } from '../../src/features/den-thua/components/RanhThuaPreview';

/** Cùng ngưỡng với màn dò thửa — ghim đỉnh lệch quá mức thì cả ranh vô nghĩa. */
const NGUONG_SAI_SO_M = 50;
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import type { Party } from '../../src/features/orders/types';

const PHONE_RE = /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/;

export default function TaoThua() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const qc = useQueryClient();

  const [buoc, setBuoc] = useState<1 | 2>(1);

  // Toạ độ ghim — nhận từ màn dò, cho phép đo lại tại chỗ.
  const [lat, setLat] = useState(Number(params.lat) || 0);
  const [lng, setLng] = useState(Number(params.lng) || 0);
  const { state: gpsState, layViTri } = useDeviceLocation({
    accuracy: Location.Accuracy.High,
    timeoutMs: 15000,
  });

  // ─ Bước 1: nông hộ
  const [hoDaChon, setHoDaChon] = useState<Party | null>(null);
  const [taoHoMoi, setTaoHoMoi] = useState(false);
  const [tim, setTim] = useState('');
  const [tenHo, setTenHo] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [loiHo, setLoiHo] = useState<string | null>(null);

  // ─ Bước 2: thửa đất
  /**
   * 'ghim_goc' = KTV đi từng góc bấm ghim, ranh thật.
   * 'nhanh'    = ghim 1 điểm + khai diện tích, app sinh ô vuông — lối thoát cho
   *              vườn rậm/có hàng rào/KTV vội. Ranh chỉ là ước lượng.
   */
  const [cheDo, setCheDo] = useState<'ghim_goc' | 'nhanh'>('ghim_goc');
  const [dinh, setDinh] = useState<Array<{ lat: number; lng: number; saiSo?: number }>>([]);
  const [loiGhim, setLoiGhim] = useState<string | null>(null);
  const [dangGhim, setDangGhim] = useState(false);

  const [dienTich, setDienTich] = useState(3);
  const [donVi, setDonVi] = useState<DonViDienTich>('sao');
  const [cayTrong, setCayTrong] = useState('');
  // Mốc gốc của timeline canh tác. Mặc định hôm nay, nhưng vườn đã trồng lâu thì
  // KTV phải chỉnh lại — không thì lịch lệch cả năm.
  const [ngayGoc, setNgayGoc] = useState<string | undefined>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [ghiChu, setGhiChu] = useState('');

  const timQuery = useQuery({
    queryKey: ['parties', 'search', tim],
    queryFn: () => searchParties(tim),
    enabled: tim.trim().length >= 2 && !taoHoMoi,
  });

  const diaChiQuery = useQuery({
    queryKey: ['geocode', lat, lng],
    queryFn: async () => ghepDiaChi(await reverseGeocode(lat, lng)),
    enabled: lat !== 0 && lng !== 0,
    staleTime: 60_000,
  });

  const luu = useMutation({
    mutationFn: async () => {
      let partyId = hoDaChon?.id;

      if (!partyId) {
        const ten = tenHo.trim();
        if (ten.length < 2) throw new Error('Nhập họ tên nông hộ (tối thiểu 2 ký tự).');
        const phone = sdt.trim();
        if (phone && !PHONE_RE.test(phone)) throw new Error('Số điện thoại không hợp lệ.');
        const ho = await createParty({
          name: ten,
          phone: phone || undefined,
          address: diaChi.trim() || diaChiQuery.data || undefined,
          lat,
          lng,
          kind: 'household',
        });
        partyId = ho.id;
      }

      let boundary: Ring;
      let note = ghiChu.trim();

      if (cheDo === 'ghim_goc') {
        if (dinh.length < 3) throw new Error('Cần ít nhất 3 góc để tạo ranh thửa.');
        boundary = dinh.map((d) => [d.lng, d.lat] as [number, number]);
        if (tuCat(boundary)) {
          throw new Error('Ranh bị xoắn — kiểm tra lại thứ tự các góc đã ghim.');
        }
      } else {
        const m2 = doiRaM2(dienTich, donVi);
        if (!(m2 > 0)) throw new Error('Nhập diện tích lớn hơn 0.');
        boundary = oVuongTuDiem(lat, lng, m2);
        // Backend không có cột đánh dấu chất lượng ranh — dùng tiền tố trong
        // `note` để văn phòng lọc ra thửa cần đo lại. Khi backend thêm cột
        // `ranhChinhXac` thì migrate theo tiền tố này.
        const nhan = `[Ranh ước lượng: ghim 1 điểm, khai ${dienTich} ${donVi === 'sao' ? 'sào' : donVi === 'ha' ? 'ha' : 'm²'}]`;
        note = note ? `${nhan} ${note}` : nhan;
      }

      return createPlot({
        partyId,
        boundary,
        cropName: cayTrong.trim() || undefined,
        ngayGoc: ngayGoc ? new Date(ngayGoc).toISOString() : undefined,
        note: note || undefined,
      });
    },
    onSuccess: (thua) => {
      qc.invalidateQueries({ queryKey: ['do-thua'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
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
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const coToaDo = lat !== 0 && lng !== 0;
  const buoc1Xong = Boolean(hoDaChon) || (taoHoMoi && tenHo.trim().length >= 2);

  const ring: Ring = dinh.map((d) => [d.lng, d.lat] as [number, number]);
  const ranhXoan = dinh.length >= 4 && tuCat(ring);
  const buoc2Xong =
    cheDo === 'ghim_goc' ? dinh.length >= 3 && !ranhXoan : coToaDo && dienTich > 0;

  const doLaiViTri = async () => {
    const vt = await layViTri();
    if (vt) {
      setLat(vt.lat);
      setLng(vt.lng);
    }
  };

  /**
   * Ghim một góc thửa. Chặn khi GPS kém — đỉnh lệch 100 m thì cả thửa sai, thà
   * bắt KTV đợi vài giây còn hơn lưu ranh vô nghĩa.
   */
  const ghimGoc = async () => {
    setLoiGhim(null);
    setDangGhim(true);
    try {
      const vt = await layViTri();
      if (!vt) {
        setLoiGhim('Chưa lấy được vị trí. Ra chỗ thoáng rồi thử lại.');
        return;
      }
      if (vt.doChinhXac != null && vt.doChinhXac > NGUONG_SAI_SO_M) {
        setLoiGhim(
          `Sai số ±${Math.round(vt.doChinhXac)} m, quá lớn để ghim góc. Đợi vài giây hoặc ra chỗ thoáng.`,
        );
        return;
      }
      const truoc = dinh[dinh.length - 1];
      if (truoc && khoangCachM(truoc, vt) < 5) {
        setLoiGhim('Góc này quá gần góc trước (dưới 5 m) — đã đi tới góc kế chưa?');
        return;
      }
      setDinh((ds) => [...ds, { lat: vt.lat, lng: vt.lng, saiSo: vt.doChinhXac }]);
      // Đỉnh đầu cũng là điểm neo cho geocode + cho chế độ nhanh nếu đổi qua.
      if (dinh.length === 0) {
        setLat(vt.lat);
        setLng(vt.lng);
      }
    } finally {
      setDangGhim(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: buoc === 1 ? 'Bước 1 · Nông hộ' : 'Bước 2 · Thửa đất' }} />
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
                {b === 1 ? 'Nông hộ' : 'Thửa đất'}
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
              {hoDaChon ? (
                <View className="rounded-card bg-green-100 border border-green-300 p-4 mb-4">
                  <View className="flex-row items-start">
                    <Ionicons name="checkmark-circle" size={20} color="#166534" />
                    <View className="ml-2 flex-1">
                      <Text className="text-body text-green-900 font-semibold">
                        {hoDaChon.name}
                      </Text>
                      {hoDaChon.phones[0] ? (
                        <Text className="text-caption text-green-800">{hoDaChon.phones[0]}</Text>
                      ) : null}
                      {hoDaChon.address ? (
                        <Text className="text-small text-green-800 mt-0.5">
                          {hoDaChon.address}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => setHoDaChon(null)} hitSlop={8} className="p-1">
                      <Ionicons name="close-circle" size={20} color="#166534" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View className="flex-row mb-3">
                    <Pressable
                      onPress={() => setTaoHoMoi(false)}
                      className={`flex-1 h-11 rounded-input items-center justify-center border mr-2 ${
                        !taoHoMoi ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      <Text
                        className={`text-caption font-semibold ${
                          !taoHoMoi ? 'text-white' : 'text-ink'
                        }`}
                      >
                        Hộ đã có
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTaoHoMoi(true)}
                      className={`flex-1 h-11 rounded-input items-center justify-center border ${
                        taoHoMoi ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      <Text
                        className={`text-caption font-semibold ${
                          taoHoMoi ? 'text-white' : 'text-ink'
                        }`}
                      >
                        Hộ mới
                      </Text>
                    </Pressable>
                  </View>

                  {taoHoMoi ? (
                    <View className="rounded-card bg-white border border-border p-4">
                      <Input
                        label="Họ và tên *"
                        placeholder="Nguyễn Văn A"
                        autoCapitalize="words"
                        value={tenHo}
                        onChangeText={(v) => {
                          setTenHo(v);
                          setLoiHo(null);
                        }}
                      />
                      <Input
                        label="Số điện thoại"
                        placeholder="0912xxxxxx"
                        keyboardType="phone-pad"
                        value={sdt}
                        onChangeText={(v) => {
                          setSdt(v);
                          setLoiHo(null);
                        }}
                        error={
                          sdt.trim() && !PHONE_RE.test(sdt.trim())
                            ? 'Số điện thoại không hợp lệ'
                            : undefined
                        }
                      />
                      <DiaChiField
                        value={diaChi}
                        onChangeText={setDiaChi}
                        placeholder={diaChiQuery.data ?? 'Thôn, xã, tỉnh'}
                      />
                      {loiHo ? (
                        <Text className="text-small text-red-600">{loiHo}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <>
                      <Input
                        placeholder="Tìm theo tên hoặc số điện thoại…"
                        leftIcon="search-outline"
                        value={tim}
                        onChangeText={setTim}
                        autoCapitalize="none"
                      />
                      {tim.trim().length < 2 ? (
                        <Text className="text-caption text-ink-muted text-center py-6">
                          Gõ ít nhất 2 ký tự để tìm.
                        </Text>
                      ) : timQuery.isPending ? (
                        <ActivityIndicator color="#dd1c2e" style={{ marginTop: 16 }} />
                      ) : (timQuery.data ?? []).length === 0 ? (
                        <EmptyState
                          icon="person-outline"
                          title="Không tìm thấy hộ"
                          message="Thử số điện thoại, hoặc chuyển sang tạo hộ mới."
                          cta={{ label: 'Tạo hộ mới', onPress: () => setTaoHoMoi(true) }}
                        />
                      ) : (
                        (timQuery.data ?? []).map((p) => (
                          <Pressable
                            key={p.id}
                            onPress={() => setHoDaChon(p)}
                            className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
                          >
                            <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                              <Ionicons name="person" size={18} color="#dd1c2e" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-body text-ink font-semibold">{p.name}</Text>
                              <Text className="text-caption text-ink-muted">
                                {p.phones[0] ?? 'Chưa có SĐT'}
                                {p.address ? ` · ${p.address}` : ''}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                          </Pressable>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Chọn cách lấy ranh */}
              <View className="flex-row mb-3">
                <Pressable
                  onPress={() => setCheDo('ghim_goc')}
                  className={`flex-1 h-11 rounded-input items-center justify-center border mr-2 ${
                    cheDo === 'ghim_goc' ? 'bg-primary border-primary' : 'bg-white border-border'
                  }`}
                >
                  <Text
                    className={`text-caption font-semibold ${
                      cheDo === 'ghim_goc' ? 'text-white' : 'text-ink'
                    }`}
                  >
                    Ghim từng góc
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCheDo('nhanh')}
                  className={`flex-1 h-11 rounded-input items-center justify-center border ${
                    cheDo === 'nhanh' ? 'bg-primary border-primary' : 'bg-white border-border'
                  }`}
                >
                  <Text
                    className={`text-caption font-semibold ${
                      cheDo === 'nhanh' ? 'text-white' : 'text-ink'
                    }`}
                  >
                    Nhanh (ước lượng)
                  </Text>
                </Pressable>
              </View>

              {cheDo === 'ghim_goc' ? (
                <View className="rounded-card bg-white border border-border p-4 mb-4">
                  <Text className="text-caption text-ink-muted uppercase mb-2">Ranh thửa</Text>

                  <RanhThuaPreview ring={ring} />

                  {ranhXoan ? (
                    <View className="rounded-input bg-red-50 border border-red-200 p-3 mt-3 flex-row">
                      <Ionicons name="warning" size={18} color="#b91c1c" />
                      <Text className="text-small text-red-700 ml-2 flex-1">
                        Ranh bị xoắn — có thể ghim nhầm thứ tự góc. Đi theo vòng quanh thửa,
                        đừng nhảy chéo sang góc đối diện.
                      </Text>
                    </View>
                  ) : null}

                  <View className="mt-3">
                    <Button
                      label={
                        dangGhim || gpsState === 'dang-lay'
                          ? 'Đang đo vị trí…'
                          : `Ghim góc ${dinh.length + 1}`
                      }
                      loading={dangGhim || gpsState === 'dang-lay'}
                      disabled={dangGhim || gpsState === 'dang-lay'}
                      onPress={ghimGoc}
                    />
                  </View>

                  {loiGhim ? (
                    <Text className="text-small text-amber-800 mt-2">{loiGhim}</Text>
                  ) : (
                    <Text className="text-small text-ink-muted mt-2">
                      Đi tới từng góc vườn rồi bấm. Cần ít nhất 3 góc.
                    </Text>
                  )}

                  {dinh.length > 0 ? (
                    <View className="mt-3 pt-3 border-t border-border">
                      {dinh.map((d, i) => (
                        <View
                          key={`${d.lat}-${d.lng}-${i}`}
                          className="flex-row items-center py-1.5"
                        >
                          <View className="h-6 w-6 rounded-full bg-primary items-center justify-center mr-2">
                            <Text className="text-small text-white font-semibold">{i + 1}</Text>
                          </View>
                          <Text className="text-caption text-ink font-mono flex-1">
                            {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
                            {d.saiSo != null ? ` · ±${Math.round(d.saiSo)} m` : ''}
                          </Text>
                          <Pressable
                            onPress={() => setDinh((ds) => ds.filter((_, j) => j !== i))}
                            hitSlop={8}
                            className="p-1"
                            accessibilityRole="button"
                            accessibilityLabel={`Xoá góc ${i + 1}`}
                          >
                            <Ionicons name="close-circle" size={18} color="#b91c1c" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <>
                  {/* Toạ độ ghim */}
                  <View className="rounded-card bg-white border border-border p-4 mb-4">
                    <Text className="text-caption text-ink-muted uppercase mb-2">Điểm ghim</Text>
                    {coToaDo ? (
                      <>
                        <Text className="text-body text-ink font-mono">
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                        </Text>
                        {diaChiQuery.data ? (
                          <Text className="text-caption text-ink-muted mt-1">
                            {diaChiQuery.data}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text className="text-caption text-amber-800">Chưa có toạ độ.</Text>
                    )}
                    <View className="mt-3">
                      <Button
                        label={gpsState === 'dang-lay' ? 'Đang đo…' : 'Đo lại tại chỗ'}
                        variant="secondary"
                        disabled={gpsState === 'dang-lay'}
                        onPress={doLaiViTri}
                      />
                    </View>
                  </View>

                  <View className="rounded-card bg-white border border-border p-4 mb-4">
                    <DienTichInput
                      soLuong={dienTich}
                      donVi={donVi}
                      onChange={({ soLuong, donVi: dv }) => {
                        setDienTich(soLuong);
                        setDonVi(dv);
                      }}
                    />
                  </View>
                </>
              )}

              <View className="rounded-card bg-white border border-border p-4 mb-4">
                <Input
                  label="Cây trồng"
                  placeholder="Chanh leo tím / Cà phê / Bơ…"
                  value={cayTrong}
                  onChangeText={setCayTrong}
                />
                <DateField
                  label="Ngày kích hoạt / bắt đầu trồng"
                  value={ngayGoc}
                  onChange={setNgayGoc}
                  maximumDate={new Date()}
                />
                <Text className="text-small text-ink-muted -mt-2 mb-3">
                  Lịch canh tác tính từ ngày này. Vườn đã trồng lâu thì chỉnh lại cho đúng.
                </Text>
                <Input
                  label="Ghi chú"
                  placeholder="Đặc điểm nhận biết, đường vào…"
                  multiline
                  numberOfLines={3}
                  value={ghiChu}
                  onChangeText={setGhiChu}
                />
              </View>

              {cheDo === 'nhanh' ? (
                <View className="rounded-card bg-amber-50 border border-amber-200 p-3 flex-row">
                  <Ionicons name="information-circle-outline" size={18} color="#92400e" />
                  <Text className="text-small text-amber-900 ml-2 flex-1">
                    Ranh thửa là ô vuông ước lượng quanh điểm ghim, không phải ranh đo đạc.
                    Thửa sẽ được đánh dấu để văn phòng biết cần đo lại.
                  </Text>
                </View>
              ) : null}
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
              <Button
                label="Tiếp tục"
                disabled={!buoc1Xong}
                onPress={() => setBuoc(2)}
              />
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
