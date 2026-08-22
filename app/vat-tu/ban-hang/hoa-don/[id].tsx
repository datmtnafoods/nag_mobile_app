import { useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getReceipt } from '../../../../src/api/erp/warehouse';
import { guiTinNhan, taoHoacLayHoiThoai } from '../../../../src/api/erp/inbox';
import { permsForInbox } from '../../../../src/features/inbox/perms';
import { usePermissions } from '../../../../src/auth/store';
import { apiErrorMessage } from '../../../../src/api/client';
import { formatDateTime, formatQty, formatVND } from '../../../../src/features/vat-tu/format';
import { conNo, deriveTrangThaiTT, TT_META, tongTienHieuLuc } from '../../../../src/features/vat-tu/payment';
import { Button } from '../../../../src/components/Button';
import type { PhieuBan } from '../../../../src/features/vat-tu/types';

export default function HoaDon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const invoiceRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const inboxPerms = permsForInbox(usePermissions());

  const q = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getReceipt(receiptId),
    enabled: !!receiptId,
  });

  const guiInbox = useMutation({
    mutationFn: async (p: PhieuBan) => {
      if (!p.partyId) throw new Error('Khách lẻ không có hội thoại.');
      const kind = p.partyKind === 'cooperative' ? 'htx' : 'nongHo';
      const ht = await taoHoacLayHoiThoai(p.partyId, p.partyName ?? 'Khách', kind);
      await guiTinNhan(ht.id, {
        loai: 'hoa_don',
        noiDung: `Hoá đơn phiếu ${p.id}`,
        phieuId: p.id,
        phieu: {
          phieuId: p.id,
          soTien: tongTienHieuLuc(p),
          conNo: conNo(p),
          ngay: p.taoLuc,
          soMatHang: p.dongHang.length,
          tenHangDau: p.dongHang[0]?.tenSkuSnapshot,
        },
      });
      return ht.id;
    },
    onSuccess: (htId) => router.push(`/inbox/${htId}` as never),
    onError: (err) => Alert.alert('Chưa gửi được', apiErrorMessage(err)),
  });

  const onShare = async () => {
    try {
      setSharing(true);
      const uri = await captureRef(invoiceRef, { format: 'png', quality: 0.95 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Không chia sẻ được', 'Thiết bị không hỗ trợ chia sẻ.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Chia sẻ hoá đơn' });
    } catch (err) {
      Alert.alert('Lỗi', apiErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

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
  const phaiThu = tongTienHieuLuc(phieu);
  const daThu = phieu.daThu ?? 0;
  const con = conNo(phieu);
  const ttStatus = deriveTrangThaiTT(daThu, phaiThu);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Hoá đơn' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, alignItems: 'center' }}>
        {/* View chụp ảnh — nền trắng, fix-width để ảnh ổn định. */}
        <View
          ref={invoiceRef}
          collapsable={false}
          style={{ width: 340, backgroundColor: '#ffffff' }}
          className="rounded-card border border-border p-4"
        >
          <View className="items-center mb-3">
            <Text className="text-h2 text-primary font-bold">NaGreen</Text>
            <Text className="text-caption text-ink-muted">Hoá đơn bán vật tư</Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-caption text-ink-muted">Số phiếu</Text>
            <Text className="text-caption text-ink font-semibold">{phieu.id}</Text>
          </View>
          <View className="flex-row justify-between mt-0.5">
            <Text className="text-caption text-ink-muted">Ngày</Text>
            <Text className="text-caption text-ink">{formatDateTime(phieu.taoLuc)}</Text>
          </View>
          <View className="flex-row justify-between mt-0.5">
            <Text className="text-caption text-ink-muted">Khách hàng</Text>
            <Text className="text-caption text-ink font-semibold">
              {phieu.partyName ?? 'Khách lẻ'}
            </Text>
          </View>
          <View className="flex-row justify-between mt-0.5">
            <Text className="text-caption text-ink-muted">Kho</Text>
            <Text className="text-caption text-ink">{phieu.khoTen ?? phieu.khoId}</Text>
          </View>

          {/* Bảng dòng hàng */}
          <View className="mt-3 pt-3 border-t border-border">
            {dongHang.map((d, i) => (
              <View
                key={i}
                className={`flex-row items-start py-1.5 ${
                  i < dongHang.length - 1 ? 'border-b border-border/60' : ''
                }`}
              >
                <View className="flex-1 pr-2">
                  <Text className="text-caption text-ink font-semibold">{d.tenSku ?? d.vatTuId}</Text>
                  <Text className="text-small text-ink-muted">
                    {formatQty(d.soLuong, d.donVi === 'lon' ? d.donViLon : d.donViCoBan)}
                    {d.donGia ? ` × ${formatVND(d.donGia)}` : ''}
                  </Text>
                </View>
                <Text className="text-caption text-ink font-semibold">
                  {formatVND((d.donGia ?? 0) * d.soLuongCoBan)}
                </Text>
              </View>
            ))}
          </View>

          {/* Tổng kết */}
          <View className="mt-3 pt-3 border-t border-border">
            {phieu.giamGia ? (
              <>
                <View className="flex-row justify-between">
                  <Text className="text-caption text-ink-muted">Tạm tính</Text>
                  <Text className="text-caption text-ink">
                    {formatVND(phieu.tongTien + (phieu.giamGia ?? 0))}
                  </Text>
                </View>
                <View className="flex-row justify-between mt-0.5">
                  <Text className="text-caption text-ink-muted">Giảm giá</Text>
                  <Text className="text-caption text-ink">− {formatVND(phieu.giamGia)}</Text>
                </View>
              </>
            ) : null}
            {phieu.daTra ? (
              <View className="flex-row justify-between mt-0.5">
                <Text className="text-caption text-ink-muted">Hàng đã trả</Text>
                <Text className="text-caption text-ink">− {formatVND(phieu.daTra)}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between mt-1 pt-1 border-t border-border">
              <Text className="text-body text-ink font-semibold">Phải thu</Text>
              <Text className="text-body text-primary font-bold">{formatVND(phaiThu)}</Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-caption text-ink-muted">Đã thu</Text>
              <Text className="text-caption text-ink">{formatVND(daThu)}</Text>
            </View>
            {con > 0 ? (
              <View className="flex-row justify-between mt-0.5">
                <Text className="text-caption text-ink-muted">Còn nợ</Text>
                <Text className="text-caption text-red-600 font-semibold">{formatVND(con)}</Text>
              </View>
            ) : null}
            <View className="flex-row justify-end mt-2">
              <View className={`rounded-input px-2 py-1 ${TT_META[ttStatus].bg}`}>
                <Text className={`text-small font-semibold ${TT_META[ttStatus].text}`}>
                  {TT_META[ttStatus].label}
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-small text-ink-soft text-center mt-4">
            Cảm ơn quý khách · NaGreen
          </Text>
        </View>
      </ScrollView>

      <View className="px-4 pb-4 pt-2 border-t border-border bg-bg gap-y-2">
        <Button
          label={sharing ? 'Đang tạo ảnh...' : 'Chia sẻ hoá đơn'}
          loading={sharing}
          onPress={onShare}
        />
        {inboxPerms.canSend && phieu.partyId ? (
          <Button
            label="Gửi qua inbox"
            variant="secondary"
            loading={guiInbox.isPending}
            onPress={() => guiInbox.mutate(phieu)}
          />
        ) : null}
        <Button
          label="Xem chi tiết phiếu"
          variant="secondary"
          onPress={() => router.replace(`/vat-tu/ban-hang/${phieu.id}` as never)}
        />
      </View>
    </SafeAreaView>
  );
}
