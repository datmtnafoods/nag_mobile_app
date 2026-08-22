import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { taoNhatKy, listNhatKy } from '../../src/api/erp/nhat-ky';
import { getPlot } from '../../src/api/erp/growing-areas';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DateField } from '../../src/components/DateField';
import { WizardSection } from '../../src/features/vat-tu/components/WizardSection';
import {
  LoaiNhatKyChips,
  LOAI_NHAT_KY_META,
} from '../../src/features/den-thua/components/LoaiNhatKyChips';
import { BonPhanForm, BON_PHAN_MAC_DINH } from '../../src/features/den-thua/components/BonPhanForm';
import {
  PhunThuocForm,
  PHUN_THUOC_MAC_DINH,
} from '../../src/features/den-thua/components/PhunThuocForm';
import {
  ThuHoachForm,
  THU_HOACH_MAC_DINH,
} from '../../src/features/den-thua/components/ThuHoachForm';
import { CanhTacForm, CANH_TAC_MAC_DINH } from '../../src/features/den-thua/components/CanhTacForm';
import {
  TinhTrangCayForm,
  TINH_TRANG_CAY_MAC_DINH,
} from '../../src/features/den-thua/components/TinhTrangCayForm';
import { ChonVatTuSheet } from '../../src/features/den-thua/components/ChonVatTuSheet';
import { ImagePickerRow } from '../../src/features/vat-tu/components/ImagePickerRow';
import { useNumericInput } from '../../src/hooks/useNumericInput';
import type { VatTu } from '../../src/features/vat-tu/types';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { formatDate } from '../../src/features/vat-tu/format';
import { goiYLoaiTheoGiaiDoan } from '../../src/features/den-thua/lich-canh-tac';
import { useMocThua } from '../../src/features/den-thua/useMocThua';
import type {
  ChiTietBonPhan,
  ChiTietCanhTac,
  ChiTietNhatKy,
  ChiTietPhunThuoc,
  ChiTietThuHoach,
  ChiTietTinhTrangCay,
  DongVatTuNhatKy,
  LoaiNhatKy,
} from '../../src/features/den-thua/types';

/** Trần ảnh 1 bản ghi nhật ký — cùng nguyên tắc `MAX_ANH_PHIEU` của vật tư. */
const MAX_ANH_NHAT_KY = 4;

/**
 * 1 dòng vật tư đã chọn trong form nhật ký. Số lượng có thể sửa; đơn vị readonly
 * (đơn vị cơ bản của SKU). `useNumericInput` không có `max` nên min=0 đủ.
 */
function VatTuBlock({
  dongVatTu,
  onDoiSoLuong,
  onXoa,
  onMoSheet,
}: {
  dongVatTu: DongVatTuNhatKy[];
  onDoiSoLuong: (vatTuId: string, n: number) => void;
  onXoa: (vatTuId: string) => void;
  onMoSheet: () => void;
}) {
  return (
    <View className="mt-2">
      <Text className="text-caption text-ink-muted mb-1">Vật tư sử dụng (tuỳ chọn)</Text>
      {dongVatTu.map((d) => (
        <DongVatTuRow
          key={d.vatTuId}
          dong={d}
          onDoiSoLuong={(n) => onDoiSoLuong(d.vatTuId, n)}
          onXoa={() => onXoa(d.vatTuId)}
        />
      ))}
      <Pressable
        onPress={onMoSheet}
        accessibilityRole="button"
        accessibilityLabel="Chọn vật tư từ danh mục"
        className="h-11 rounded-input border border-dashed border-primary items-center justify-center flex-row bg-primary-50 active:opacity-80"
      >
        <Ionicons name="add-circle-outline" size={18} color="#dd1c2e" />
        <Text className="text-primary font-semibold ml-1">Chọn từ danh mục</Text>
      </Pressable>
      <Text className="text-small text-ink-muted mt-1">
        Chỉ ghi nhận vật tư dùng — KHÔNG trừ tồn kho.
      </Text>
    </View>
  );
}

