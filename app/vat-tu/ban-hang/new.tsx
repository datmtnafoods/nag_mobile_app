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
import { createPhieuBan, getStock, listKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { formatQty, formatVND } from '../../../src/features/vat-tu/format';
import { convertToBase } from '../../../src/features/vat-tu/unit-convert';
import { useReceiptDraftStore } from '../../../src/stores/receipt-draft';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { LineEditor } from '../../../src/features/vat-tu/components/LineEditor';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { WizardSection } from '../../../src/features/vat-tu/components/WizardSection';
import { MAX_ANH_PHIEU } from '../../../src/features/vat-tu/anh';
import { ViTriBadge } from '../../../src/features/location/components/ViTriBadge';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';

export default function NewPhieuBan() {
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const qc = useQueryClient();

  const {
    kind: draftKind,
    khoId,
    partner,
    lines,
    ghiChu,
    anh,
    startDraft,
    setKho,
    setGhiChu,
    setAnh,
    setViTri,
    removeLine,
    reset,
    totalBaseQuantity,
    totalAmount,
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

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 60_000,
  });

  const stockQuery = useQuery({
    queryKey: ['stock-batch', khoId, lines.map((l) => l.vatTuId).sort().join(',')],
    queryFn: async () => {
      if (!khoId || lines.length === 0) return {};
      const uniqueIds = Array.from(new Set(lines.map((l) => l.vatTuId)));
      const entries = await Promise.all(
        uniqueIds.map(async (id) => {
          const s = await getStock({ khoId, vatTuId: id });
          return [id, s.soLuong] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
    enabled: Boolean(khoId) && lines.length > 0,
    staleTime: 10_000,
  });

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
      const have = stockQuery.data[id] ?? 0;
      if (need > have) {
        const sku = lines.find((l) => l.vatTuId === id);
        warn[id] = `Sẽ vượt tồn: còn ${formatQty(have, sku?.donViCoBan)}, cần ${formatQty(need, sku?.donViCoBan)}`;
      }
    }
    return warn;
  }, [stockQuery.data, lines]);

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
      router.replace(`/vat-tu/ban-hang/${result.phieu.id}` as never);
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
  // `partner.id` chứ không chỉ `partner`: khách phải có hồ sơ thật (backend ném
  // 400 `thieu_khach_hang` nếu thiếu partyId).
  const canSubmit = Boolean(khoId) && lines.length > 0 && Boolean(partner?.id) && !hasOverstock;

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
          {/* Kho (chỉ trạm) */}
          <WizardSection title="1 · Kho">
            {khoQuery.isPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <View className="flex-row flex-wrap">
                {(khoQuery.data ?? [])
                  .filter((k) => k.loai === 'tram')
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
                        <Ionicons
                          name="storefront-outline"
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
            <Text className="text-small text-ink-muted mt-1">
              Chỉ bán tại kho trạm (không xuất từ kho tổng).
            </Text>
          </WizardSection>

          {/* Khách hàng */}
          <WizardSection
            title="2 · Khách hàng"
            right={
              <Pressable
                onPress={() =>
                  router.push('/vat-tu/partner-picker?kind=nongHo' as never)
                }
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
            {partner?.id ? (
              <View className="flex-row items-center">
                <Ionicons name="person-circle-outline" size={20} color="#166534" />
                <View className="ml-2 flex-1">
                  <Text className="text-body text-ink font-semibold">{partner.ten}</Text>
                  <Text className="text-small text-ink-muted font-mono">{partner.id}</Text>
                </View>
              </View>
            ) : (
              <Text className="text-caption text-ink-muted py-2">
                Chưa chọn khách — mỗi phiếu bán phải gắn một hồ sơ nông hộ.
              </Text>
            )}
          </WizardSection>

          {/* Dòng hàng */}
          <WizardSection
            title="3 · Dòng hàng"
            right={
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() =>
                    router.push(
                      `/vat-tu/scan-code?returnTo=${encodeURIComponent('/vat-tu/ban-hang/new')}` as never,
                    )
                  }
                  hitSlop={8}
                  className="flex-row items-center"
                >
                  <Ionicons name="scan-outline" size={20} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Quét mã</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/vat-tu/sku-picker' as never)}
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

          {/* Ghi chú */}
          <WizardSection title="5 · Ghi chú">
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
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-white/20">
              <Text className="text-white text-caption font-semibold">Tổng tiền</Text>
              <Text className="text-white text-h2 font-bold">{formatVND(totalAmount())}</Text>
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
    </SafeAreaView>
  );
}

