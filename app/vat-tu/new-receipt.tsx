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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createReceipt, getStock, listKho } from '../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../src/api/client';
import { useCurrentUser } from '../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../src/features/vat-tu/perms';
import { RECEIPT_KIND_META, formatQty, formatVND } from '../../src/features/vat-tu/format';
import { convertToBase } from '../../src/features/vat-tu/unit-convert';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import type { Kho, ReceiptKind } from '../../src/features/vat-tu/types';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { LineEditor } from '../../src/features/vat-tu/components/LineEditor';

export default function NewReceipt() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kindParam: ReceiptKind = params.kind === 'ban' ? 'ban' : 'nhap';
  const meta = RECEIPT_KIND_META[kindParam];

  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const qc = useQueryClient();

  const {
    kind: draftKind,
    khoId,
    partner,
    lines,
    ghiChu,
    startDraft,
    setKho,
    setGhiChu,
    removeLine,
    reset,
    totalBaseQuantity,
    totalAmount,
    toCreateBody,
  } = useReceiptDraftStore();

  useEffect(() => {
    if (draftKind !== kindParam) {
      startDraft(kindParam);
    }
  }, [draftKind, kindParam, startDraft]);

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 60_000,
  });

  const kho = useMemo(
    () => khoQuery.data?.find((k) => k.id === khoId),
    [khoQuery.data, khoId],
  );

  // Prefetch stock cho từng SKU khi kind='ban' + có kho
  const stockQuery = useQuery({
    queryKey: [
      'stock-batch',
      khoId,
      lines.map((l) => l.vatTuId).sort().join(','),
    ],
    queryFn: async () => {
      if (!khoId || kindParam !== 'ban' || lines.length === 0) return {};
      const uniqueIds = Array.from(new Set(lines.map((l) => l.vatTuId)));
      const entries = await Promise.all(
        uniqueIds.map(async (id) => {
          const s = await getStock({ khoId, vatTuId: id });
          return [id, s.soLuong] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
    enabled: kindParam === 'ban' && Boolean(khoId) && lines.length > 0,
    staleTime: 10_000,
  });

  const overstockWarnings = useMemo(() => {
    if (kindParam !== 'ban' || !stockQuery.data) return {};
    const grouped: Record<string, number> = {};
    for (const l of lines) {
      grouped[l.vatTuId] = (grouped[l.vatTuId] ?? 0) +
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
  }, [kindParam, stockQuery.data, lines]);

  const createMut = useMutation({
    mutationFn: async () => {
      const body = toCreateBody();
      if (!body) throw new Error('Phiếu chưa đủ thông tin');
      return createReceipt(kindParam, body);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-batch'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.setQueryData(['receipt', result.phieu.id], result);
      reset();
      router.replace(`/vat-tu/${result.phieu.id}` as never);
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'thieu_ton') {
        Alert.alert('Thiếu tồn kho', err.message, [
          {
            text: 'Xem tồn hiện tại',
            onPress: () => {
              void stockQuery.refetch();
            },
          },
          { text: 'Đóng', style: 'cancel' },
        ]);
      }
    },
  });

  const hasOverstockWarnings = Object.keys(overstockWarnings).length > 0;
  const stockChecking =
    kindParam === 'ban' &&
    Boolean(khoId) &&
    lines.length > 0 &&
    (stockQuery.isPending || stockQuery.isFetching);

  // Yêu cầu partner cho CẢ nhap và ban — nếu ban restart mà partner mất,
  // user phải chọn lại (chống silent "Khách lẻ" fallback).
  const canSubmit =
    Boolean(khoId) &&
    lines.length > 0 &&
    Boolean(partner) &&
    !stockChecking &&
    !hasOverstockWarnings;

  if (!canCreateReceipt(perms, kindParam)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={48} color="#dd1c2e" />
        <Text className="text-h2 text-ink mt-3">Không có quyền</Text>
        <Text className="text-body text-ink-muted text-center mt-2">
          Bạn không có quyền tạo {meta.label.toLowerCase()}.
        </Text>
      </SafeAreaView>
    );
  }

  const partnerLabel = kindParam === 'nhap' ? 'Nhà cung cấp' : 'Khách hàng';
  const showBanKho = (k: Kho) => (kindParam === 'ban' ? k.loai === 'tram' : true);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: meta.cta,
          headerRight: () =>
            lines.length > 0 || partner ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Xoá phiếu nháp?', 'Toàn bộ dòng hàng và đối tác đã chọn sẽ bị xoá.', [
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
          {/* Section 1: Kho */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted uppercase mb-2">1 · Kho</Text>
            {khoQuery.isPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <View className="flex-row flex-wrap -mx-1">
                {(khoQuery.data ?? []).filter(showBanKho).map((k) => {
                  const active = khoId === k.id;
                  return (
                    <View key={k.id} className="px-1 pb-2">
                      <Pressable
                        onPress={() => setKho(k.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Kho ${k.ten}${active ? ', đã chọn' : ''}`}
                        className={`h-10 px-3 rounded-input flex-row items-center border ${
                          active ? 'bg-primary border-primary' : 'bg-white border-border'
                        }`}
                      >
                        <Ionicons
                          name={k.loai === 'tong' ? 'business' : 'storefront-outline'}
                          size={14}
                          color={active ? '#fff' : '#6b7280'}
                          style={{ marginRight: 6 }}
                        />
                        <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                          {k.ten}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            {kindParam === 'ban' && kho?.loai === 'tong' ? (
              <Text className="text-small text-amber-800 mt-1">
                Backend chỉ cho bán từ kho trạm.
              </Text>
            ) : null}
          </View>

          {/* Section 2: Partner */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption text-ink-muted uppercase">2 · {partnerLabel}</Text>
              <Pressable
                onPress={() =>
                  router.push(
                    `/vat-tu/partner-picker?kind=${kindParam === 'nhap' ? 'ncc' : 'nongHo'}` as never,
                  )
                }
                className="flex-row items-center"
                hitSlop={8}
              >
                <Ionicons name={partner ? 'create-outline' : 'add-circle'} size={20} color="#dd1c2e" />
                <Text className="text-caption text-primary ml-1 font-semibold">
                  {partner ? 'Đổi' : 'Chọn'}
                </Text>
              </Pressable>
            </View>
            {partner ? (
              <View>
                <Text className="text-body text-ink font-semibold">{partner.ten ?? '—'}</Text>
                {partner.kind === 'khachLe' ? (
                  <Text className="text-caption text-ink-muted">Khách lẻ (không lưu thông tin)</Text>
                ) : null}
              </View>
            ) : (
              <View className="py-4 items-center">
                <Text className="text-caption text-ink-muted">
                  {kindParam === 'nhap' ? 'Chưa chọn nhà cung cấp' : 'Chưa chọn khách hàng'}
                </Text>
              </View>
            )}
          </View>

          {/* Section 3: Dòng hàng */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-caption text-ink-muted uppercase">3 · Dòng hàng</Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    const returnTo = `/vat-tu/new-receipt?kind=${kindParam}`;
                    router.push(
                      `/vat-tu/scan-code?returnTo=${encodeURIComponent(returnTo)}` as never,
                    );
                  }}
                  className="flex-row items-center"
                  hitSlop={8}
                >
                  <Ionicons name="scan-outline" size={20} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Quét mã</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/vat-tu/sku-picker' as never)}
                  className="flex-row items-center"
                  hitSlop={8}
                >
                  <Ionicons name="add-circle" size={20} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Thêm</Text>
                </Pressable>
              </View>
            </View>

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
                  onRemove={() => {
                    Alert.alert(
                      'Xoá dòng?',
                      `${line.tenSku} · SL ${formatQty(line.soLuong, line.donVi === 'lon' ? line.donViLon : line.donViCoBan)}`,
                      [
                        { text: 'Huỷ', style: 'cancel' },
                        { text: 'Xoá', style: 'destructive', onPress: () => removeLine(idx) },
                      ],
                    );
                  }}
                  warning={overstockWarnings[line.vatTuId]}
                />
              ))
            )}
          </View>

          {/* Section 4: Ghi chú */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted uppercase mb-2">4 · Ghi chú</Text>
            <Input
              placeholder="Ghi chú thêm..."
              multiline
              numberOfLines={3}
              value={ghiChu ?? ''}
              onChangeText={(v) => setGhiChu(v || undefined)}
            />
          </View>

          {/* Tổng */}
          <View className={`rounded-card p-4 ${kindParam === 'nhap' ? 'bg-green-600' : 'bg-amber-600'}`}>
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 text-caption">Tổng số lượng (đơn vị cơ bản)</Text>
              <Text className="text-white text-body font-semibold">
                {formatQty(totalBaseQuantity())}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-white/80 text-caption">Tạm tính</Text>
              <Text className="text-white text-h2 font-bold">{formatVND(totalAmount())}</Text>
            </View>
          </View>

          {createMut.isError && (createMut.error as Error & { code?: string })?.code !== 'thieu_ton' ? (
            <View className="rounded-input bg-red-50 border border-red-200 p-3 mt-3">
              <Text className="text-caption text-red-700">{apiErrorMessage(createMut.error)}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={stockChecking ? 'Đang kiểm tra tồn...' : meta.cta}
            disabled={!canSubmit || createMut.isPending}
            loading={createMut.isPending || stockChecking}
            onPress={() => createMut.mutate()}
          />
          {kindParam === 'ban' && hasOverstockWarnings ? (
            <Text className="text-small text-amber-700 mt-1 text-center">
              Có dòng vượt tồn — sửa số lượng hoặc đổi kho trước khi gửi.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
