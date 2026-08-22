import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPhieuTra } from '../../../src/api/erp/phieu-tra';
import { getMoves } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { formatDateTime, formatQty, formatVND } from '../../../src/features/vat-tu/format';
import { PHUONG_THUC_LABEL } from '../../../src/features/vat-tu/payment';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { Button } from '../../../src/components/Button';

export default function PhieuTraDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const traId = typeof id === 'string' ? id : '';

  const q = useQuery({
    queryKey: ['phieu-tra', 'one', traId],
    queryFn: () => getPhieuTra(traId),
    enabled: !!traId,
  });
  const movesQuery = useQuery({
    queryKey: ['moves', { chungTuId: traId }],
    queryFn: () => getMoves({ chungTuId: traId }),
    enabled: !!traId,
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
          {q.error ? apiErrorMessage(q.error) : 'Không tìm thấy phiếu trả'}
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data;

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
          <View className="rounded-input bg-blue-50 px-2 py-1">
            <Text className="text-caption font-semibold text-blue-800">Khách trả</Text>
          </View>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="receipt-outline" size={18} color="#6b7280" />
              <Text className="text-caption text-ink-muted ml-2">Phiếu bán gốc</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/vat-tu/ban-hang/${phieu.phieuGocId}` as never)}
              className="flex-row items-center min-h-[44px]"
              accessibilityRole="button"
              accessibilityLabel="Mở phiếu bán gốc"
            >
              <Text className="text-caption text-primary font-semibold">{phieu.phieuGocId}</Text>
              <Ionicons name="chevron-forward" size={14} color="#dd1c2e" />
            </Pressable>
          </View>
          <Text className="text-body text-ink font-semibold mt-1">{phieu.khoTen ?? phieu.khoId}</Text>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-1">Lý do trả</Text>
          <Text className="text-body text-ink">{phieu.lyDo}</Text>
        </View>

        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted mb-3">Dòng hàng trả</Text>
          {phieu.dongHang.map((d, i) => {
            const sku = d.tenSkuSnapshot ?? d.vatTuId;
            return (
              <View
                key={i}
                className={`flex-row items-start py-2 ${
                  i < phieu.dongHang.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="h-10 w-10 rounded-input bg-blue-50 items-center justify-center mr-3">
                  <Ionicons name="arrow-undo" size={18} color="#1e40af" />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold">{sku}</Text>
                  <Text className="text-caption text-ink-muted">
                    {formatQty(d.soLuong, d.donViCoBanSnapshot)}
                    {d.donGia ? ` · ${formatVND(d.donGia)}` : ''}
                  </Text>
                  {d.lo ? <Text className="text-small text-ink-muted">Lô: {d.lo}</Text> : null}
                </View>
                <Text className="text-body text-ink font-semibold">
                  {formatVND((d.donGia ?? 0) * d.soLuong)}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row justify-between">
            <Text className="text-caption text-ink-muted">Giá trị trả</Text>
            <Text className="text-caption text-ink font-semibold">{formatVND(phieu.giaTri)}</Text>
          </View>
          {phieu.giamNo > 0 ? (
            <View className="flex-row justify-between mt-1">
              <Text className="text-caption text-ink-muted">Trừ vào nợ</Text>
              <Text className="text-caption text-ink">− {formatVND(phieu.giamNo)}</Text>
            </View>
          ) : null}
          <View className="flex-row justify-between mt-1 pt-1 border-t border-border">
            <Text className="text-body text-ink font-semibold">Hoàn khách</Text>
            <Text className="text-body text-primary font-bold">{formatVND(phieu.hoanTien)}</Text>
          </View>
          {phieu.hoanTien > 0 && phieu.phuongThucHoan ? (
            <Text className="text-small text-ink-muted mt-1">
              Hoàn qua {PHUONG_THUC_LABEL[phieu.phuongThucHoan]}
            </Text>
          ) : null}
        </View>

        {movesQuery.data && movesQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted mb-2">
              Sổ kho đã ghi ({movesQuery.data.length} dòng)
            </Text>
            {movesQuery.data.map((m) => {
              const line = phieu.dongHang.find((d) => d.vatTuId === m.vatTuId);
              return (
                <TheKhoRow key={m.id} move={m} donViCoBan={line?.donViCoBanSnapshot ?? ''} />
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