function DongVatTuRow({
  dong,
  onDoiSoLuong,
  onXoa,
}: {
  dong: DongVatTuNhatKy;
  onDoiSoLuong: (n: number) => void;
  onXoa: () => void;
}) {
  const sl = useNumericInput(dong.soLuong, onDoiSoLuong, { min: 0, maxDecimals: 3 });
  return (
    <View className="flex-row items-center rounded-input border border-border bg-white p-2 mb-2">
      <View className="flex-1 mr-2">
        <Text className="text-body text-ink font-semibold" numberOfLines={1}>
          {dong.tenSku}
        </Text>
        <Text className="text-small text-ink-muted font-mono" numberOfLines={1}>
          {dong.vatTuId}
        </Text>
      </View>
      <View style={{ width: 88 }} className="mr-1">
        <Input
          keyboardType="numeric"
          value={sl.value}
          onChangeText={sl.onChangeText}
          onBlur={sl.onBlur}
        />
      </View>
      <View style={{ width: 52 }} className="mr-1">
        <Text className="text-small text-ink-muted" numberOfLines={1}>
          {dong.donViCoBan}
        </Text>
      </View>
      <Pressable
        onPress={onXoa}
        accessibilityRole="button"
        accessibilityLabel={`Xoá ${dong.tenSku}`}
        hitSlop={10}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={20} color="#6b7280" />
      </Pressable>
    </View>
  );
}

