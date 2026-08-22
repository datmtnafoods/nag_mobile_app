import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { getLichCay, listLichCay, luuLichCay, xoaLichCay } from '../../../src/api/erp/lich-cay';
import { apiErrorMessage } from '../../../src/api/client';
import { useNumericInput } from '../../../src/hooks/useNumericInput';
import { TimelineCanhTac } from '../../../src/features/den-thua/components/TimelineCanhTac';
import {
  tinhMocCanhTac,
  chiSoMocHienTai,
} from '../../../src/features/den-thua/lich-canh-tac';
import { MauLichSheet, type MauLich } from '../../../src/features/den-thua/components/MauLichSheet';
import { ACCENT_LOAI } from '../../../src/features/den-thua/giai-doan';
import { ACCENT } from '../../../src/theme/tokens';
import type { LichCayTrong, LoaiMoc, MocLich } from '../../../src/features/den-thua/types';

/**
 * Sửa / tạo lịch canh tác chuẩn cho MỘT LOẠI CÂY. Lịch áp cho MỌI thửa trồng
 * cây khớp `tuKhoa`. Trước đây lịch là hằng hardcode; nay KTV chỉnh được — vẫn
 * giữ nguyên tắc "không bịa mốc": lịch mới bắt đầu bằng danh sách rỗng.
 *
 * Route:
 *   /thua/lich-cay/[cayId]?tenGoiY=<cropName>
 * Params:
 *   - `cayId`: id lịch (slug). Có trong store → sửa; không có → tạo mới.
 *   - `tenGoiY`: khi tạo mới, dùng làm nhãn + đưa vào `tuKhoa[0]` mặc định để
 *     lịch mới tự khớp thửa vừa "Tạo lịch cây" từ.
 *
 * UX (đợt 6, gọn lại theo feedback KTV):
 *   - Mỗi mốc = 1 hàng nén (dot màu + nhãn + "T+N tháng · Lứa X"); tap sửa.
 *   - Sheet Modal thêm/sửa 1 mốc: 5 chip preset auto điền nhãn/loại/lứa —
 *     chỉ 2 field chính (nhãn + tháng), lứa chỉ hiện khi thu_hoach.
 *   - Từ khoá nhận diện + Chu kỳ lặp lứa ẩn trong "Cài đặt nâng cao" collapse.
 */

type MocSoan = MocLich & { key: string };

type SheetMoc = {
  /** undefined = mốc mới; có key = sửa. */
  key?: string;
  nhan: string;
  loai: LoaiMoc;
  thang: number;
  lua?: number;
};

function keyMoi(): string {
  return `m_${Math.floor(Math.random() * 1e9)}`;
}

/** 5 preset gợi ý cho sheet — auto điền nhãn/loại; lứa auto luaMax+1 khi thu_hoach. */
const PRESET_MOC: Array<{ loai: LoaiMoc; nhan: string; goiYThang?: number }> = [
  { loai: 'kich_hoat', nhan: 'Kích hoạt', goiYThang: 0 },
  { loai: 'kien_thiet', nhan: 'Kiến thiết', goiYThang: 0 },
  { loai: 'lam_bong', nhan: 'Làm bông' },
  { loai: 'di_canh', nhan: 'Đi cành' },
  { loai: 'thu_hoach', nhan: 'Thu hoạch lứa' },
];

