import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getMoves,
  getReceipt,
  huyKeHoach,
  huyPhieu,
} from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import { canCancelReceipt, canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
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
import type { PhieuNhap } from '../../../src/features/vat-tu/types';
import { convertToBase } from '../../../src/features/vat-tu/unit-convert';

export default function PhieuNhapDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canCancel = canCancelReceipt(perms);
  const canNhap = canCreateReceipt(perms, 'nhap');
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const q = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getReceipt(receiptId),
    enabled: Boolean(receiptId),
  });

  const movesQuery = useQuery({
    queryKey: ['moves', { chungTuId: receiptId }],
    queryFn: () => getMoves({ chungTuId: receiptId }),
    enabled: Boolean(receiptId) && q.data?.phieu.trangThai === 'ghi',
  });

  const cancelMut = useMutation({
    mutationFn: async (lyDo: string) => {
      if (!q.data) throw new Error('Chưa có phiếu');
      if (q.data.phieu.trangThai === 'ke_hoach') return huyKeHoach(receiptId, lyDo);
      return huyPhieu(receiptId, lyDo);
    },
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
  if (q.isError || !q.data || q.data.phieu.kind !== 'nhap') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu nhập'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data.phieu as PhieuNhap;
  const dongHang = q.data.dongHang ?? [];
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai] ?? { bg: 'bg-neutral-100', text: 'text-ink-muted' };
  const statusLabel = statusLabelForKind(phieu.trangThai, 'nhap');
  const isHuy = phieu.trangThai === 'huy';
  const isKeHoach = phieu.trangThai === 'ke_hoach';
  const isGhi = phieu.trangThai === 'ghi';

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
            <Text className="text-caption text-ink-muted">Người tạo: {phieu.nguoiTao}</Text>
          </View>
          <View className="items-end gap-y-1">
            <KindBadge kind="nhap" />
            <View className={`rounded-input px-2 py-1 ${statusMeta.bg}`}>
              <Text className={`text-caption font-semibold ${statusMeta.text}`}>
                {statusLabel}
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

        {/* Meta */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <MetaRow icon="business-outline" label="Kho">
            <Text className="text-body text-ink font-semibold">
              {phieu.khoTen ?? phieu.khoId}
            </Text>
          </MetaRow>
          <MetaRow icon="storefront-outline" label="NCC">
            <Text className="text-body text-ink font-semibold">{phieu.ncc}</Text>
          </MetaRow>
          {phieu.expectedOn ? (
            <MetaRow icon="calendar-outline" label="Dự kiến nhận">
              <Text className="text-body text-ink">{formatDate(phieu.expectedOn)}</Text>
            </MetaRow>
          ) : null}
          {phieu.soHoaDon ? (
            <MetaRow icon="receipt-outline" label="Số HĐ">
              <Text className="text-body text-ink">{phieu.soHoaDon}</Text>
            </MetaRow>
          ) : null}
          {phieu.giamGia && phieu.giamGia > 0 ? (
            <MetaRow icon="pricetags-outline" label="Giảm giá">
              <Text className="text-body text-ink">{formatVND(phieu.giamGia)}</Text>
            </MetaRow>
          ) : null}
          <ViTriRow viTri={phieu.viTri} nhan={`Phiếu nhập ${phieu.id}`} />
        </View>

        {/* Dòng hàng snapshot */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-3">Dòng hàng</Text>
          {dongHang.map((d, i) => (
            <View
              key={i}
              className={`flex-row items-start py-2 ${
                i < dongHang.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <View className="h-10 w-10 rounded-input bg-green-100 items-center justify-center mr-3">
                <Ionicons name="cube" size={20} color="#166534" />
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
                  {d.donVi === 'lon' && d.heSoQuyDoi
                    ? ` (= ${formatQty(convertToBase(d.soLuong, 'lon', { heSoQuyDoi: d.heSoQuyDoi }), d.donViCoBan)})`
                    : ''}
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

        {/* Ảnh bằng chứng */}
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

        {/* Tổng */}
        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption text-ink-muted">Tổng số lượng</Text>
            <Text className="text-body text-ink font-semibold">
              {formatQty(phieu.tongSoLuong)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
            <Text className="text-caption text-ink-muted">Cần trả NCC</Text>
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

        {/* Sổ kho đã ghi */}
        {isGhi && movesQuery.data && movesQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted mb-2">
              Sổ kho đã ghi ({movesQuery.data.length} dòng)
            </Text>
            {movesQuery.data.map((m) => {
              const line = dongHang.find((d) => d.vatTuId === m.vatTuId);
              return (
                <TheKhoRow
                  key={m.id}
                  move={m}
                  donViCoBan={line?.donViCoBan ?? ''}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* Footer action */}
      <View className="px-4 pb-4 pt-2 border-t border-border bg-bg gap-y-2">
        {isKeHoach && canNhap ? (
          <>
            <Button
              label="Xác nhận nhận hàng"
              onPress={() =>
                router.push(`/vat-tu/nhap-kho/xac-nhan/${phieu.id}` as never)
              }
            />
            <Button
              label="Huỷ phiếu tạm"
              variant="secondary"
              onPress={() => {
                Alert.alert(
                  'Huỷ phiếu tạm',
                  'Phiếu tạm chưa vào sổ nên huỷ KHÔNG ảnh hưởng tồn kho. Ghi lại lý do để truy vết.',
                  [
                    { text: 'Đóng', style: 'cancel' },
                    {
                      text: 'Tiếp tục',
                      onPress: () => {
                        cancelMut.reset();
                        setShowCancel(true);
                      },
                    },
                  ],
                );
              }}
            />
          </>
        ) : null}
        {isGhi && canCancel ? (
          <Button
            label="Huỷ phiếu (ghi dòng sổ đảo dấu)"
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
        title={
          isKeHoach ? `Huỷ phiếu tạm ${phieu.id}` : `Huỷ phiếu ${phieu.id}`
        }
        helperText={
          isKeHoach
            ? 'Phiếu tạm chưa vào sổ — huỷ chỉ đổi cờ, KHÔNG ảnh hưởng tồn kho.'
            : 'Huỷ phiếu đã ghi sẽ sinh dòng sổ ĐẢO DẤU (trả hàng về tồn), dòng cũ giữ nguyên.'
        }
        placeholder="Ví dụ: NCC trả hàng, sai đơn"
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

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center py-1.5">
      <Ionicons name={icon} size={16} color="#6b7280" style={{ marginRight: 8 }} />
      <Text className="text-caption text-ink-muted w-28">{label}</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}