/** Hôm nay dạng ISO 'YYYY-MM-DD' (local). */
function homNayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Cộng n ngày vào 1 ngày ISO, trả 'YYYY-MM-DD'. */
function themNgay(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Nhãn ô Mô tả theo loại — `canh_tac` bắt buộc; các loại khác đã có chiTiet có cấu trúc. */
function nhanMoTa(loai: LoaiNhatKy | null): { nhan: string; batBuoc: boolean } {
  if (loai === 'canh_tac') return { nhan: 'Công việc thực hiện *', batBuoc: true };
  return { nhan: 'Mô tả thêm (tuỳ chọn)', batBuoc: false };
}

export default function GhiNhatKy() {
  const params = useLocalSearchParams<{ plotId?: string; partyId?: string; tenHo?: string }>();
  const plotId = typeof params.plotId === 'string' ? params.plotId : '';
  const partyId = typeof params.partyId === 'string' ? params.partyId : '';
  const tenHoParam = typeof params.tenHo === 'string' && params.tenHo ? params.tenHo : null;
  const qc = useQueryClient();

  const [loai, setLoai] = useState<LoaiNhatKy | null>(null);
  const [ngay, setNgay] = useState<string | undefined>(homNayIso());
  const [moTa, setMoTa] = useState('');

  // Chi tiết theo loại — giữ riêng từng loại, chỉ loại đang chọn được gửi đi.
  const [bonPhan, setBonPhan] = useState<ChiTietBonPhan>(BON_PHAN_MAC_DINH);
  const [phunThuoc, setPhunThuoc] = useState<ChiTietPhunThuoc>(PHUN_THUOC_MAC_DINH);
  const [thuHoach, setThuHoach] = useState<ChiTietThuHoach>(THU_HOACH_MAC_DINH);
  const [canhTac, setCanhTac] = useState<ChiTietCanhTac>(CANH_TAC_MAC_DINH);
  const [tinhTrangCay, setTinhTrangCay] = useState<ChiTietTinhTrangCay>(TINH_TRANG_CAY_MAC_DINH);

  const [anh, setAnh] = useState<string[]>([]);

  // Vật tư sử dụng — chỉ áp dụng cho `bon_phan` / `phun_thuoc`; ghi nhận vào
  // `dongVatTu`, KHÔNG trừ tồn kho. Đổi loại nhật ký sẽ reset (xem dưới).
  const [dongVatTu, setDongVatTu] = useState<DongVatTuNhatKy[]>([]);
  const [sheetVatTuMo, setSheetVatTuMo] = useState(false);

  // Đổi loại nhật ký → reset vật tư đã chọn để tránh gửi kèm nhật ký khác.
  const doiLoai = (l: LoaiNhatKy) => {
    if (l !== loai) setDongVatTu([]);
    setLoai(l);
  };

  const themVatTu = (sku: VatTu) => {
    // Chặn trùng theo vatTuId — chỉ 1 dòng cho mỗi SKU.
    if (dongVatTu.some((d) => d.vatTuId === sku.id)) {
      Alert.alert('Đã có', `${sku.ten} đã có trong danh sách.`);
      setSheetVatTuMo(false);
      return;
    }
    setDongVatTu((prev) => [
      ...prev,
      { vatTuId: sku.id, tenSku: sku.ten, donViCoBan: sku.donViCoBan, soLuong: 1 },
    ]);
    // Auto-fill tên phân/thuốc khi ô đang trống — không đè lên chữ user đã gõ.
    if (loai === 'bon_phan' && !bonPhan.tenPhan.trim()) {
      setBonPhan((p) => ({ ...p, tenPhan: sku.ten }));
    } else if (loai === 'phun_thuoc' && !phunThuoc.tenThuoc.trim()) {
      setPhunThuoc((p) => ({ ...p, tenThuoc: sku.ten }));
    }
    setSheetVatTuMo(false);
  };

  const xoaVatTu = (vatTuId: string) => {
    setDongVatTu((prev) => prev.filter((d) => d.vatTuId !== vatTuId));
  };

  const dongVatTuHopLe = dongVatTu.every((d) => d.soLuong > 0);

  const { viTri } = useDeviceLocation({ auto: true, accuracy: Location.Accuracy.High });

  // Nạp thửa để biết cây + ngày gốc → tính giai đoạn hiện tại.
  const thuaQuery = useQuery({
    queryKey: ['thua', plotId],
    queryFn: () => getPlot(plotId),
    enabled: Boolean(plotId),
  });
  const thua = thuaQuery.data;
  const tenHo = thua?.tenHo ?? tenHoParam;

  const { lich, mocs, idxHienTai } = useMocThua(thua);
  const giaiDoanMoc = idxHienTai >= 0 ? mocs[idxHienTai] : undefined;
  const goiY = useMemo(
    () => goiYLoaiTheoGiaiDoan(lich, giaiDoanMoc?.loai),
    [lich, giaiDoanMoc?.loai],
  );

  const lichSuQuery = useQuery({
    queryKey: ['nhat-ky', plotId],
    queryFn: () => listNhatKy({ plotId }),
    enabled: Boolean(plotId),
  });

  // Cổng cách ly mềm: khi thu hoạch, soi các lần phun còn trong thời gian cách ly.
  const canhBaoCachLy = useMemo(() => {
    if (loai !== 'thu_hoach' || !ngay) return null;
    const vuong = (lichSuQuery.data ?? []).filter((n) => {
      if (n.loai !== 'phun_thuoc') return false;
      const ct = n.chiTiet as ChiTietPhunThuoc | undefined;
      return Boolean(ct?.ngayAnToanThuHoach && ct.ngayAnToanThuHoach > ngay);
    });
    return vuong.length ? vuong : null;
  }, [loai, ngay, lichSuQuery.data]);

  // Xem trước ngày an toàn thu hoạch khi đang khai phun thuốc.
  const ngayAnToanPreview =
    loai === 'phun_thuoc' && ngay && phunThuoc.thoiGianCachLy > 0
      ? themNgay(ngay, phunThuoc.thoiGianCachLy)
      : null;

  const luu = useMutation({
    mutationFn: async () => {
      if (!loai) throw new Error('Chọn loại công việc.');
      if (!ngay) throw new Error('Chọn ngày thực hiện.');
      let chiTiet: ChiTietNhatKy | undefined;
      if (loai === 'bon_phan') {
        if (!bonPhan.tenPhan.trim()) throw new Error('Nhập tên phân bón.');
        if (!(bonPhan.luong > 0)) throw new Error('Nhập lượng dùng lớn hơn 0.');
        chiTiet = bonPhan;
      } else if (loai === 'phun_thuoc') {
        if (!phunThuoc.dichHai.trim()) throw new Error('Nhập dịch hại.');
        if (!phunThuoc.tenThuoc.trim()) throw new Error('Nhập tên thuốc.');
        if (!(phunThuoc.thoiGianCachLy > 0)) throw new Error('Nhập thời gian cách ly.');
        chiTiet = phunThuoc; // ngayAnToanThuHoach do server/mock tính.
      } else if (loai === 'thu_hoach') {
        if (!((thuHoach.sanLuong ?? 0) > 0)) throw new Error('Nhập sản lượng thu.');
        chiTiet = { ...thuHoach, daKiemTraCachLy: !canhBaoCachLy };
      } else if (loai === 'canh_tac') {
        chiTiet = canhTac;
      } else if (loai === 'tinh_trang_cay') {
        if (!tinhTrangCay.doiTuong.trim()) throw new Error('Nhập tên dịch hại / bệnh.');
        chiTiet = tinhTrangCay;
      }
      // Chỉ gửi `dongVatTu` cho loại có nghĩa (bón phân / phun thuốc).
      const gopDong =
        (loai === 'bon_phan' || loai === 'phun_thuoc') && dongVatTu.length > 0
          ? dongVatTu
          : undefined;
      return taoNhatKy({
        plotId,
        partyId,
        loai,
        ngay,
        moTa: moTa.trim() || undefined,
        chiTiet,
        // Real mode strip `anh` (nhat-ky.ts) vì backend vứt — có chủ đích;
        // mock lưu để demo. Ghi âm chưa nối vào form.
        anh,
        dongVatTu: gopDong,
        viTri: viTri ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nhat-ky'] });
      Alert.alert('Đã ghi nhật ký', 'Bản ghi đã lưu cho thửa này.', [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const moTaInfo = nhanMoTa(loai);
  const chiTietHopLe =
    loai === 'bon_phan'
      ? Boolean(bonPhan.tenPhan.trim()) && bonPhan.luong > 0
      : loai === 'phun_thuoc'
        ? Boolean(phunThuoc.dichHai.trim()) &&
          Boolean(phunThuoc.tenThuoc.trim()) &&
          phunThuoc.thoiGianCachLy > 0
        : loai === 'thu_hoach'
          ? (thuHoach.sanLuong ?? 0) > 0
          : loai === 'tinh_trang_cay'
            ? Boolean(tinhTrangCay.doiTuong.trim())
            : loai === 'canh_tac'
              ? Boolean(moTa.trim())
              : false;

  const coTheLuu =
    Boolean(plotId) && Boolean(loai) && Boolean(ngay) && chiTietHopLe && dongVatTuHopLe;

  if (!plotId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">Thiếu mã thửa đất.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header: hộ · thửa · cây · giai đoạn */}
          <View className="rounded-card bg-white border border-border p-3 mb-4">
            <View className="flex-row items-center">
              <View className="h-10 w-10 rounded-input bg-green-100 items-center justify-center mr-3">
                <Ionicons name="leaf" size={20} color="#166534" />
              </View>
              <View className="flex-1">
                <Text className="text-body text-ink font-semibold">{tenHo ?? 'Nông hộ'}</Text>
                <Text className="text-caption text-ink-muted font-mono">
                  {plotId}
                  {thua?.cropName ? ` · ${thua.cropName}` : ''}
                </Text>
              </View>
            </View>
            {giaiDoanMoc ? (
              <View className="flex-row items-center mt-2 self-start rounded-full bg-primary-50 px-2 py-1">
                <Ionicons name="time-outline" size={13} color="#dd1c2e" />
                <Text className="text-small text-primary font-semibold ml-1">
                  Giai đoạn: {giaiDoanMoc.nhan}
                </Text>
              </View>
            ) : null}
          </View>

          <WizardSection title="1 · Loại công việc">
            <LoaiNhatKyChips value={loai} onChange={doiLoai} goiY={goiY} />
          </WizardSection>

          {loai ? (
            <WizardSection title="2 · Ngày thực hiện">
              <DateField
                label="Ngày làm việc"
                value={ngay}
                onChange={setNgay}
                maximumDate={new Date()}
              />
            </WizardSection>
          ) : null}

          {loai === 'bon_phan' ? (
            <WizardSection title="3 · Chi tiết bón phân">
              <BonPhanForm value={bonPhan} onChange={setBonPhan} />
              <VatTuBlock
                dongVatTu={dongVatTu}
                onDoiSoLuong={(id, n) =>
                  setDongVatTu((prev) =>
                    prev.map((d) => (d.vatTuId === id ? { ...d, soLuong: n } : d)),
                  )
                }
                onXoa={xoaVatTu}
                onMoSheet={() => setSheetVatTuMo(true)}
              />
            </WizardSection>
          ) : null}

          {loai === 'phun_thuoc' ? (
            <WizardSection title="3 · Chi tiết phun thuốc">
              <PhunThuocForm value={phunThuoc} onChange={setPhunThuoc} />
              {ngayAnToanPreview ? (
                <View className="rounded-input bg-green-50 border border-green-200 p-3 flex-row">
                  <Ionicons name="shield-checkmark-outline" size={16} color="#166534" />
                  <Text className="text-small text-green-900 ml-2 flex-1">
                    Ngày an toàn thu hoạch:{' '}
                    <Text className="font-semibold">{formatDate(ngayAnToanPreview)}</Text>
                  </Text>
                </View>
              ) : null}
              <VatTuBlock
                dongVatTu={dongVatTu}
                onDoiSoLuong={(id, n) =>
                  setDongVatTu((prev) =>
                    prev.map((d) => (d.vatTuId === id ? { ...d, soLuong: n } : d)),
                  )
                }
                onXoa={xoaVatTu}
                onMoSheet={() => setSheetVatTuMo(true)}
              />
            </WizardSection>
          ) : null}

          {loai === 'thu_hoach' ? (
            <WizardSection title="3 · Chi tiết thu hoạch">
              <ThuHoachForm
                value={thuHoach}
                onChange={setThuHoach}
                mocThuHoach={mocs.filter((m) => m.loai === 'thu_hoach')}
                ngay={ngay}
              />
              {canhBaoCachLy ? (
                <View className="rounded-input bg-amber-50 border border-amber-200 p-3 flex-row">
                  <Ionicons name="warning-outline" size={16} color="#92400e" />
                  <Text className="text-small text-amber-900 ml-2 flex-1">
                    Có {canhBaoCachLy.length} lần phun chưa hết cách ly tính tới ngày này (an
                    toàn từ{' '}
                    <Text className="font-semibold">
                      {formatDate((canhBaoCachLy[0]!.chiTiet as ChiTietPhunThuoc).ngayAnToanThuHoach!)}
                    </Text>
                    ). Vẫn lưu được nhưng nên kiểm tra lại.
                  </Text>
                </View>
              ) : null}
            </WizardSection>
          ) : null}

          {loai === 'canh_tac' ? (
            <WizardSection title="3 · Chi tiết chăm sóc">
              <CanhTacForm value={canhTac} onChange={setCanhTac} />
            </WizardSection>
          ) : null}

          {loai === 'tinh_trang_cay' ? (
            <WizardSection title="3 · Chi tiết tình trạng cây">
              <TinhTrangCayForm value={tinhTrangCay} onChange={setTinhTrangCay} />
            </WizardSection>
          ) : null}

          {loai ? (
            <WizardSection title="Ảnh hiện trường (tuỳ chọn)">
              <ImagePickerRow images={anh} onChange={setAnh} maxCount={MAX_ANH_NHAT_KY} />
            </WizardSection>
          ) : null}

          {loai ? (
            <WizardSection title="Mô tả">
              <Input
                label={moTaInfo.nhan}
                placeholder="Ghi ngắn gọn tình hình…"
                multiline
                numberOfLines={4}
                value={moTa}
                onChangeText={setMoTa}
              />
            </WizardSection>
          ) : null}

          {/* Lịch sử */}
          {(lichSuQuery.data ?? []).length > 0 ? (
            <View className="rounded-card bg-white border border-border p-4">
              <Text className="text-caption text-ink-muted uppercase mb-2">
                Nhật ký trước đó ({lichSuQuery.data!.length})
              </Text>
              {lichSuQuery.data!.slice(0, 5).map((n) => {
                const meta = LOAI_NHAT_KY_META[n.loai];
                const soAnh = n.anh?.length ?? 0;
                const soVt = n.dongVatTu?.length ?? 0;
                return (
                  <View key={n.id} className="py-2 border-b border-border">
                    <View className="flex-row items-center">
                      <Ionicons name={meta.icon} size={14} color={meta.mau} />
                      <Text className="text-caption text-ink font-semibold ml-1 flex-1">
                        {meta.nhan}
                      </Text>
                      {soVt > 0 ? (
                        <View className="flex-row items-center mr-2">
                          <Ionicons name="cube-outline" size={12} color="#6b7280" />
                          <Text className="text-small text-ink-muted ml-0.5">{soVt}</Text>
                        </View>
                      ) : null}
                      {soAnh > 0 ? (
                        <View className="flex-row items-center mr-2">
                          <Ionicons name="camera-outline" size={12} color="#6b7280" />
                          <Text className="text-small text-ink-muted ml-0.5">{soAnh}</Text>
                        </View>
                      ) : null}
                      <Text className="text-small text-ink-muted">
                        {formatDate(n.ngay ?? n.taoLuc)}
                      </Text>
                    </View>
                    {n.moTa ? (
                      <Text className="text-small text-ink-muted mt-1">{n.moTa}</Text>
                    ) : null}
                    {soVt > 0 ? (
                      <Text className="text-small text-ink-muted mt-1" numberOfLines={1}>
                        {n.dongVatTu!.map((d) => `${d.tenSku} × ${d.soLuong} ${d.donViCoBan}`).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Lưu nhật ký"
            loading={luu.isPending}
            disabled={!coTheLuu || luu.isPending}
            onPress={() => luu.mutate()}
          />
          {!loai ? (
            <Text className="text-small text-ink-muted mt-1 text-center">
              Chọn loại công việc để tiếp tục.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ChonVatTuSheet
        visible={sheetVatTuMo}
        loaiNhatKy={loai}
        partyId={partyId || undefined}
        daChon={dongVatTu.map((d) => d.vatTuId)}
        onChon={themVatTu}
        onDong={() => setSheetVatTuMo(false)}
      />
    </SafeAreaView>
  );
}
