import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMoves, getReceipt, huyPhieu } from '../../../src/api/erp/warehouse';
import { getParty } from '../../../src/api/erp/parties';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import { canCancelReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import {
  formatDate,
  formatDateTime,
  formatQty,
  formatVND,
  RECEIPT_STATUS_META,
  statusLabelForKind,
} from '../../../src/features/vat-tu/format';
import { KindBadge } from '../../../src/features/vat-tu/components/KindBadge';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { ViTriRow } from '../../../src/features/location/components/ViTriRow';
import { Button } from '../../../src/components/Button';
import { CancelSheet } from '../../../src/components/CancelSheet';
import type { PhieuBan } from '../../../src/features/vat-tu/types';

export default function PhieuBanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canCancel = canCancelReceipt(perms);
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const q = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getReceipt(receiptId),
    enabled: !!receiptId,
  });
  const movesQuery = useQuery({
    queryKey: ['moves', { chungTuId: receiptId }],
    queryFn: () => getMoves({ chungTuId: receiptId }),
    enabled: !!receiptId && q.data?.phieu.trangThai !== 'ke_hoach',
  });

  // Hồ sơ khách hàng — join để hiện SĐT/địa chỉ thay vì mỗi mã party thô.
  // Khai TRƯỚC các early-return bên dưới để thứ tự hook không đổi giữa các render.
  const phieuBan = q.data?.phieu.kind === 'ban' ? q.data.phieu : undefined;
  const partyId = phieuBan?.partyId;
  const partyQuery = useQuery({
    queryKey: ['party', partyId],
    queryFn: () => getParty(partyId!),
    enabled: Boolean(partyId),
  });

  const cancelMut = useMutation({
    mutationFn: (lyDo: string) => huyPhieu(receiptId, lyDo),
    onSuccess: (updated) => {
      qc.setQueryData(['receipt', receiptId], updated);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      setShowCancel(false);
    },
  });

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data || q.data.phieu.kind !== 'ban') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu bán'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data.phieu as PhieuBan;
  const dongHang = q.data.dongHang;
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai];
  const statusLabel = statusLabelForKind(phieu.trangThai, 'ban');
  const isHuy = phieu.trangThai === 'huy';

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: phieu.id }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-2">
            <Text className="text-h2 text-ink">{phieu.id}</Text>
            <Text className="text-caption text-ink-muted mt-1">
              Ngày: {formatDateTime(phieu.taoLuc)}
            </Text>
            <Text className="text-caption text-ink-muted">Người tạo: {phieu.nguoiTao}</Text>
          </View>
          <View className="items-end gap-y-1">
            <KindBadge kind="ban" />
            <View className={`rounded-input px-2 py-1 ${statusMeta.bg}`}>
              <Text className={`text-caption font-semibold ${statusMeta.text}`}>{statusLabel}</Text>
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
            <Ionicons name="storefront-outline" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-2">Kho</Text>
          </View>
          <Text className="text-body text-ink font-semibold">{phieu.khoTen ?? phieu.khoId}</Text>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="person-outline" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-2">Khách hàng</Text>
          </View>
          <Text className="text-body text-ink font-semibold">
            {partyQuery.data?.name ?? phieu.partyName ?? 'Chưa rõ'}
          </Text>
          {partyQuery.data?.phones[0] ? (
            <Text className="text-caption text-ink-muted">{partyQuery.data.phones[0]}</Text>
          ) : null}
          {partyQuery.data?.address ?? partyQuery.data?.commune ? (
            <Text className="text-small text-ink-muted mt-0.5">
              {partyQuery.data?.address ?? partyQuery.data?.commune}
            </Text>
          ) : null}
          {phieu.partyId ? (
            <Pressable
              onPress={() => router.push(`/nong-ho/${phieu.partyId}` as never)}
              accessibilityRole="button"
              accessibilityLabel="Xem hồ sơ nông hộ"
              hitSlop={8}
              className="flex-row items-center mt-2 self-start"
            >
              <Text className="text-caption text-primary font-semibold">Xem hồ sơ</Text>
              <Ionicons name="chevron-forward" size={14} color="#dd1c2e" />
            </Pressable>
          ) : (
            // Phiếu tạo trước 2026-08-19 (thời "khách lẻ") — không có hồ sơ để mở.
            <Text className="text-small text-ink-muted mt-1">Phiếu cũ · chưa gắn hồ sơ</Text>
          )}
          {phieu.viTri ? (
            <View className="mt-2 pt-2 border-t border-border">
              <ViTriRow viTri={phieu.viTri} nhan={`Phiếu bán ${phieu.id}`} />
            </View>
          ) : null}
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
              <View className="h-10 w-10 rounded-input bg-amber-100 items-center justify-center mr-3">
                <Ionicons name="cube" size={20} color="#92400e" />
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
                  {formatQty(d.soLuong, d.donVi === 'lon' ? d.donViLon : d.donViCoBan)}
                  {d.donGia ? ` · ${formatVND(d.donGia)}/${d.donViCoBan}` : ''}
                </Text>
                {d.lo ? (
                  <Text className="text-small text-ink-muted mt-0.5">
                    Lô: {d.lo}
                    {d.hanDung ? ` · HSD: ${formatDate(d.hanDung)}` : ''}
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

        {phieu.anh && phieu.anh.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted mb-2">Ảnh bằng chứng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {phieu.anh.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: 100, height: 100, borderRadius: 10, backgroundColor: '#f3f4f6' }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
            <Text className="text-caption text-ink-muted">Tổng tiền</Text>
            <Text
              className={`text-h2 font-bold ${
                isHuy ? 'line-through opacity-60 text-ink' : 'text-primary'
              }`}
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

        {phieu.trangThai === 'ghi' && movesQuery.data && movesQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted mb-2">
              Sổ kho đã ghi ({movesQuery.data.length} dòng)
            </Text>
            {movesQuery.data.map((m) => {
              const line = dongHang.find((d) => d.vatTuId === m.vatTuId);
              return (
                <TheKhoRow key={m.id} move={m} donViCoBan={line?.donViCoBan ?? ''} />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {canCancel && phieu.trangThai === 'ghi' ? (
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Huỷ phiếu bán"
            variant="secondary"
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
        helperText="Huỷ phiếu bán đã ghi sẽ sinh dòng sổ ĐẢO DẤU (trả hàng về tồn), dòng cũ giữ nguyên để truy vết."
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
