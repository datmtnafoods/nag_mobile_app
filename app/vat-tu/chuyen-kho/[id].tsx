import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  duyetLech,
  getPhieuChuyen,
  huyKeHoach,
  xacNhanXuat,
} from '../../../src/api/erp/phieu-chuyen';
import { listKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { useAuthStore, usePermissions } from '../../../src/auth/store';
import {
  canDuyetLechChuyen,
  canLapPhieuChuyen,
  canXacNhanNhanChuyen,
  permsForVatTu,
} from '../../../src/features/vat-tu/perms';
import { formatDateTime, formatQty } from '../../../src/features/vat-tu/format';
import { convertToBase } from '../../../src/features/vat-tu/unit-convert';
import { MOCK_VATTU } from '../../../src/mocks/vat-tu.mock';
import { ViTriRow } from '../../../src/features/location/components/ViTriRow';
import { Button } from '../../../src/components/Button';
import { CancelSheet } from '../../../src/components/CancelSheet';
import type { PhieuChuyenTrangThai } from '../../../src/features/vat-tu/types';

const STATUS_META: Record<PhieuChuyenTrangThai, { bg: string; text: string; label: string }> = {
  ke_hoach: { bg: 'bg-amber-50', text: 'text-amber-800', label: 'Kế hoạch' },
  dang_chuyen: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'Đang chuyển' },
  cho_duyet_lech: { bg: 'bg-orange-50', text: 'text-orange-800', label: 'Chờ duyệt lệch' },
  ghi: { bg: 'bg-green-50', text: 'text-green-800', label: 'Đã ghi' },
  huy: { bg: 'bg-red-50', text: 'text-red-800', label: 'Đã huỷ' },
};

function tenSku(vatTuId: string): string {
  return MOCK_VATTU.find((v) => v.id === vatTuId)?.ten ?? vatTuId;
}

function donViCoBanCua(vatTuId: string): string {
  return MOCK_VATTU.find((v) => v.id === vatTuId)?.donViCoBan ?? '';
}

