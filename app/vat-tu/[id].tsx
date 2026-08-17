import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { cancelReceipt, getReceipt } from '../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../src/api/client';
import { useCurrentUser } from '../../src/auth/store';
import { canCancelReceipt, permsForVatTu } from '../../src/features/vat-tu/perms';
import {
  formatDate,
  formatDateTime,
  formatQty,
  formatVND,
  RECEIPT_KIND_META,
  RECEIPT_STATUS_META,
} from '../../src/features/vat-tu/format';
import { KindBadge } from '../../src/features/vat-tu/components/KindBadge';
import { Button } from '../../src/components/Button';
import { CancelSheet } from '../../src/components/CancelSheet';

export default function ReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getReceipt(receiptId),
    enabled: Boolean(receiptId),
  });

  const [showCancel, setShowCancel] = useState(false);

  const cancelMut = useMutation({
    mutationFn: (lyDo: string) => cancelReceipt(receiptId, lyDo),
    onSuccess: (updated) => {
      qc.setQueryData(['receipt', receiptId], updated);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      setShowCancel(false);
    },
  });

  if (!receiptId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Text className="text-body text-ink-muted">Thiếu mã phiếu.</Text>
      </SafeAreaView>
    );
  }

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const { phieu, dongHang } = q.data;
  const kindMeta = RECEIPT_KIND_META[phieu.kind];
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai];
  const canCancel = canCancelReceipt(perms) && phieu.trangThai === 'ghi';
  const isHuy = phieu.trangThai === 'huy';

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: phieu.id }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-2">
            <Text className="text-h2 text-ink">{phieu.id}</Text>
            <Text className="text-caption text-ink-muted mt-1">
              Ngày lập: {formatDateTime(phieu.taoLuc)}
            </Text>
          </View>
          <View className="items-end gap-y-1">
            <KindBadge kind={phieu.kind} />
            <View className={`rounded-input px-2 py-1 ${statusMeta.bg}`}>
              <Text className={`text-caption font-semibold ${statusMeta.text}`}>
                {statusMeta.label}
              </Text>
            </View>
          </View>
        </View>

        {isHuy && phieu.lyDoHuy ? (
          <View className="rounded-card bg-red-50 border border-red-200 p-3 mb-4">
            <Text className="text-caption text-red-700 font-semibold">Lý do huỷ</Text>
            <Text className="text-body text-red-800 mt-1">{phieu.lyDoHuy}</Text>
            {phieu.huyLuc ? (
              <Text className="text-small text-red-700 mt-1">
                Huỷ lúc {formatDateTime(phieu.huyLuc)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="business-outline" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-2">Kho</Text>
          </View>
          <Text className="text-body text-ink font-semibold">
            {phieu.khoTen ?? phieu.khoId}
          </Text>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name={phieu.kind === 'nhap' ? 'business' : 'person-outline'}
              size={18}
              color="#6b7280"
            />
            <Text className="text-caption text-ink-muted ml-2">
              {phieu.kind === 'nhap' ? 'Nhà cung cấp' : 'Khách hàng'}
            </Text>
          </View>
          <Text className="text-body text-ink font-semibold">{phieu.partnerTen ?? '—'}</Text>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-3">Dòng hàng</Text>
          {dongHang.map((d, i) => (
            <View
              key={i}
              className={`flex-row items-start py-2 ${
                i < dongHang.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
                <Ionicons name="cube" size={20} color="#dd1c2e" />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-body text-ink font-semibold ${
                    isHuy ? 'line-through opacity-60' : ''
                  }`}
                >
                  {d.tenSku ?? d.vatTuId}
                </Text>
                <Text className="text-caption text-ink-muted">
                  {formatQty(d.soLuongCoBan, d.donViCoBan)}
                  {d.donGia ? ` · ${formatVND(d.donGia)}/${d.donViCoBan}` : ''}
                </Text>
                {d.lo || d.hanDung ? (
                  <Text className="text-small text-ink-muted mt-0.5">
                    {d.lo ? `Lô: ${d.lo}` : ''}
                    {d.lo && d.hanDung ? ' · ' : ''}
                    {d.hanDung ? `HSD: ${formatDate(d.hanDung)}` : ''}
                  </Text>
                ) : null}
              </View>
              <Text
                className={`text-body text-ink font-semibold ${
                  isHuy ? 'line-through opacity-60' : ''
                }`}
              >
                {formatVND((d.donGia ?? 0) * d.soLuongCoBan)}
              </Text>
            </View>
          ))}
        </View>

        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption text-ink-muted">Tổng số lượng</Text>
            <Text className="text-body text-ink font-semibold">
              {formatQty(phieu.tongSoLuong)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
            <Text className="text-caption text-ink-muted">Tổng tiền</Text>
            <Text
              className={`text-h2 font-bold ${isHuy ? 'line-through opacity-60 text-ink' : 'text-primary'}`}
            >
              {formatVND(phieu.tongTien)}
            </Text>
          </View>
        </View>

        {phieu.ghiChu ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted">Ghi chú</Text>
            <Text className="text-body text-ink mt-1">{phieu.ghiChu}</Text>
          </View>
        ) : null}
      </ScrollView>

      {canCancel ? (
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={`Huỷ ${kindMeta.label.toLowerCase()}`}
            variant="secondary"
            disabled={cancelMut.isPending}
            onPress={() => {
              cancelMut.reset();
              setShowCancel(true);
            }}
          />
        </View>
      ) : null}

      <CancelSheet
        visible={showCancel}
        title={`Huỷ phiếu ${phieu.id}`}
        helperText="Nhập lý do huỷ để lưu vào lịch sử."
        placeholder="Ví dụ: Khách đổi ý"
        submitting={cancelMut.isPending}
        errorMessage={cancelMut.isError ? apiErrorMessage(cancelMut.error) : null}
        onDismiss={() => {
          setShowCancel(false);
          cancelMut.reset();
        }}
        onSubmit={(lyDo) => cancelMut.mutate(lyDo)}
      />
    </SafeAreaView>
  );
}