export default function ManHinhLichCay() {
  const params = useLocalSearchParams<{ cayId?: string; tenGoiY?: string }>();
  const cayId = typeof params.cayId === 'string' ? params.cayId : '';
  const tenGoiY = typeof params.tenGoiY === 'string' ? params.tenGoiY : '';
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['lich-cay', cayId],
    queryFn: () => getLichCay(cayId),
    enabled: Boolean(cayId),
  });
  // Danh sách lịch cây đã có — nguồn cho sheet "Chọn mẫu" (sao chép).
  const dsQuery = useQuery({ queryKey: ['lich-cay'], queryFn: listLichCay });

  const [nhan, setNhan] = useState('');
  const [tuKhoaText, setTuKhoaText] = useState('');
  const [mocs, setMocs] = useState<MocSoan[]>([]);
  const [coChuKy, setCoChuKy] = useState(false);
  const [thangDiCanh, setThangDiCanh] = useState(0);
  const [thangThuHoach, setThangThuHoach] = useState(0);
  const [soLuaToiDa, setSoLuaToiDa] = useState(1);
  const [daNap, setDaNap] = useState(false);

  // Sheet Thêm / Sửa 1 mốc.
  const [sheetMoc, setSheetMoc] = useState<SheetMoc | null>(null);
  // Cài đặt nâng cao (từ khoá + chu kỳ) — mặc định thu.
  const [nangCaoMo, setNangCaoMo] = useState(false);
  // Sheet chọn mẫu — prefill mốc từ lịch cây khác / bắt đầu tối thiểu.
  const [mauMo, setMauMo] = useState(false);

  // Nạp giá trị vào form 1 lần: từ store nếu có; nếu không, khởi tạo với tên
  // gợi ý (từ CTA "Tạo lịch cây" của màn chi tiết thửa).
  useEffect(() => {
    if (daNap) return;
    // Chưa gọi query xong → chờ.
    if (cayId && q.isPending) return;
    const lich = q.data ?? null;
    if (lich) {
      setNhan(lich.nhan);
      setTuKhoaText(lich.tuKhoa.join(', '));
      setMocs(lich.mocDau.map((m) => ({ ...m, key: keyMoi() })));
      if (lich.chuKy) {
        setCoChuKy(true);
        setThangDiCanh(lich.chuKy.thangDiCanh);
        setThangThuHoach(lich.chuKy.thangThuHoach);
        setSoLuaToiDa(lich.soLuaToiDa ?? 1);
      }
    } else {
      // Lịch mới — khởi tạo tối thiểu để KTV nhìn có gì.
      const ten = tenGoiY.trim();
      setNhan(ten || 'Cây mới');
      setTuKhoaText(ten);
      setMocs([{ key: keyMoi(), loai: 'kich_hoat', nhan: 'Kích hoạt', thang: 0 }]);
    }
    setDaNap(true);
  }, [q.isPending, q.data, cayId, tenGoiY, daNap]);

  const diCanhInput = useNumericInput(thangDiCanh, setThangDiCanh, { min: 0, maxDecimals: 0 });
  const thuHoachInput = useNumericInput(thangThuHoach, setThangThuHoach, {
    min: 0,
    maxDecimals: 0,
  });
  const soLuaInput = useNumericInput(
    soLuaToiDa,
    (n) => setSoLuaToiDa(Math.max(1, Math.min(20, n))),
    { min: 1, maxDecimals: 0 },
  );

  const dungLich: LichCayTrong = useMemo(
    () => ({
      id: cayId || 'moi',
      nhan: nhan.trim() || 'Cây',
      tuKhoa: tuKhoaText
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      mocDau: mocs.map(({ key: _k, ...m }) => m),
      chuKy: coChuKy ? { thangDiCanh, thangThuHoach } : undefined,
      soLuaToiDa: coChuKy ? soLuaToiDa : undefined,
    }),
    [cayId, nhan, tuKhoaText, mocs, coChuKy, thangDiCanh, thangThuHoach, soLuaToiDa],
  );

  // Preview tính từ HÔM NAY để KTV dễ hình dung khoảng cách giữa các mốc.
  const mocsPreview = useMemo(() => {
    if (mocs.length === 0) return [];
    return tinhMocCanhTac(new Date().toISOString(), dungLich);
  }, [dungLich, mocs.length]);
  const idxPreview = useMemo(() => chiSoMocHienTai(mocsPreview), [mocsPreview]);

  const luaMax = useMemo(
    () => mocs.reduce((m, x) => Math.max(m, x.lua ?? 0), 0),
    [mocs],
  );

  // Áp mẫu từ sheet: thay danh sách mốc + chu kỳ (giữ tên/từ khoá của cây đang sửa).
  const apMau = (mau: MauLich) => {
    setMocs(mau.mocDau.map((m) => ({ ...m, key: keyMoi() })));
    if (mau.chuKy) {
      setCoChuKy(true);
      setThangDiCanh(mau.chuKy.thangDiCanh);
      setThangThuHoach(mau.chuKy.thangThuHoach);
      setSoLuaToiDa(mau.soLuaToiDa ?? 1);
    } else {
      setCoChuKy(false);
    }
    setMauMo(false);
  };

  const moThemMoc = () => {
    // Gợi ý mốc kế theo bối cảnh: chưa có mốc → Kích hoạt; đã có → Thu hoạch lứa kế.
    if (mocs.length === 0) {
      setSheetMoc({ nhan: 'Kích hoạt', loai: 'kich_hoat', thang: 0 });
    } else {
      const luaKe = luaMax + 1;
      setSheetMoc({
        nhan: `Thu hoạch lứa ${luaKe}`,
        loai: 'thu_hoach',
        thang: 0,
        lua: luaKe,
      });
    }
  };

  const moSuaMoc = (m: MocSoan) => {
    setSheetMoc({ key: m.key, nhan: m.nhan, loai: m.loai, thang: m.thang, lua: m.lua });
  };

  const dongSheet = () => setSheetMoc(null);

  const luuMocSheet = (v: SheetMoc) => {
    if (!v.nhan.trim()) {
      Alert.alert('Chưa đủ', 'Nhập nhãn cho mốc.');
      return;
    }
    if (!Number.isFinite(v.thang) || v.thang < 0) {
      Alert.alert('Chưa đủ', 'Tháng phải ≥ 0.');
      return;
    }
    if (v.loai === 'thu_hoach' && (!v.lua || v.lua < 1)) {
      Alert.alert('Chưa đủ', 'Thu hoạch phải có số lứa (≥ 1).');
      return;
    }
    const clean: MocLich = {
      loai: v.loai,
      nhan: v.nhan.trim(),
      thang: Math.floor(v.thang),
      lua: v.loai === 'thu_hoach' ? v.lua : undefined,
    };
    setMocs((prev) => {
      if (v.key) {
        return prev.map((m) => (m.key === v.key ? { ...m, ...clean } : m));
      }
      return [...prev, { key: keyMoi(), ...clean }];
    });
    dongSheet();
  };

  const askXoaMoc = (m: MocSoan) => {
    Alert.alert('Xoá mốc?', `Xoá "${m.nhan}" khỏi lịch — không hoàn tác được.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => setMocs((prev) => prev.filter((x) => x.key !== m.key)),
      },
    ]);
  };

  const luu = useMutation({
    mutationFn: async () => {
      if (!dungLich.tuKhoa.length) throw new Error('Nhập ít nhất 1 từ khoá nhận diện cây (mục Cài đặt nâng cao).');
      if (!mocs.length) throw new Error('Thêm ít nhất 1 mốc trong lịch.');
      for (const m of mocs) {
        if (!m.nhan.trim()) throw new Error('Mỗi mốc phải có nhãn.');
        if (!Number.isFinite(m.thang) || m.thang < 0) {
          throw new Error(`Mốc "${m.nhan}" có tháng không hợp lệ.`);
        }
      }
      if (coChuKy) {
        if (thangThuHoach <= 0) throw new Error('Chu kỳ thu hoạch phải lớn hơn 0 tháng.');
        if (thangDiCanh < 0) throw new Error('Chu kỳ đi cành không âm.');
        if (!mocs.some((m) => m.loai === 'thu_hoach')) {
          throw new Error('Có chu kỳ lặp lứa nhưng chưa có mốc "Thu hoạch" nào để neo.');
        }
      }
      // Sort theo tháng trước khi lưu để timeline hiển thị đúng thứ tự.
      const mocDau = [...mocs]
        .sort((a, b) => a.thang - b.thang)
        .map(({ key: _k, ...m }) => m);
      return luuLichCay({ ...dungLich, mocDau });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lich-cay'] });
      qc.invalidateQueries({ queryKey: ['lich-cay', cayId] });
      Alert.alert('Đã lưu lịch', 'Áp dụng cho mọi thửa trồng cây này.', [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const xoa = useMutation({
    mutationFn: () => xoaLichCay(cayId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lich-cay'] });
      router.back();
    },
    onError: (err) => Alert.alert('Chưa xoá được', apiErrorMessage(err)),
  });

  const daCoLich = Boolean(q.data);

  if (cayId && q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }

  const mocsHienThi = [...mocs].sort((a, b) => a.thang - b.thang);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: daCoLich ? `Lịch ${q.data!.nhan}` : 'Tạo lịch cây' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cảnh báo phạm vi ảnh hưởng */}
          <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mb-4 flex-row">
            <Ionicons name="warning-outline" size={18} color="#92400e" />
            <Text className="text-small text-amber-900 ml-2 flex-1">
              Lịch này áp cho <Text className="font-semibold">mọi thửa</Text> trồng cây khớp từ
              khoá. Sửa mốc = timeline mọi thửa thay theo; ngày thực tế đã xác nhận không mất.
            </Text>
          </View>

          {/* Tên hiển thị — 1 field duy nhất ở cấp trên. */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Input
              label="Tên cây *"
              placeholder="VD: Chanh leo, Cà phê Robusta…"
              value={nhan}
              onChangeText={setNhan}
            />
          </View>

          {/* Danh sách mốc — list chip nén 1 hàng/mốc. */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-caption text-ink-muted uppercase">
                Mốc trong lịch ({mocs.length})
              </Text>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setMauMo(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn mẫu lịch"
                  hitSlop={8}
                  className="min-h-[36px] px-3 flex-row items-center rounded-input bg-white border border-border mr-2"
                >
                  <Ionicons name="copy-outline" size={16} color="#6b7280" />
                  <Text className="text-caption text-ink-muted font-semibold ml-1">Chọn mẫu</Text>
                </Pressable>
                <Pressable
                  onPress={moThemMoc}
                  accessibilityRole="button"
                  accessibilityLabel="Thêm mốc"
                  hitSlop={8}
                  className="min-h-[36px] px-3 flex-row items-center rounded-input bg-primary-50 border border-primary"
                >
                  <Ionicons name="add" size={16} color="#dd1c2e" />
                  <Text className="text-caption text-primary font-semibold ml-1">Thêm mốc</Text>
                </Pressable>
              </View>
            </View>

            {mocsHienThi.length === 0 ? (
              <Text className="text-caption text-ink-muted mt-2">
                Chưa có mốc nào. Bấm "Thêm mốc" để bắt đầu.
              </Text>
            ) : (
              mocsHienThi.map((m) => (
                <RowMocNen
                  key={m.key}
                  moc={m}
                  onSua={() => moSuaMoc(m)}
                  onXoa={() => askXoaMoc(m)}
                />
              ))
            )}
          </View>

          {/* Cài đặt nâng cao — collapse, mặc định thu. Chứa từ khoá + chu kỳ. */}
          <View className="rounded-card bg-white border border-border mb-4">
            <Pressable
              onPress={() => setNangCaoMo((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={nangCaoMo ? 'Thu gọn cài đặt nâng cao' : 'Mở cài đặt nâng cao'}
              accessibilityState={{ expanded: nangCaoMo }}
              className="flex-row items-center p-4"
            >
              <Ionicons name="options-outline" size={18} color="#6b7280" />
              <Text className="text-caption text-ink-muted uppercase flex-1 ml-2">
                Cài đặt nâng cao
              </Text>
              <Ionicons
                name={nangCaoMo ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#6b7280"
              />
            </Pressable>

            {nangCaoMo ? (
              <View className="px-4 pb-4">
                <Input
                  label="Từ khoá nhận diện cây trồng *"
                  placeholder="chanh leo, chanh day, passion"
                  value={tuKhoaText}
                  onChangeText={setTuKhoaText}
                  autoCapitalize="none"
                />
                <Text className="text-small text-ink-muted mb-3">
                  Ngăn cách bằng dấu phẩy. So khớp không phân biệt hoa/thường.
                </Text>

                <View className="border-t border-border pt-3">
                  <Pressable
                    onPress={() => setCoChuKy((v) => !v)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: coChuKy }}
                    className="flex-row items-center py-2"
                    hitSlop={6}
                  >
                    <View
                      className={`h-6 w-6 rounded-input items-center justify-center border mr-2 ${
                        coChuKy ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      {coChuKy ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                    </View>
                    <Text className="text-body text-ink flex-1">
                      Cây thu nhiều lứa — tự sinh "Đi cành / Thu lứa N"
                    </Text>
                  </Pressable>

                  {coChuKy ? (
                    <View className="mt-2">
                      <View className="flex-row">
                        <View className="flex-1 mr-2">
                          <Input
                            label="Đi cành sau (tháng)"
                            keyboardType="numeric"
                            value={diCanhInput.value}
                            onChangeText={diCanhInput.onChangeText}
                            onBlur={diCanhInput.onBlur}
                          />
                        </View>
                        <View className="flex-1 mr-2">
                          <Input
                            label="Thu lứa kế (tháng)"
                            keyboardType="numeric"
                            value={thuHoachInput.value}
                            onChangeText={thuHoachInput.onChangeText}
                            onBlur={thuHoachInput.onBlur}
                          />
                        </View>
                        <View style={{ width: 90 }}>
                          <Input
                            label="Tối đa lứa"
                            keyboardType="numeric"
                            value={soLuaInput.value}
                            onChangeText={soLuaInput.onChangeText}
                            onBlur={soLuaInput.onBlur}
                          />
                        </View>
                      </View>
                      <Text className="text-small text-ink-muted mt-1">
                        Neo từ mốc "Thu hoạch" cuối trong danh sách.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {/* Preview timeline */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted uppercase mb-2">
              Xem trước (tính từ hôm nay)
            </Text>
            {mocsPreview.length === 0 ? (
              <Text className="text-caption text-ink-muted">
                Thêm mốc để xem trước timeline.
              </Text>
            ) : (
              <TimelineCanhTac mocs={mocsPreview} hienTai={idxPreview} />
            )}
          </View>

          {daCoLich ? (
            <View className="mt-2">
              <Button
                label="Xoá lịch này"
                variant="danger"
                loading={xoa.isPending}
                onPress={() =>
                  Alert.alert(
                    'Xoá lịch?',
                    `Sau khi xoá, các thửa trồng "${q.data!.nhan}" sẽ không còn timeline (vẫn ghi nhật ký bình thường).`,
                    [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Xoá', style: 'destructive', onPress: () => xoa.mutate() },
                    ],
                  )
                }
              />
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={daCoLich ? 'Lưu thay đổi' : 'Tạo lịch cây'}
            loading={luu.isPending}
            disabled={luu.isPending || mocs.length === 0}
            onPress={() => luu.mutate()}
          />
        </View>
      </KeyboardAvoidingView>

      <MocSheet
        gia={sheetMoc}
        luaKeMacDinh={luaMax + 1}
        onLuu={luuMocSheet}
        onDong={dongSheet}
      />

      {/* Chọn mẫu — sao chép mốc từ lịch cây khác (bỏ chính cây đang sửa). */}
      <MauLichSheet
        visible={mauMo}
        onClose={() => setMauMo(false)}
        dsLich={dsQuery.data ?? []}
        excludeId={cayId}
        onChon={apMau}
      />
    </SafeAreaView>
  );
}

/** Hàng nén 1 mốc: dot màu · nhãn · "T+N tháng · Lứa X" · nút xoá · chevron. */
function RowMocNen({
  moc,
  onSua,
  onXoa,
}: {
  moc: MocSoan;
  onSua: () => void;
  onXoa: () => void;
}) {
  const mauDot = ACCENT[ACCENT_LOAI[moc.loai]].icon;
  const dongPhu = `T+${moc.thang} tháng${moc.lua ? ` · Lứa ${moc.lua}` : ''}`;
  return (
    <Pressable
      onPress={onSua}
      accessibilityRole="button"
      accessibilityLabel={`Sửa mốc ${moc.nhan}`}
      className="flex-row items-center py-3 border-b border-border active:bg-bg-soft"
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: mauDot,
          marginRight: 12,
        }}
      />
      <View className="flex-1 pr-2">
        <Text className="text-body text-ink font-semibold" numberOfLines={1}>
          {moc.nhan}
        </Text>
        <Text className="text-small text-ink-muted mt-0.5" numberOfLines={1}>
          {dongPhu}
        </Text>
      </View>
      <Pressable
        onPress={onXoa}
        accessibilityRole="button"
        accessibilityLabel={`Xoá ${moc.nhan}`}
        hitSlop={10}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={18} color="#6b7280" />
      </Pressable>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </Pressable>
  );
}

/**
 * Sheet Modal thêm/sửa 1 mốc. Preset chip auto điền nhãn/loại/lứa — chỉ 2 field
 * chính (nhãn + tháng); lứa hiện thêm khi `loai === 'thu_hoach'`.
 */
function MocSheet({
  gia,
  luaKeMacDinh,
  onLuu,
  onDong,
}: {
  gia: SheetMoc | null;
  luaKeMacDinh: number;
  onLuu: (v: SheetMoc) => void;
  onDong: () => void;
}) {
  const [dang, setDang] = useState<SheetMoc | null>(null);

  useEffect(() => {
    setDang(gia);
  }, [gia]);

  const thangInput = useNumericInput(
    dang?.thang ?? 0,
    (n) => setDang((d) => (d ? { ...d, thang: Math.max(0, Math.floor(n)) } : d)),
    { min: 0, maxDecimals: 0 },
  );
  const luaInput = useNumericInput(
    dang?.lua ?? luaKeMacDinh,
    (n) => setDang((d) => (d ? { ...d, lua: n > 0 ? Math.floor(n) : undefined } : d)),
    { min: 1, maxDecimals: 0 },
  );

  const chonPreset = (p: (typeof PRESET_MOC)[number]) => {
    if (!dang) return;
    const nhanCu = dang.nhan.trim();
    // Nhãn có "khớp" preset cũ (kể cả "Thu hoạch lứa N") thì được đè bằng preset
    // mới; nhãn user gõ tay không khớp preset nào thì giữ nguyên.
    const nhanCuLaTuPreset = PRESET_MOC.some(
      (x) => x.nhan === nhanCu || nhanCu.startsWith('Thu hoạch lứa'),
    );
    const luaMoi =
      p.loai === 'thu_hoach' ? dang.lua ?? luaKeMacDinh : undefined;
    const nhanMoi =
      !nhanCu || nhanCuLaTuPreset
        ? p.loai === 'thu_hoach'
          ? `Thu hoạch lứa ${luaMoi}`
          : p.nhan
        : nhanCu;
    setDang({
      ...dang,
      loai: p.loai,
      nhan: nhanMoi,
      lua: luaMoi,
      thang: p.goiYThang != null ? p.goiYThang : dang.thang,
    });
  };

  const dangHopLe =
    Boolean(dang?.nhan.trim()) &&
    Number.isFinite(dang?.thang ?? NaN) &&
    (dang?.thang ?? -1) >= 0 &&
    (dang?.loai !== 'thu_hoach' || (dang.lua ?? 0) >= 1);

  const laSua = Boolean(gia?.key);

  return (
    <Modal
      visible={dang != null}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onDong}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-t-frame p-4 pb-6">
            <View className="items-center mb-2">
              <View className="h-1 w-12 bg-neutral-300 rounded-full" />
            </View>
            <View className="flex-row items-center mb-3">
              <Text className="text-h2 text-ink flex-1">
                {laSua ? 'Sửa mốc' : 'Thêm mốc'}
              </Text>
              <Pressable
                onPress={onDong}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={12}
                className="p-2"
              >
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <Text className="text-caption text-ink-muted mb-1">Mẫu nhanh</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              className="mb-3"
            >
              {PRESET_MOC.map((p) => {
                const active = dang?.loai === p.loai;
                const mau = ACCENT[ACCENT_LOAI[p.loai]];
                return (
                  <Pressable
                    key={p.loai}
                    onPress={() => chonPreset(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`min-h-[44px] px-3 rounded-full items-center justify-center flex-row border ${
                      active ? `${mau.bg} ${mau.border}` : 'bg-white border-border'
                    }`}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: mau.icon,
                        marginRight: 8,
                      }}
                    />
                    <Text
                      className={`text-caption font-semibold ${
                        active ? mau.text : 'text-ink'
                      }`}
                    >
                      {p.loai === 'thu_hoach' ? `Thu hoạch lứa ${luaKeMacDinh}` : p.nhan}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {dang ? (
              <>
                <Input
                  label="Nhãn hiển thị *"
                  placeholder="VD: Làm bông, Thu hoạch lứa 1…"
                  value={dang.nhan}
                  onChangeText={(t) => setDang({ ...dang, nhan: t })}
                />
                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Input
                      label="Sau ngày trồng (tháng) *"
                      keyboardType="numeric"
                      value={thangInput.value}
                      onChangeText={thangInput.onChangeText}
                      onBlur={thangInput.onBlur}
                    />
                  </View>
                  {dang.loai === 'thu_hoach' ? (
                    <View style={{ width: 100 }}>
                      <Input
                        label="Lứa số *"
                        keyboardType="numeric"
                        value={luaInput.value}
                        onChangeText={luaInput.onChangeText}
                        onBlur={luaInput.onBlur}
                      />
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            <View className="flex-row gap-2 mt-2">
              <View className="flex-1">
                <Button label="Đóng" variant="secondary" onPress={onDong} />
              </View>
              <View className="flex-1">
                <Button
                  label={laSua ? 'Cập nhật' : 'Thêm'}
                  disabled={!dangHopLe}
                  onPress={() => dang && onLuu(dang)}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