export default function ChuyenKhoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const phieuId = typeof id === 'string' ? id : '';
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const canLap = canLapPhieuChuyen(perms);
  const canNhan = canXacNhanNhanChuyen(perms);
  const canDuyet = canDuyetLechChuyen(perms);
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [showDuyetLech, setShowDuyetLech] = useState(false);

  const q = useQuery({
    queryKey: ['phieu-chuyen', 'one', phieuId],
    queryFn: () => getPhieuChuyen(phieuId),
    enabled: Boolean(phieuId),
  });

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 60_000,
  });

  const xuatMut = useMutation({
    mutationFn: () => xacNhanXuat(phieuId),
    onSuccess: (updated) => {
      qc.setQueryData(['phieu-chuyen', 'one', phieuId], updated);
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const duyetMut = useMutation({
    mutationFn: (lyDo: string) => duyetLech(phieuId, lyDo),
    onSuccess: (updated) => {
      qc.setQueryData(['phieu-chuyen', 'one', phieuId], updated);
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      setShowDuyetLech(false);
    },
  });

  const huyMut = useMutation({
    mutationFn: (lyDo: string) => huyKeHoach(phieuId, lyDo),
    onSuccess: (updated) => {
      qc.setQueryData(['phieu-chuyen', 'one', phieuId], updated);
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
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
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu chuyển'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data;
  const statusMeta = STATUS_META[phieu.trangThai];
  const khoNguon = khoQuery.data?.find((k) => k.id === phieu.khoNguonId);
  const khoDich = khoQuery.data?.find((k) => k.id === phieu.khoDichId);
  // Custodian match: BE chưa enforce ở service (nợ K2, PROGRESS.md) — mobile
  // chặn trước cho khỏi ăn 403 giữa lúc bận.
  const laCustodianKhoDich = khoDich?.custodianUserId === userId;

  const dongHang = phieu.dongHang ?? [];
  const dongHangThucNhan = phieu.dongHangThucNhan ?? [];
  const isKeHoach = phieu.trangThai === 'ke_hoach';
  const isDangChuyen = phieu.trangThai === 'dang_chuyen';
  const isChoDuyet = phieu.trangThai === 'cho_duyet_lech';
  const isHuy = phieu.trangThai === 'huy';

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: phieu.id }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 pr-2">
            <Text className="text-h2 text-ink">{phieu.id}</Text>
            <Text className="text-caption text-ink-muted mt-1">
              Lập lúc: {formatDateTime(phieu.taoLuc)}
            </Text>
            <Text className="text-caption text-ink-muted">Người tạo: {phieu.nguoiTao}</Text>
          </View>
          <View className={`rounded-input px-2 py-1 ${statusMeta.bg}`}>
            <Text className={`text-caption font-semibold ${statusMeta.text}`}>
              {statusMeta.label}
            </Text>
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

        {isChoDuyet ? (
          <View className="rounded-card bg-orange-50 border border-orange-200 p-3 mb-4">
            <View className="flex-row items-center">
              <Ionicons name="warning" size={18} color="#c2410c" />
              <Text className="text-caption text-orange-800 font-semibold ml-2">
                Chờ duyệt lệch
              </Text>
            </View>
            <Text className="text-caption text-orange-800 mt-1">
              Số thực nhận ít hơn số xuất — có {phieu.variance?.length ?? 0} dòng chênh lệch.
              Admin/quản lý kho cần duyệt trước khi phiếu vào sổ.
            </Text>
          </View>
        ) : null}

        {/* Hai kho */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-2">Tuyến chuyển</Text>
          <View className="flex-row items-center">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Ionicons name="business" size={16} color="#6b7280" />
                <Text className="text-caption text-ink-muted ml-1">Nguồn</Text>
              </View>
              <Text className="text-body text-ink font-semibold mt-1" numberOfLines={2}>
                {khoNguon?.ten ?? phieu.khoNguonId}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#9ca3af" style={{ marginHorizontal: 8 }} />
            <View className="flex-1">
              <View className="flex-row items-center">
                <Ionicons name="car-outline" size={16} color="#6b7280" />
                <Text className="text-caption text-ink-muted ml-1">Đích</Text>
              </View>
              <Text className="text-body text-ink font-semibold mt-1" numberOfLines={2}>
                {khoDich?.ten ?? phieu.khoDichId}
              </Text>
              {khoDich?.custodianName ? (
                <Text className="text-small text-ink-muted mt-0.5">
                  Custodian: {khoDich.custodianName}
                </Text>
              ) : null}
            </View>
          </View>
          {phieu.nguoiXuat ? (
            <View className="mt-3 pt-3 border-t border-border">
              <Text className="text-small text-ink-muted">
                Xuất: {phieu.nguoiXuat} · {formatDateTime(phieu.xuatLuc)}
              </Text>
            </View>
          ) : null}
          {phieu.nguoiNhan ? (
            <Text className="text-small text-ink-muted mt-1">
              Nhận: {phieu.nguoiNhan} · {formatDateTime(phieu.nhanLuc)}
            </Text>
          ) : null}
          {phieu.nguoiDuyetLech ? (
            <Text className="text-small text-ink-muted mt-1">
              Duyệt lệch: {phieu.nguoiDuyetLech} · {formatDateTime(phieu.duyetLechLuc)}
              {phieu.lyDoDuyetLech ? ` · ${phieu.lyDoDuyetLech}` : ''}
            </Text>
          ) : null}
          <ViTriRow viTri={phieu.viTri} nhan={`Phiếu chuyển ${phieu.id}`} />
        </View>

        {/* Dòng hàng lập lệnh */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-3">Dòng hàng lập lệnh</Text>
          {dongHang.length === 0 ? (
            <Text className="text-caption text-ink-muted py-2">Chưa có dòng nào</Text>
          ) : (
            dongHang.map((d, i) => {
              const base = convertToBase(d.soLuong, d.donVi, {
                heSoQuyDoi: d.heSoQuyDoiSnapshot,
              });
              const donViCoBan =
                d.donViCoBanSnapshot ?? donViCoBanCua(d.vatTuId);
              return (
                <View
                  key={i}
                  className={`flex-row items-start py-2 ${
                    i < dongHang.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <View className="h-10 w-10 rounded-input bg-neutral-100 items-center justify-center mr-3">
                    <Ionicons name="cube" size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">
                      {d.tenSkuSnapshot ?? tenSku(d.vatTuId)}
                    </Text>
                    <Text className="text-caption text-ink-muted">
                      {formatQty(d.soLuong, d.donVi === 'lon' ? d.donViLonSnapshot : donViCoBan)}
                      {d.donVi === 'lon' && d.heSoQuyDoiSnapshot
                        ? ` (= ${formatQty(base, donViCoBan)})`
                        : ''}
                    </Text>
                    {d.lo ? (
                      <Text className="text-small text-ink-muted mt-0.5">Lô: {d.lo}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Số thực nhận + variance */}
        {dongHangThucNhan.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted mb-3">Số thực nhận</Text>
            {dongHangThucNhan.map((d, i) => {
              const donViCoBan =
                d.donViCoBanSnapshot ?? donViCoBanCua(d.vatTuId);
              const v = phieu.variance?.find((x) => x.vatTuId === d.vatTuId);
              return (
                <View
                  key={i}
                  className={`flex-row items-center py-2 ${
                    i < dongHangThucNhan.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Text className="flex-1 text-body text-ink">
                    {d.tenSkuSnapshot ?? tenSku(d.vatTuId)}
                  </Text>
                  <Text className="text-body text-ink font-semibold">
                    {formatQty(d.soLuong, d.donVi === 'lon' ? d.donViLonSnapshot : donViCoBan)}
                  </Text>
                  {v ? (
                    <Text className="ml-2 text-caption text-orange-700 font-semibold">
                      Δ {v.soLuongLech > 0 ? '+' : ''}
                      {formatQty(v.soLuongLech, donViCoBan)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Ảnh */}
        {phieu.anh && phieu.anh.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <Text className="text-caption text-ink-muted mb-2">Ảnh bằng chứng</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
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

        {phieu.ghiChu ? (
          <View className="rounded-card bg-white border border-border p-4">
            <Text className="text-caption text-ink-muted">Ghi chú</Text>
            <Text className="text-body text-ink mt-1">{phieu.ghiChu}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer actions theo trạng thái */}
      <View className="px-4 pb-4 pt-2 border-t border-border bg-bg gap-y-2">
        {isKeHoach && canLap ? (
          <>
            <Button
              label="Xác nhận xuất kho nguồn"
              loading={xuatMut.isPending}
              onPress={() =>
                Alert.alert(
                  'Xác nhận xuất',
                  `Hàng sẽ rời "${khoNguon?.ten ?? phieu.khoNguonId}" và đang trên đường tới "${khoDich?.ten ?? phieu.khoDichId}".`,
                  [
                    { text: 'Chưa', style: 'cancel' },
                    { text: 'Xuất', onPress: () => xuatMut.mutate() },
                  ],
                )
              }
            />
            <Button
              label="Huỷ lệnh (chưa xuất)"
              variant="secondary"
              onPress={() => setShowCancel(true)}
            />
          </>
        ) : null}
        {isDangChuyen && canNhan ? (
          <>
            {!laCustodianKhoDich ? (
              <View className="rounded-input bg-amber-50 border border-amber-200 p-3">
                <Text className="text-caption text-amber-800">
                  Bạn không phải người phụ trách kho đích. Chỉ custodian mới bấm "Xác nhận nhận" được (mobile chặn trước khi BE enforce).
                </Text>
              </View>
            ) : (
              <Button
                label="Xác nhận nhận về kho đích"
                onPress={() =>
                  router.push(`/vat-tu/chuyen-kho/xac-nhan-nhan/${phieu.id}` as never)
                }
              />
            )}
          </>
        ) : null}
        {isChoDuyet && canDuyet ? (
          <Button
            label="Duyệt lệch (đưa về ghi sổ)"
            onPress={() => setShowDuyetLech(true)}
          />
        ) : null}
      </View>

      <CancelSheet
        visible={showCancel}
        title={`Huỷ lệnh chuyển ${phieu.id}`}
        helperText="Lệnh chưa xuất — huỷ KHÔNG ảnh hưởng tồn kho. Ghi lý do để truy vết."
        placeholder="Ví dụ: đổi kế hoạch, sai kho đích"
        submitting={huyMut.isPending}
        errorMessage={huyMut.isError ? apiErrorMessage(huyMut.error) : null}
        onDismiss={() => {
          setShowCancel(false);
          huyMut.reset();
        }}
        onSubmit={(lyDo) => huyMut.mutate(lyDo)}
      />

      <CancelSheet
        visible={showDuyetLech}
        title={`Duyệt lệch phiếu ${phieu.id}`}
        helperText="Hao hụt đã lộ ra qua chênh lệch out−in trên chính phiếu — duyệt sẽ chuyển sang 'ghi sổ'. Nêu lý do (mất trên đường, hư hỏng…)."
        placeholder="Lý do lệch"
        submitting={duyetMut.isPending}
        errorMessage={duyetMut.isError ? apiErrorMessage(duyetMut.error) : null}
        submitLabel="Duyệt"
        onDismiss={() => {
          setShowDuyetLech(false);
          duyetMut.reset();
        }}
        onSubmit={(lyDo) => duyetMut.mutate(lyDo)}
      />
    </SafeAreaView>
  );
}
