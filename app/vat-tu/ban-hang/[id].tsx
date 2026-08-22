import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMoves, getReceipt, huyPhieu } from '../../../src/api/erp/warehouse';
import { thuTien } from '../../../src/api/erp/thanh-toan';
import { listPhieuTra } from '../../../src/api/erp/phieu-tra';
import { guiTinNhan, taoHoacLayHoiThoai } from '../../../src/api/erp/inbox';
import { permsForInbox } from '../../../src/features/inbox/perms';
import { getParty } from '../../../src/api/erp/parties';
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
import {
  conNo as calcConNo,
  deriveTrangThaiTT,
  PHUONG_THUC_LABEL,
  TT_META,
  tongTienHieuLuc,
} from '../../../src/features/vat-tu/payment';
import { KindBadge } from '../../../src/features/vat-tu/components/KindBadge';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { ThuTienSheet } from '../../../src/features/vat-tu/components/ThuTienSheet';
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
  const canThu = canCreateReceipt(perms, 'ban');
  const inboxPerms = permsForInbox(permissions);
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [showThu, setShowThu] = useState(false);

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

  // Phiếu khách trả liên quan (đổi/trả một phần).
  const traQuery = useQuery({
    queryKey: ['phieu-tra', { phieuGocId: receiptId }],
    queryFn: () => listPhieuTra({ phieuGocId: receiptId }),
    enabled: !!receiptId,
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

  const thuMut = useMutation({
    mutationFn: (input: Parameters<typeof thuTien>[1]) => thuTien(receiptId, input),
    onSuccess: (updated) => {
      qc.setQueryData(['receipt', receiptId], updated);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      setShowThu(false);
    },
  });

  // Mở (hoặc tạo) hội thoại với khách của phiếu này.
  const openInbox = useMutation({
    mutationFn: async (args: { nhacNo?: { con: number } }) => {
      const p = phieuBan;
      if (!p?.partyId) throw new Error('Khách lẻ không có hội thoại.');
      const kind = p.partyKind === 'cooperative' ? 'htx' : 'nongHo';
      const ht = await taoHoacLayHoiThoai(p.partyId, p.partyName ?? 'Khách', kind);
      if (args.nhacNo) {
        await guiTinNhan(ht.id, {
          loai: 'nhac_no',
          noiDung: `Phiếu ${p.id} còn nợ ${Math.round(args.nhacNo.con).toLocaleString('vi-VN')} đ. Anh/chị thu xếp giúp nhé.`,
          phieuId: p.id,
          phieu: {
            phieuId: p.id,
            soTien: tongTienHieuLuc(p),
            conNo: args.nhacNo.con,
            ngay: p.taoLuc,
            soMatHang: p.dongHang.length,
            tenHangDau: p.dongHang[0]?.tenSkuSnapshot,
          },
        });
      }
      return ht.id;
    },
    onSuccess: (htId) => {
      qc.invalidateQueries({ queryKey: ['inbox'] });
      router.push(`/inbox/${htId}` as never);
    },
    onError: (err) => Alert.alert('Chưa mở được', apiErrorMessage(err)),
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
  const dongHang = q.data.dongHang ?? [];
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai] ?? { bg: 'bg-neutral-100', text: 'text-ink-muted' };
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
            <Ionicons
              name={
                phieu.partyKind === 'cooperative'
                  ? 'people-outline'
                  : phieu.partyKind === 'khach_le'
                    ? 'walk-outline'
                    : 'person-outline'
              }
              size={18}
              color="#6b7280"
            />
            <Text className="text-caption text-ink-muted ml-2">
              {phieu.partyKind === 'cooperative'
                ? 'HTX'
                : phieu.partyKind === 'khach_le'
                  ? 'Khách lẻ'
                  : 'Khách hàng'}
            </Text>
          </View>
          <Text className="text-body text-ink font-semibold">
            {partyQuery.data?.name ?? phieu.partyName ?? phieu.khachLe?.ten ?? 'Khách lẻ'}
          </Text>
          {/* SĐT: từ hồ sơ (nông hộ/HTX) hoặc từ khách lẻ nhập tay. */}
          {partyQuery.data?.phones[0] ?? phieu.khachLe?.sdt ? (
            <Text className="text-caption text-ink-muted">
              {partyQuery.data?.phones[0] ?? phieu.khachLe?.sdt}
            </Text>
          ) : null}
          {partyQuery.data?.address ?? partyQuery.data?.commune ? (
            <Text className="text-small text-ink-muted mt-0.5">
              {partyQuery.data?.address ?? partyQuery.data?.commune}
            </Text>
          ) : null}
          {phieu.partyId && phieu.partyKind !== 'cooperative' ? (
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
          ) : !phieu.partyId && phieu.partyKind !== 'khach_le' ? (
            // Phiếu tạo trước 2026-08-19 (thời "khách lẻ" cũ) — không có hồ sơ.
            <Text className="text-small text-ink-muted mt-1">Phiếu cũ · chưa gắn hồ sơ</Text>
          ) : null}
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

        {/* Thanh toán — chỉ hiện với phiếu đã có lớp TIỀN (daThu != null). */}
        {!isHuy && phieu.daThu != null ? (
          (() => {
            const phaiThu = tongTienHieuLuc(phieu);
            const daThu = phieu.daThu ?? 0;
            const con = calcConNo(phieu);
            const ttStatus = deriveTrangThaiTT(daThu, phaiThu);
            return (
              <View className="rounded-card bg-white border border-border p-4 mt-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="wallet-outline" size={18} color="#6b7280" />
                    <Text className="text-caption text-ink-muted ml-2">Thanh toán</Text>
                  </View>
                  <View className={`rounded-input px-2 py-1 ${TT_META[ttStatus].bg}`}>
                    <Text className={`text-caption font-semibold ${TT_META[ttStatus].text}`}>
                      {TT_META[ttStatus].label}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-caption text-ink-muted">Đã thu</Text>
                  <Text className="text-caption text-ink font-semibold">{formatVND(daThu)}</Text>
                </View>
                {phieu.daTra ? (
                  <View className="flex-row justify-between mt-0.5">
                    <Text className="text-caption text-ink-muted">Hàng trả</Text>
                    <Text className="text-caption text-ink">− {formatVND(phieu.daTra)}</Text>
                  </View>
                ) : null}
                {con > 0 ? (
                  <View className="flex-row justify-between mt-0.5">
                    <Text className="text-caption text-ink-muted">Còn nợ</Text>
                    <Text className="text-caption text-red-600 font-semibold">{formatVND(con)}</Text>
                  </View>
                ) : null}
                {phieu.lanThu && phieu.lanThu.length > 0 ? (
                  <View className="mt-2 pt-2 border-t border-border">
                    {phieu.lanThu.map((lt) => {
                      const hoan = lt.soTien < 0;
                      return (
                        <View key={lt.id} className="flex-row justify-between py-0.5">
                          <Text className="text-small text-ink-muted">
                            {formatDateTime(lt.thuLuc)} · {PHUONG_THUC_LABEL[lt.phuongThuc]}
                          </Text>
                          <Text
                            className={`text-small font-semibold ${hoan ? 'text-red-600' : 'text-ink'}`}
                          >
                            {hoan ? `Hoàn ${formatVND(-lt.soTien)}` : formatVND(lt.soTien)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {con > 0 ? (
                  <View className="flex-row gap-2 mt-3">
                    {canThu ? (
                      <Pressable
                        onPress={() => {
                          thuMut.reset();
                          setShowThu(true);
                        }}
                        className="flex-1 min-h-[44px] rounded-input border border-primary items-center justify-center flex-row"
                        accessibilityRole="button"
                        accessibilityLabel="Thu thêm tiền"
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#dd1c2e" />
                        <Text className="text-caption text-primary font-semibold ml-1">Thu thêm</Text>
                      </Pressable>
                    ) : null}
                    {inboxPerms.canSend && phieu.partyId ? (
                      <Pressable
                        onPress={() => openInbox.mutate({ nhacNo: { con } })}
                        disabled={openInbox.isPending}
                        className="flex-1 min-h-[44px] rounded-input border border-amber-500 items-center justify-center flex-row"
                        accessibilityRole="button"
                        accessibilityLabel="Nhắc nợ qua tin nhắn"
                      >
                        <Ionicons name="notifications-outline" size={16} color="#b45309" />
                        <Text className="text-caption text-amber-700 font-semibold ml-1">Nhắc nợ</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })()
        ) : null}

        {traQuery.data && traQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted mb-2">
              Đổi trả ({traQuery.data.length})
            </Text>
            {traQuery.data.map((pt) => (
              <Pressable
                key={pt.id}
                onPress={() => router.push(`/vat-tu/doi-tra/${pt.id}` as never)}
                className="flex-row items-center justify-between py-2 min-h-[44px]"
                accessibilityRole="button"
                accessibilityLabel={`Mở phiếu trả ${pt.id}`}
              >
                <View className="flex-1 pr-2">
                  <Text className="text-caption text-ink font-semibold">{pt.id}</Text>
                  <Text className="text-small text-ink-muted" numberOfLines={1}>
                    {formatDateTime(pt.taoLuc)} · {pt.lyDo}
                  </Text>
                </View>
                <Text className="text-caption text-primary font-semibold">
                  − {formatVND(pt.giaTri)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#9ca3af" style={{ marginLeft: 4 }} />
              </Pressable>
            ))}
          </View>
        ) : null}

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

      {phieu.trangThai === 'ghi' ? (
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg gap-y-2">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Xem hoá đơn"
                onPress={() => router.push(`/vat-tu/ban-hang/hoa-don/${phieu.id}` as never)}
              />
            </View>
            {inboxPerms.canSend && phieu.partyId ? (
              <View className="flex-1">
                <Button
                  label="Nhắn tin"
                  variant="secondary"
                  loading={openInbox.isPending}
                  onPress={() => openInbox.mutate({})}
                />
              </View>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            {canThu ? (
              <View className="flex-1">
                <Button
                  label="Đổi trả"
                  variant="secondary"
                  onPress={() =>
                    router.push(`/vat-tu/doi-tra/new?phieuGocId=${phieu.id}` as never)
                  }
                />
              </View>
            ) : null}
            {canCancel ? (
              <View className="flex-1">
                <Button
                  label="Huỷ phiếu"
                  variant="secondary"
                  onPress={() => {
                    cancelMut.reset();
                    setShowCancel(true);
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <ThuTienSheet
        visible={showThu}
        conNo={calcConNo(phieu)}
        submitting={thuMut.isPending}
        errorMessage={thuMut.isError ? apiErrorMessage(thuMut.error) : null}
        onDismiss={() => {
          setShowThu(false);
          thuMut.reset();
        }}
        onSubmit={(input) => thuMut.mutate(input)}
      />

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
