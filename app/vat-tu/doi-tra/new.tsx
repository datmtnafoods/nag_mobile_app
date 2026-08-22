import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getReceipt } from '../../../src/api/erp/warehouse';
import { createPhieuTra, listPhieuTra } from '../../../src/api/erp/phieu-tra';
import { apiErrorMessage } from '../../../src/api/client';
import { conNo } from '../../../src/features/vat-tu/payment';
import { formatQty, formatVND } from '../../../src/features/vat-tu/format';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import type { PhieuBan, PhuongThucTT } from '../../../src/features/vat-tu/types';

export default function DoiTraNew() {
  const { phieuGocId } = useLocalSearchParams<{ phieuGocId?: string }>();
  const gocId = typeof phieuGocId === 'string' ? phieuGocId : '';
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['receipt', gocId],
    queryFn: () => getReceipt(gocId),
    enabled: !!gocId,
  });
  const traQuery = useQuery({
    queryKey: ['phieu-tra', { phieuGocId: gocId }],
    queryFn: () => listPhieuTra({ phieuGocId: gocId }),
    enabled: !!gocId,
  });

  // Số base đang chọn trả cho từng dòng (key = index dòng gốc).
  const [traBase, setTraBase] = useState<Record<number, number>>({});
  const [lyDo, setLyDo] = useState('');
  const [phuongThucHoan, setPhuongThucHoan] = useState<PhuongThucTT>('tien_mat');

  const phieu = q.data?.phieu?.kind === 'ban' ? (q.data.phieu as PhieuBan) : undefined;
  const dongHang = q.data?.dongHang ?? [];

  // Đã trả mỗi SKU (base) từ các phiếu trả 'ghi' trước đó.
  const returnedByVatTu = useMemo(() => {
    const m = new Map<string, number>();
    for (const pt of traQuery.data ?? []) {
      if (pt.trangThai !== 'ghi') continue;
      for (const d of pt.dongHang) {
        // dongHang phiếu trả lưu theo co_ban (xem createPhieuTra) → soLuong = base.
        m.set(d.vatTuId, (m.get(d.vatTuId) ?? 0) + d.soLuong);
      }
    }
    return m;
  }, [traQuery.data]);

  // Trần trả mỗi dòng (base) = min(đã bán dòng này, còn trả được của SKU).
  const maxBaseByLine = useMemo(() => {
    const out: number[] = [];
    const usedByVatTu = new Map<string, number>();
    for (const d of dongHang) {
      const daTra = returnedByVatTu.get(d.vatTuId) ?? 0;
      const usedTruoc = usedByVatTu.get(d.vatTuId) ?? 0;
      const remain = Math.max(0, d.soLuongCoBan + 0 - daTra - usedTruoc);
      const max = Math.min(d.soLuongCoBan, remain);
      out.push(Math.round(max * 1000) / 1000);
      usedByVatTu.set(d.vatTuId, usedTruoc + d.soLuongCoBan);
    }
    return out;
  }, [dongHang, returnedByVatTu]);

  const giaTri = useMemo(() => {
    let s = 0;
    dongHang.forEach((d, i) => {
      s += (d.donGia ?? 0) * (traBase[i] ?? 0);
    });
    return s;
  }, [dongHang, traBase]);

  const con = phieu ? conNo(phieu) : 0;
  const giamNo = Math.min(giaTri, Math.max(0, con));
  const hoanTien = Math.max(0, giaTri - giamNo);
  const coChon = Object.values(traBase).some((v) => v > 0);

  const submit = useMutation({
    mutationFn: async () => {
      const lines = dongHang
        .map((d, i) => ({ d, base: traBase[i] ?? 0 }))
        .filter((x) => x.base > 0)
        .map((x) => ({
          vatTuId: x.d.vatTuId,
          soLuong: x.base,
          donVi: 'co_ban' as const,
          lo: x.d.lo,
          hanDung: x.d.hanDung,
          serial: x.d.serial,
        }));
      return createPhieuTra({
        phieuGocId: gocId,
        dongHang: lines,
        lyDo: lyDo.trim(),
        phuongThucHoan: hoanTien > 0 ? phuongThucHoan : undefined,
      });
    },
    onSuccess: (pt) => {
      qc.invalidateQueries({ queryKey: ['receipt', gocId] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      qc.invalidateQueries({ queryKey: ['phieu-tra'] });
      router.replace(`/vat-tu/doi-tra/${pt.id}` as never);
    },
    onError: (err) => Alert.alert('Chưa trả được', apiErrorMessage(err)),
  });

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (q.isError || !phieu) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu bán gốc'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = coChon && lyDo.trim().length >= 3 && !submit.isPending;

  const setLine = (i: number, base: number, max: number) => {
    const clamped = Math.max(0, Math.min(Math.round(base * 1000) / 1000, max));
    setTraBase((prev) => ({ ...prev, [i]: clamped }));
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Đổi trả hàng' }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mb-4 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
            <Text className="text-small text-blue-900 ml-2 flex-1">
              Chọn dòng và số lượng khách trả từ phiếu {phieu.id}. Hàng trả nhập lại kho; tiền
              trừ nợ trước, hoàn sau.
            </Text>
          </View>

          {dongHang.map((d, i) => {
            const max = maxBaseByLine[i] ?? 0;
            const cur = traBase[i] ?? 0;
            const disabled = max <= 0;
            return (
              <View
                key={i}
                className={`rounded-card bg-white border border-border p-3 mb-2 ${
                  disabled ? 'opacity-60' : ''
                }`}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-body text-ink font-semibold">{d.tenSku ?? d.vatTuId}</Text>
                    <Text className="text-caption text-ink-muted">
                      Đã bán {formatQty(d.soLuongCoBan, d.donViCoBan)}
                      {d.donGia ? ` · ${formatVND(d.donGia)}/${d.donViCoBan}` : ''}
                    </Text>
                    {d.lo ? <Text className="text-small text-ink-muted">Lô: {d.lo}</Text> : null}
                  </View>
                </View>

                {disabled ? (
                  <Text className="text-small text-ink-muted mt-2">Đã trả đủ</Text>
                ) : (
                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center rounded-input border border-border h-input">
                      <Pressable
                        onPress={() => setLine(i, cur - 1, max)}
                        disabled={cur <= 0}
                        className={`h-full w-11 items-center justify-center ${cur <= 0 ? 'opacity-40' : ''}`}
                        accessibilityRole="button"
                        accessibilityLabel="Giảm số trả"
                      >
                        <Ionicons name="remove" size={20} color={cur <= 0 ? '#9ca3af' : '#111827'} />
                      </Pressable>
                      <Text className="w-16 text-center text-body text-ink font-semibold">
                        {formatQty(cur)}
                      </Text>
                      <Pressable
                        onPress={() => setLine(i, cur + 1, max)}
                        disabled={cur >= max}
                        className={`h-full w-11 items-center justify-center ${cur >= max ? 'opacity-40' : ''}`}
                        accessibilityRole="button"
                        accessibilityLabel="Tăng số trả"
                      >
                        <Ionicons name="add" size={20} color={cur >= max ? '#9ca3af' : '#111827'} />
                      </Pressable>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-caption text-ink-muted">/ {formatQty(max, d.donViCoBan)}</Text>
                      <Pressable
                        onPress={() => setLine(i, max, max)}
                        className="min-h-[44px] px-2 justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Trả hết dòng này"
                      >
                        <Text className="text-caption text-primary font-semibold">Trả hết</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <View className="mt-2">
            <Input
              label="Lý do trả"
              placeholder="Ví dụ: Hàng lỗi, khách đổi loại khác"
              value={lyDo}
              onChangeText={setLyDo}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Preview tiền */}
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <View className="flex-row justify-between">
              <Text className="text-caption text-ink-muted">Giá trị trả</Text>
              <Text className="text-caption text-ink font-semibold">{formatVND(giaTri)}</Text>
            </View>
            {giamNo > 0 ? (
              <View className="flex-row justify-between mt-1">
                <Text className="text-caption text-ink-muted">Trừ vào nợ</Text>
                <Text className="text-caption text-ink">− {formatVND(giamNo)}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between mt-1 pt-1 border-t border-border">
              <Text className="text-body text-ink font-semibold">Hoàn khách</Text>
              <Text className="text-body text-primary font-bold">{formatVND(hoanTien)}</Text>
            </View>
          </View>

          {hoanTien > 0 ? (
            <View className="mt-3">
              <Text className="text-caption text-ink-muted mb-1">Phương thức hoàn</Text>
              <View className="flex-row gap-2">
                {(['tien_mat', 'chuyen_khoan'] as PhuongThucTT[]).map((pt) => {
                  const active = phuongThucHoan === pt;
                  return (
                    <Pressable
                      key={pt}
                      onPress={() => setPhuongThucHoan(pt)}
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
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Xác nhận trả hàng"
            disabled={!canSubmit}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
