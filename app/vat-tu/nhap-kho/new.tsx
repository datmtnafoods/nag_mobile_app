import { useEffect, useMemo } from 'react';
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
import {
  createPhieuNhap,
  createPhieuNhapKeHoach,
  listKho,
} from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { formatQty, formatVND } from '../../../src/features/vat-tu/format';
import { useReceiptDraftStore } from '../../../src/stores/receipt-draft';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { DateField } from '../../../src/components/DateField';
import { LineEditor } from '../../../src/features/vat-tu/components/LineEditor';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { WizardSection } from '../../../src/features/vat-tu/components/WizardSection';
import { MAX_ANH_PHIEU } from '../../../src/features/vat-tu/anh';
import { ViTriBadge } from '../../../src/features/location/components/ViTriBadge';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';

export default function NewPhieuNhap() {
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const qc = useQueryClient();

  const {
    kind: draftKind,
    khoId,
    partner,
    lines,
    ghiChu,
    expectedOn,
    soHoaDon,
    giamGia,
    anh,
    startDraft,
    setKho,
    setGhiChu,
    setExpectedOn,
    setSoHoaDon,
    setGiamGia,
    setAnh,
    setViTri,
    removeLine,
    reset,
    totalBaseQuantity,
    totalAmount,
    toCreateBody,
  } = useReceiptDraftStore();

  useEffect(() => {
    if (draftKind !== 'nhap') startDraft('nhap');
  }, [draftKind, startDraft]);

  // Tự đo vị trí nền khi mở wizard. Tuỳ chọn — không chặn submit nếu thất bại.
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

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 60_000,
  });

  const kho = useMemo(() => khoQuery.data?.find((k) => k.id === khoId), [khoQuery.data, khoId]);

  const submit = useMutation({
    mutationFn: async ({ keHoach }: { keHoach: boolean }) => {
      const body = toCreateBody();
      if (!body) throw new Error('Phiếu chưa đủ thông tin');
      return keHoach ? createPhieuNhapKeHoach(body) : createPhieuNhap(body);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.setQueryData(['receipt', result.phieu.id], result);
      reset();
      router.replace(`/vat-tu/nhap-kho/${result.phieu.id}` as never);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const canSubmit = Boolean(khoId) && Boolean(partner) && lines.length > 0;
  // BE dry-run yêu cầu ≥ 1 dòng cho cả kế hoạch, khớp `warehouse.ts createPhieuNhapKeHoach`.
  const canSubmitKeHoach = canSubmit;
  const canSubmitFull = canSubmit;

  if (!canCreateReceipt(perms, 'nhap')) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={48} color="#dd1c2e" />
        <Text className="text-h2 text-ink mt-3">Không có quyền</Text>
        <Text className="text-body text-ink-muted text-center mt-2">
          Bạn không có quyền tạo phiếu nhập kho.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Tạo phiếu nhập',
          headerRight: () =>
            lines.length > 0 || partner ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Xoá nội dung đang soạn?', 'Toàn bộ dòng hàng và NCC đã chọn sẽ bị xoá.', [
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
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kho */}
          <WizardSection title="1 · Kho">
            {khoQuery.isPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <View className="flex-row flex-wrap">
                {(khoQuery.data ?? []).map((k) => {
                  const active = khoId === k.id;
                  return (
                    <Pressable
                      key={k.id}
                      onPress={() => setKho(k.id)}
                      className={`h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border ${
                        active ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      <Ionicons
                        name={k.loai === 'tong' ? 'business' : 'storefront-outline'}
                        size={14}
                        color={active ? '#fff' : '#6b7280'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className={`text-caption font-semibold ${
                          active ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {k.ten}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </WizardSection>

          {/* NCC */}
          <WizardSection
            title="2 · Nhà cung cấp"
            right={
              <Pressable
                onPress={() => router.push('/vat-tu/ncc-picker' as never)}
                hitSlop={8}
                className="flex-row items-center"
              >
                <Ionicons name={partner ? 'create-outline' : 'add-circle'} size={20} color="#dd1c2e" />
                <Text className="text-caption text-primary ml-1 font-semibold">
                  {partner ? 'Đổi' : 'Chọn'}
                </Text>
              </Pressable>
            }
          >
            {partner ? (
              <Text className="text-body text-ink font-semibold">{partner.ten}</Text>
            ) : (
              <Text className="text-caption text-ink-muted py-2">Chưa chọn NCC</Text>
            )}
          </WizardSection>

          {/* Metadata: expectedOn, soHoaDon, giamGia */}
          <WizardSection title="3 · Thông tin nhập">
            <DateField
              label="Ngày dự kiến nhận"
              placeholder="Chọn ngày hàng về"
              value={expectedOn}
              onChange={setExpectedOn}
            />
            <Input
              label="Số hoá đơn"
              placeholder="HD-08-001"
              value={soHoaDon ?? ''}
              onChangeText={(v) => setSoHoaDon(v || undefined)}
              autoCapitalize="characters"
            />
            <Input
              label="Giảm giá tổng phiếu"
              placeholder="0"
              keyboardType="numeric"
              value={giamGia != null ? String(giamGia) : ''}
              onChangeText={(v) => setGiamGia(v ? Number(v) : undefined)}
            />
          </WizardSection>

          {/* Dòng hàng */}
          <WizardSection
            title="4 · Dòng hàng"
            bleed
            right={
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() =>
                    router.push(
                      `/vat-tu/scan-code?returnTo=${encodeURIComponent('/vat-tu/nhap-kho/new')}` as never,
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
                      `/vat-tu/sku-picker${khoId ? `?khoId=${khoId}` : ''}` as never,
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
                  tone="nhap"
                  onRemove={() =>
                    Alert.alert('Xoá dòng?', line.tenSku, [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Xoá', style: 'destructive', onPress: () => removeLine(idx) },
                    ])
                  }
                />
              ))
            )}
          </WizardSection>

          {/* Ảnh + vị trí */}
          <WizardSection title="5 · Bằng chứng">
            <ImagePickerRow
              images={anh}
              onChange={setAnh}
              maxCount={MAX_ANH_PHIEU}
            />
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

          {/* Tổng */}
          <View className="rounded-card p-4 bg-green-600">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 text-caption">Tổng số lượng (đơn vị cơ bản)</Text>
              <Text className="text-white text-body font-semibold">
                {formatQty(totalBaseQuantity())}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-white/80 text-caption">Tiền hàng</Text>
              <Text className="text-white text-body font-semibold">
                {formatVND(totalAmount())}
              </Text>
            </View>
            {giamGia && giamGia > 0 ? (
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-white/80 text-caption">Giảm giá</Text>
                <Text className="text-white text-body font-semibold">
                  − {formatVND(giamGia)}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-white/20">
              <Text className="text-white text-caption font-semibold">Cần trả NCC</Text>
              <Text className="text-white text-h2 font-bold">
                {formatVND(Math.max(0, totalAmount() - (giamGia ?? 0)))}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer 2 button: Lưu tạm / Hoàn thành */}
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          <View className="flex-1">
            <Pressable
              onPress={() => submit.mutate({ keHoach: true })}
              disabled={!canSubmitKeHoach || submit.isPending}
              className={`h-button rounded-card border items-center justify-center ${
                canSubmitKeHoach && !submit.isPending
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-border bg-neutral-100'
              }`}
            >
              <Text
                className={`font-semibold ${
                  canSubmitKeHoach && !submit.isPending
                    ? 'text-amber-800'
                    : 'text-ink-muted'
                }`}
              >
                Lưu tạm
              </Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Button
              label="Hoàn thành"
              disabled={!canSubmitFull || submit.isPending}
              loading={submit.isPending}
              onPress={() => submit.mutate({ keHoach: false })}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

