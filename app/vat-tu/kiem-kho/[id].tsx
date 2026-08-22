import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  canBangKiemKe,
  getMoves,
  getReceipt,
  huyKiemKeKeHoach,
  huyPhieu,
} from '../../../src/api/erp/warehouse';
import { getVatTu } from '../../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import {
  canCancelReceipt,
  canDoInventoryCount,
  permsForVatTu,
} from '../../../src/features/vat-tu/perms';
import {
  formatDateTime,
  formatQty,
  RECEIPT_STATUS_META,
  statusLabelForKind,
} from '../../../src/features/vat-tu/format';
import { KindBadge } from '../../../src/features/vat-tu/components/KindBadge';
import { DiffBadge } from '../../../src/features/vat-tu/components/DiffBadge';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { ViTriRow } from '../../../src/features/location/components/ViTriRow';
import { Button } from '../../../src/components/Button';
import { CancelSheet } from '../../../src/components/CancelSheet';
import type { PhieuKiemKe } from '../../../src/features/vat-tu/types';

export default function PhieuKiemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canKiem = canDoInventoryCount(perms);
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
    enabled: !!receiptId && q.data?.phieu.trangThai === 'ghi',
  });
  const phieu = q.data?.phieu as PhieuKiemKe | undefined;
  // `phieu.dongKiem` có thể undefined khi: (a) phiếu vừa load chưa xong, (b) người
  // dùng deep-link nhầm kind (route thấy id nhưng phiếu là nhap/ban/chuyen — thiếu
  // hẳn field `dongKiem`), (c) BE trả shape thiếu. Guard `?.` ở mọi điểm truy cập.
  const dongKiemSafe = phieu?.dongKiem ?? [];
  const skuMetaQuery = useQuery({
    queryKey: ['sku-meta-kiem', receiptId, dongKiemSafe.map((d) => d.vatTuId).join(',')],
    queryFn: async () => {
      if (!phieu) return {} as Record<string, { ten: string; donViCoBan: string }>;
      const entries = await Promise.all(
        dongKiemSafe.map(async (d) => {
          try {
            const sku = await getVatTu(d.vatTuId);
            return [d.vatTuId, { ten: sku.ten, donViCoBan: sku.donViCoBan }] as const;
          } catch {
            return [d.vatTuId, { ten: d.vatTuId, donViCoBan: '' }] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: Boolean(phieu),
  });

  const canBangMut = useMutation({
    mutationFn: () => canBangKiemKe(receiptId),
    onSuccess: (result) => {
      qc.setQueryData(['receipt', receiptId], result);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const cancelMut = useMutation({
    mutationFn: async (lyDo: string) => {
      if (!phieu) throw new Error('Chưa có phiếu');
      return phieu.trangThai === 'ke_hoach' ? huyKiemKeKeHoach(receiptId, lyDo) : huyPhieu(receiptId, lyDo);
    },
    onSuccess: (result) => {
      qc.setQueryData(['receipt', receiptId], result);
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
  if (q.isError || !q.data || q.data.phieu.kind !== 'kiem_ke') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu kiểm'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const p = q.data.phieu as PhieuKiemKe;
  const statusMeta = RECEIPT_STATUS_META[p.trangThai] ?? { bg: 'bg-neutral-100', text: 'text-ink-muted' };
  const statusLabel = statusLabelForKind(p.trangThai, 'kiem_ke');
  const isKeHoach = p.trangThai === 'ke_hoach';
  const isGhi = p.trangThai === 'ghi';
  const isHuy = p.trangThai === 'huy';
  const dongKiem = p.dongKiem ?? [];
  const totalLech = dongKiem.reduce((s, d) => s + (d.lech ?? 0), 0);
  const meta = skuMetaQuery.data ?? {};

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: p.id }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-2">
            <Text className="text-h2 text-ink">{p.id}</Text>
            <Text className="text-caption text-ink-muted mt-1">
              Ngày: {formatDateTime(p.taoLuc)}
            </Text>
          </View>
          <View className="items-end gap-y-1">
            <KindBadge kind="kiem_ke" />
            <View className={`rounded-input px-2 py-1 ${statusMeta.bg}`}>
              <Text className={`text-caption font-semibold ${statusMeta.text}`}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {isHuy && p.lyDoHuy ? (
          <View className="rounded-card bg-red-50 border border-red-200 p-3 mb-4">
            <Text className="text-caption text-red-700 font-semibold">Lý do huỷ</Text>
            <Text className="text-body text-red-800 mt-1">{p.lyDoHuy}</Text>
          </View>
        ) : null}

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="business-outline" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-2">Kho</Text>
          </View>
          <Text className="text-body text-ink font-semibold">{p.khoTen ?? p.khoId}</Text>
          {p.viTri ? (
            <View className="mt-2 pt-2 border-t border-border">
              <ViTriRow viTri={p.viTri} nhan={`Phiếu kiểm ${p.id}`} />
            </View>
          ) : null}
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-3">
            Dòng đếm ({dongKiem.length})
          </Text>
          {dongKiem.map((d, i) => {
            const m = meta[d.vatTuId] ?? { ten: d.vatTuId, donViCoBan: '' };
            return (
              <View
                key={i}
                className={`py-2 ${i < dongKiem.length - 1 ? 'border-b border-border' : ''}`}
              >
                <View className="flex-row items-start">
                  <View className="h-10 w-10 rounded-input bg-blue-50 items-center justify-center mr-3">
                    <Ionicons name="cube" size={20} color="#1e40af" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">{m.ten}</Text>
                    <Text className="text-caption text-ink-muted">
                      Thực đếm: {formatQty(d.thucTe, m.donViCoBan)}
                    </Text>
                    {d.tonSo != null ? (
                      <Text className="text-caption text-ink-muted">
                        Tồn sổ (lúc chốt): {formatQty(d.tonSo, m.donViCoBan)}
                      </Text>
                    ) : null}
                  </View>
                  {d.lech != null ? (
                    <DiffBadge lech={d.lech} donViCoBan={m.donViCoBan} compact />
                  ) : null}
                </View>
              </View>
            );
          })}
          {isGhi ? (
            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
              <Text className="text-caption text-ink-muted font-semibold">Tổng lệch</Text>
              <DiffBadge lech={totalLech} donViCoBan="" />
            </View>
          ) : null}
        </View>

        {p.ghiChu ? (
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted">Ghi chú</Text>
            <Text className="text-body text-ink mt-1">{p.ghiChu}</Text>
          </View>
        ) : null}

        {isGhi && movesQuery.data && movesQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4">
            <Text className="text-caption text-ink-muted mb-2">
              Sổ kho đã sinh ({movesQuery.data.length} dòng lệch)
            </Text>
            {movesQuery.data.map((m) => (
              <TheKhoRow
                key={m.id}
                move={m}
                donViCoBan={meta[m.vatTuId]?.donViCoBan ?? ''}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View className="px-4 pb-4 pt-2 border-t border-border bg-bg gap-y-2">
        {isKeHoach && canKiem ? (
          <>
            <Button
              label="Cân bằng kho"
              loading={canBangMut.isPending}
              onPress={() =>
                Alert.alert(
                  'Cân bằng kho',
                  'Đọc tồn sổ tại thời điểm chốt + sinh moves ±|lech| cho dòng lệch. Sau khi cân bằng phiếu không sửa được.',
                  [
                    { text: 'Huỷ', style: 'cancel' },
                    { text: 'Cân bằng', onPress: () => canBangMut.mutate() },
                  ],
                )
              }
            />
            <Button
              label="Huỷ phiếu tạm"
              variant="secondary"
              onPress={() => {
                cancelMut.reset();
                setShowCancel(true);
              }}
            />
          </>
        ) : null}
        {isGhi && canCancel ? (
          <Button
            label="Huỷ phiếu (ghi sổ đảo dấu)"
            variant="secondary"
            onPress={() => {
              cancelMut.reset();
              setShowCancel(true);
            }}
          />
        ) : null}
      </View>

      <CancelSheet
        visible={showCancel}
        title={isKeHoach ? `Huỷ phiếu tạm ${p.id}` : `Huỷ phiếu ${p.id}`}
        helperText={
          isKeHoach
            ? 'Phiếu … chưa cân bằng nên huỷ KHÔNG ảnh hưởng tồn kho.'
            : 'Huỷ phiếu … sẽ ghi dòng sổ ĐẢO DẤU (trả hàng về tồn), dòng cũ giữ nguyên để truy vết.'
        }
        placeholder="Ví dụ: đếm sai, đếm lại"
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
