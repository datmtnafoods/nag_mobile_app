import { useEffect, useMemo, useState } from 'react';
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
import { router, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createPhieuBan, taoKhoTam, tonKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage, laLoiMang } from '../../../src/api/client';
import { usePermissions, useAuthStore } from '../../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { formatQty, formatVND } from '../../../src/features/vat-tu/format';
import { useKhoList } from '../../../src/features/vat-tu/useKhoList';
import { KhoTamQuickCreateModal } from '../../../src/features/vat-tu/components/KhoTamQuickCreateModal';
import { useKhoTamQueueStore } from '../../../src/stores/kho-tam-queue';
import { useIsOnline } from '../../../src/hooks/useIsOnline';
import { deriveTrangThaiTT, TT_META } from '../../../src/features/vat-tu/payment';
import { convertToBase } from '../../../src/features/vat-tu/unit-convert';
import { useNumericInput } from '../../../src/hooks/useNumericInput';
import type { LoaiXe, PhuongThucTT } from '../../../src/features/vat-tu/types';
import { KhoIcon } from '../../../src/features/vat-tu/components/KhoIcon';
import { useReceiptDraftStore } from '../../../src/stores/receipt-draft';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { LineEditor } from '../../../src/features/vat-tu/components/LineEditor';
import { LinePriceSheet } from '../../../src/features/vat-tu/components/LinePriceSheet';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { WizardSection } from '../../../src/features/vat-tu/components/WizardSection';
import { MAX_ANH_PHIEU } from '../../../src/features/vat-tu/anh';
import { ViTriBadge } from '../../../src/features/location/components/ViTriBadge';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';

export default function NewPhieuBan() {
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.name);
  const qc = useQueryClient();

  const {
    kind: draftKind,
    khoId,
    partner,
    lines,
    ghiChu,
    anh,
    giamGia,
    phuongThucTT,
    soTienThu,
    startDraft,
    setKho,
    setPartner,
    setGhiChu,
    setAnh,
    setViTri,
    setGiamGia,
    setPhuongThucTT,
    setSoTienThu,
    removeLine,
    updateLine,
    reset,
    totalBaseQuantity,
    totalAmount,
    totalDue,
    toCreateBody,
  } = useReceiptDraftStore();

  useEffect(() => {
    if (draftKind !== 'ban') startDraft('ban');
  }, [draftKind, startDraft]);

  // Tự đo vị trí nền — bán lưu động cho nông hộ ngoài trạm thì toạ độ có ý nghĩa.
  const {
    state: viTriState,
    viTri: viTriDo,
    loi: viTriLoi,
    canAskAgain: viTriCanAsk,
    layViTri,
  } = useDeviceLocation({ auto: true });

  useEffect(() => {
    if (viTriDo) setViTri(viTriDo);
  }, [viTriDo, setViTri]);

  const { khos, isPending: khoPending } = useKhoList();
  const online = useIsOnline();
  const [khoModal, setKhoModal] = useState(false);

  // Tạo kho tạm (xe) ngay tại chỗ — "thử-rồi-lùi": online POST lấy id thật, mất
  // mạng thì xếp hàng đợi (tempId) sync sau.
  const taoKho = useMutation({
    mutationFn: async ({ ten, loaiXe }: { ten: string; loaiXe: LoaiXe }): Promise<string> => {
      if (!userId) throw new Error('Chưa đăng nhập.');
      if (online === false) {
        return useKhoTamQueueStore
          .getState()
          .enqueue({ ten, loaiXe, custodianUserId: userId, custodianName: userName });
      }
      try {
        const kho = await taoKhoTam({ ten, loaiXe, custodianUserId: userId, custodianName: userName });
        return kho.id;
      } catch (err) {
        if (laLoiMang(err)) {
          return useKhoTamQueueStore
            .getState()
            .enqueue({ ten, loaiXe, custodianUserId: userId, custodianName: userName });
        }
        throw err;
      }
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['kho', 'list'] });
      setKho(id);
      setKhoModal(false);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  // 1 request cả bảng tồn của kho thay vì N+1 getStock per-SKU.
  const stockQuery = useQuery({
    queryKey: ['ton-kho', { khoId }],
    queryFn: () => tonKho({ khoId: khoId! }),
    enabled: Boolean(khoId) && lines.length > 0,
    staleTime: 10_000,
  });
  const tonMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockQuery.data ?? []) map.set(row.vatTuId, row.soLuong);
    return map;
  }, [stockQuery.data]);

  const overstockWarnings = useMemo(() => {
    if (!stockQuery.data) return {};
    const grouped: Record<string, number> = {};
    for (const l of lines) {
      grouped[l.vatTuId] =
        (grouped[l.vatTuId] ?? 0) +
        convertToBase(l.soLuong, l.donVi, { heSoQuyDoi: l.heSoQuyDoi });
    }
    const warn: Record<string, string> = {};
    for (const [id, need] of Object.entries(grouped)) {
      const have = tonMap.get(id) ?? 0;
      if (need > have) {
        const sku = lines.find((l) => l.vatTuId === id);
        warn[id] = `Sẽ vượt tồn: còn ${formatQty(have, sku?.donViCoBan)}, cần ${formatQty(need, sku?.donViCoBan)}`;
      }
    }
    return warn;
  }, [stockQuery.data, tonMap, lines]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // ─ Loại khách: nông hộ / HTX (có hồ sơ) / khách lẻ (vãng lai) ─
  type CustKind = 'nongHo' | 'htx' | 'khachLe';
  const [custKind, setCustKind] = useState<CustKind>(
    partner?.kind === 'htx' || partner?.kind === 'khachLe' ? partner.kind : 'nongHo',
  );
  const chonLoaiKhach = (k: CustKind) => {
    setCustKind(k);
    // Đổi loại thì bỏ khách đang chọn (id hồ sơ / tên lẻ không dùng chéo được).
    if (k === 'khachLe') setPartner({ kind: 'khachLe' });
    else setPartner(undefined);
  };

  // ─ Thanh toán ─
  const phaiThu = totalDue();
  const thu = soTienThu == null ? phaiThu : Math.max(0, Math.min(soTienThu, phaiThu));
  const ttStatus = deriveTrangThaiTT(thu, phaiThu);
  const giamGiaInput = useNumericInput(giamGia ?? 0, (n) => setGiamGia(n || undefined), {
    maxDecimals: 0,
  });
  const thuInput = useNumericInput(thu, (n) => setSoTienThu(n), { maxDecimals: 0 });
  const [khachDua, setKhachDua] = useState(0);
  const khachDuaInput = useNumericInput(khachDua, setKhachDua, { maxDecimals: 0 });
  const thoiLai = khachDua - thu;

  const submit = useMutation({
    mutationFn: async () => {
      const body = toCreateBody();
      if (!body) throw new Error('Phiếu chưa đủ thông tin');
      return createPhieuBan(body);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.setQueryData(['receipt', result.phieu.id], result);
      reset();
      setKhachDua(0);
      // Sang màn hoá đơn (thay vì detail) để in/chia sẻ ngay tại quầy.
      router.replace(`/vat-tu/ban-hang/hoa-don/${result.phieu.id}` as never);
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'thieu_ton') {
        Alert.alert('Thiếu tồn kho', apiErrorMessage(err), [
          {
            text: 'Xem tồn hiện tại',
            onPress: () => void stockQuery.refetch(),
          },
          { text: 'Đóng', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Lỗi', apiErrorMessage(err));
      }
    },
  });

  if (!canCreateReceipt(perms, 'ban')) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={48} color="#dd1c2e" />
        <Text className="text-h2 text-ink mt-3">Không có quyền</Text>
        <Text className="text-body text-ink-muted text-center mt-2">
          Bạn không có quyền tạo phiếu bán.
        </Text>
      </SafeAreaView>
    );
  }

  const hasOverstock = Object.keys(overstockWarnings).length > 0;
  // Khách lẻ hợp lệ không cần hồ sơ; nông hộ/HTX phải có partyId (backend ném
  // 400 `thieu_khach_hang` nếu thiếu).
  const khachHopLe = partner?.kind === 'khachLe' || Boolean(partner?.id);
  // Kho đang chọn là kho tạm CHƯA đồng bộ (id 'LOCAL-KHO-…') → chặn bán: id tạm vỡ
  // ở backend. Chờ `flushKhoQueue` chốt lên BE (cần mạng) rồi mới bán từ xe đó.
  const khoTam = Boolean(khos.find((k) => k.id === khoId)?.dongBoTam);
  const canSubmit =
    Boolean(khoId) && !khoTam && lines.length > 0 && khachHopLe && !hasOverstock;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Tạo phiếu bán',
          headerRight: () =>
            lines.length > 0 || partner ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Xoá nội dung đang soạn?', 'Toàn bộ dòng hàng và khách đã chọn sẽ bị xoá.', [
                    { text: 'Không', style: 'cancel' },
                    { text: 'Xoá', style: 'destructive', onPress: () => reset() },
                  ])
                }
                hitSlop={8}
                style={{ paddingHorizontal: 4 }}
              >
                <Text className="text-primary font-semibold">Xoá</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* Kho: trạm cố định + xe của tôi (K2 mở kho tạm trên xe). Không hiện
              kho tổng — bán không xuất từ tổng, cũng không hiện xe người khác. */}
          <WizardSection title="1 · Kho">
            {khoPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <View className="flex-row flex-wrap items-center">
                {khos
                  .filter(
                    (k) =>
                      k.loai === 'tram' ||
                      (k.loai === 'xe' && k.custodianUserId === userId),
                  )
                  .map((k) => {
                    const active = khoId === k.id;
                    return (
                      <Pressable
                        key={k.id}
                        onPress={() => setKho(k.id)}
                        className={`h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border ${
                          active ? 'bg-primary border-primary' : 'bg-white border-border'
                        }`}
                      >
                        <KhoIcon kho={k} active={active} />
                        <Text
                          className={`text-caption font-semibold ${
                            active ? 'text-white' : 'text-ink'
                          }`}
                        >
                          {k.ten}
                        </Text>
                        {k.dongBoTam ? (
                          <View className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100">
                            <Text className="text-[10px] text-amber-800 font-semibold">
                              chưa đồng bộ
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                <Pressable
                  onPress={() => setKhoModal(true)}
                  className="h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border border-dashed border-primary bg-primary/5"
                  accessibilityRole="button"
                  accessibilityLabel="Tạo kho tạm trên xe"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Kho tạm</Text>
                </Pressable>
              </View>
            )}
            {khoTam ? (
              <Text className="text-caption text-amber-700 mt-1">
                Kho tạm chưa đồng bộ — cần mạng để chốt lên hệ thống trước khi bán.
              </Text>
            ) : null}
            <Text className="text-small text-ink-muted mt-1">
              Bán từ kho trạm/xe (K2) — không xuất từ kho tổng.
            </Text>
          </WizardSection>

          {/* Khách hàng */}
          <WizardSection title="2 · Khách hàng">
            {/* Chọn loại khách */}
            <View className="flex-row gap-2 mb-3">
              {([
                { k: 'nongHo', label: 'Nông hộ', icon: 'person-outline' },
                { k: 'htx', label: 'HTX', icon: 'people-outline' },
                { k: 'khachLe', label: 'Khách lẻ', icon: 'walk-outline' },
              ] as const).map((opt) => {
                const active = custKind === opt.k;
                return (
                  <Pressable
                    key={opt.k}
                    onPress={() => chonLoaiKhach(opt.k)}
                    className={`flex-1 min-h-[44px] rounded-input flex-row items-center justify-center border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={15}
                      color={active ? '#fff' : '#6b7280'}
                      style={{ marginRight: 4 }}
                    />
                    <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {custKind === 'khachLe' ? (
              // Khách vãng lai — tên/SĐT tuỳ chọn, không lưu xuống đĩa (PII).
              <View>
                <Input
                  label="Tên khách (không bắt buộc)"
                  placeholder="Ví dụ: Cô Ba"
                  value={partner?.ten ?? ''}
                  onChangeText={(v) =>
                    setPartner({ kind: 'khachLe', ten: v || undefined, sdt: partner?.sdt })
                  }
                />
                <View className="mt-2">
                  <Input
                    label="Số điện thoại (không bắt buộc)"
                    placeholder="0xxx xxx xxx"
                    keyboardType="phone-pad"
                    value={partner?.sdt ?? ''}
                    onChangeText={(v) =>
                      setPartner({ kind: 'khachLe', ten: partner?.ten, sdt: v || undefined })
                    }
                  />
                </View>
                <Text className="text-small text-ink-muted mt-1">
                  Bán lẻ tại quầy — không cần hồ sơ nông hộ.
                </Text>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center justify-between">
                  {partner?.id ? (
                    <View className="flex-row items-center flex-1 pr-2">
                      <Ionicons name="person-circle-outline" size={20} color="#166534" />
                      <View className="ml-2 flex-1">
                        <Text className="text-body text-ink font-semibold">{partner.ten}</Text>
                        <Text className="text-small text-ink-muted font-mono">{partner.id}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="text-caption text-ink-muted flex-1 pr-2">
                      {custKind === 'htx'
                        ? 'Chưa chọn HTX — chọn hồ sơ hợp tác xã.'
                        : 'Chưa chọn khách — chọn hồ sơ nông hộ.'}
                    </Text>
                  )}
                  <Pressable
                    onPress={() =>
                      router.push(`/vat-tu/partner-picker?kind=${custKind}` as never)
                    }
                    hitSlop={8}
                    className="flex-row items-center"
                    accessibilityRole="button"
                    accessibilityLabel={partner?.id ? 'Đổi khách' : 'Chọn khách'}
                  >
                    <Ionicons
                      name={partner?.id ? 'create-outline' : 'add-circle'}
                      size={20}
                      color="#dd1c2e"
                    />
                    <Text className="text-caption text-primary ml-1 font-semibold">
                      {partner?.id ? 'Đổi' : 'Chọn'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </WizardSection>

          {/* Dòng hàng */}
          <WizardSection
            title="3 · Dòng hàng"
            bleed
            right={
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() =>
                    router.push(
                      `/vat-tu/scan-code?mode=lien_tuc&returnTo=${encodeURIComponent('/vat-tu/ban-hang/new')}` as never,
                    )
                  }
                  hitSlop={8}
                  className="flex-row items-center"
                >
                  <Ionicons name="scan-outline" size={20} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Quét mã</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push(
                      `/vat-tu/sku-picker?editGia=1${khoId ? `&khoId=${khoId}` : ''}` as never,
                    )
                  }
                  hitSlop={8}
                  className="flex-row items-center"
                >
                  <Ionicons name="add-circle" size={20} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Thêm</Text>
                </Pressable>
              </View>
            }
          >
            {lines.length === 0 ? (
              <View className="py-6 items-center">
                <Ionicons name="cube-outline" size={36} color="#d1d5db" />
                <Text className="text-caption text-ink-muted mt-2">Chưa có dòng hàng</Text>
              </View>
            ) : (
              lines.map((line, idx) => (
                <LineEditor
                  key={`${line.vatTuId}-${line.lo ?? ''}-${idx}`}
                  line={line}
                  tone="ban"
                  onRemove={() =>
                    Alert.alert('Xoá dòng?', line.tenSku, [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Xoá', style: 'destructive', onPress: () => removeLine(idx) },
                    ])
                  }
                  warning={overstockWarnings[line.vatTuId]}
                  onEditGia={() => setEditingIndex(idx)}
                />
              ))
            )}
          </WizardSection>

          {/* Ảnh + vị trí */}
          <WizardSection title="4 · Bằng chứng">
            <ImagePickerRow images={anh} onChange={setAnh} maxCount={MAX_ANH_PHIEU} />
            <View className="mt-3 pt-3 border-t border-border">
              <ViTriBadge
                state={viTriState}
                viTri={viTriDo}
                loi={viTriLoi}
                canAskAgain={viTriCanAsk}
                onRetry={() => void layViTri()}
              />
            </View>
          </WizardSection>

          {/* Thanh toán */}
          <WizardSection title="5 · Thanh toán">
            <Input
              label="Giảm giá toàn phiếu (đ)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={giamGiaInput.value}
              onChangeText={giamGiaInput.onChangeText}
              onBlur={giamGiaInput.onBlur}
            />

            <Text className="text-caption text-ink-muted mt-3 mb-1">Phương thức</Text>
            <View className="flex-row gap-2">
              {(['tien_mat', 'chuyen_khoan'] as PhuongThucTT[]).map((pt) => {
                const active = phuongThucTT === pt;
                return (
                  <Pressable
                    key={pt}
                    onPress={() => setPhuongThucTT(pt)}
                    className={`min-h-[44px] px-3 rounded-input flex-row items-center border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={pt === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}
                  >
                    <Ionicons
                      name={pt === 'tien_mat' ? 'cash-outline' : 'card-outline'}
                      size={16}
                      color={active ? '#fff' : '#6b7280'}
                      style={{ marginRight: 6 }}
                    />
                    <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                      {pt === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row items-end gap-2 mt-3">
              <View className="flex-1">
                <Input
                  label="Đã thu (đ)"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={thuInput.value}
                  onChangeText={thuInput.onChangeText}
                  onBlur={thuInput.onBlur}
                />
              </View>
              <Pressable
                onPress={() => setSoTienThu(phaiThu)}
                className="min-h-[44px] px-3 mb-1 rounded-input border border-primary items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Thu đủ"
              >
                <Text className="text-caption text-primary font-semibold">Thu đủ</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-caption text-ink-muted">Trạng thái</Text>
              <View className={`rounded-input px-2 py-1 ${TT_META[ttStatus].bg}`}>
                <Text className={`text-caption font-semibold ${TT_META[ttStatus].text}`}>
                  {TT_META[ttStatus].label}
                </Text>
              </View>
            </View>
            {thu < phaiThu ? (
              <Text className="text-small text-amber-700 mt-1">
                Còn nợ {formatVND(phaiThu - thu)}
              </Text>
            ) : null}

            {/* Tiền khách đưa / thối lại — chỉ tính tại chỗ, không lưu. */}
            <View className="mt-3 pt-3 border-t border-border">
              <Input
                label="Khách đưa (đ) — tính tiền thối"
                placeholder="0"
                keyboardType="decimal-pad"
                value={khachDuaInput.value}
                onChangeText={khachDuaInput.onChangeText}
                onBlur={khachDuaInput.onBlur}
              />
              {khachDua > 0 ? (
                <Text
                  className={`text-caption font-semibold mt-1 ${
                    thoiLai >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {thoiLai >= 0
                    ? `Thối lại: ${formatVND(thoiLai)}`
                    : `Còn thiếu: ${formatVND(-thoiLai)}`}
                </Text>
              ) : null}
            </View>
          </WizardSection>

          {/* Ghi chú */}
          <WizardSection title="6 · Ghi chú">
            <Input
              placeholder="Ghi chú thêm..."
              multiline
              numberOfLines={3}
              value={ghiChu ?? ''}
              onChangeText={(v) => setGhiChu(v || undefined)}
            />
          </WizardSection>

          <View className="rounded-card p-4 bg-amber-600">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 text-caption">Tổng số lượng</Text>
              <Text className="text-white text-body font-semibold">
                {formatQty(totalBaseQuantity())}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-white/80 text-caption">Tạm tính</Text>
              <Text className="text-white text-body">{formatVND(totalAmount())}</Text>
            </View>
            {giamGia ? (
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-white/80 text-caption">Giảm giá</Text>
                <Text className="text-white text-body">− {formatVND(giamGia)}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-white/20">
              <Text className="text-white text-caption font-semibold">Phải thu</Text>
              <Text className="text-white text-h2 font-bold">{formatVND(phaiThu)}</Text>
            </View>
          </View>
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Tạo phiếu bán"
            disabled={!canSubmit || submit.isPending}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
          {hasOverstock ? (
            <Text className="text-small text-amber-700 mt-1 text-center">
              Có dòng vượt tồn — giảm số lượng trước khi gửi.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <LinePriceSheet
        visible={editingIndex !== null}
        line={editingIndex !== null ? lines[editingIndex] ?? null : null}
        onDismiss={() => setEditingIndex(null)}
        onSubmit={(donGia) => {
          if (editingIndex !== null) updateLine(editingIndex, { donGia });
          setEditingIndex(null);
        }}
      />

      <KhoTamQuickCreateModal
        visible={khoModal}
        submitting={taoKho.isPending}
        onDismiss={() => setKhoModal(false)}
        onSubmit={(input) => taoKho.mutate(input)}
      />
    </SafeAreaView>
  );
}

