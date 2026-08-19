import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getReceipt, xacNhanNhan } from '../../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { useNumericInput } from '../../../../src/hooks/useNumericInput';
import { formatQty } from '../../../../src/features/vat-tu/format';
import type { DongHangNhapLieu, PhieuNhap } from '../../../../src/features/vat-tu/types';

export default function XacNhanNhan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = typeof id === 'string' ? id : '';
  const qc = useQueryClient();
  const [dongThuc, setDongThuc] = useState<DongHangNhapLieu[]>([]);

  const q = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => getReceipt(receiptId),
    enabled: !!receiptId,
  });

  useEffect(() => {
    if (q.data?.phieu.kind === 'nhap' && dongThuc.length === 0) {
      setDongThuc([...(q.data.phieu as PhieuNhap).dongHang]);
    }
  }, [q.data, dongThuc.length]);

  const submit = useMutation({
    mutationFn: () => xacNhanNhan(receiptId, dongThuc),
    onSuccess: (result) => {
      qc.setQueryData(['receipt', receiptId], result);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      router.replace(`/vat-tu/nhap-kho/${receiptId}` as never);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (!q.data || q.data.phieu.kind !== 'nhap' || q.data.phieu.trangThai !== 'ke_hoach') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          Phiếu không ở trạng thái tạm — không xác nhận nhận được.
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data.phieu as PhieuNhap;
  const skuMeta = q.data.dongHang;

  const updateQty = (idx: number, soLuong: number) => {
    setDongThuc((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, soLuong: Math.max(0, soLuong) };
      return next;
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Xác nhận nhận hàng' }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mb-4 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
            <Text className="text-small text-blue-800 ml-2 flex-1">
              Nhập số lượng THỰC NHẬN cho từng dòng. Có thể lệch dự kiến (partial receipt). Khi
              xác nhận, phiếu sẽ chuyển từ "Phiếu tạm" sang "Đã nhập hàng" + ghi dòng sổ.
            </Text>
          </View>

          <Text className="text-caption text-ink-muted uppercase mb-2">Phiếu {phieu.id}</Text>
          <Text className="text-body text-ink mb-3">NCC: {phieu.ncc}</Text>

          {dongThuc.map((d, idx) => {
            const meta = skuMeta.find((s) => s.vatTuId === d.vatTuId);
            const originalLine = phieu.dongHang[idx];
            const unit = d.donVi === 'lon' ? meta?.donViLon ?? '' : meta?.donViCoBan ?? '';
            return (
              <ThucNhanRow
                key={idx}
                tenSku={meta?.tenSku ?? d.vatTuId}
                unit={unit}
                duKien={originalLine?.soLuong ?? 0}
                value={d.soLuong}
                onCommit={(n) => updateQty(idx, n)}
              />
            );
          })}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Xác nhận nhận + ghi sổ"
            loading={submit.isPending}
            disabled={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ThucNhanRow({
  tenSku,
  unit,
  duKien,
  value,
  onCommit,
}: {
  tenSku: string;
  unit: string;
  duKien: number;
  value: number;
  onCommit: (n: number) => void;
}) {
  const numeric = useNumericInput(value, onCommit);
  const diff = value - duKien;

  return (
    <View className="rounded-card bg-white border border-border p-3 mb-3">
      <Text className="text-body text-ink font-semibold">{tenSku}</Text>
      <Text className="text-caption text-ink-muted mb-2">
        Dự kiến: {formatQty(duKien, unit)}
      </Text>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Input
            label={`Thực nhận (${unit})`}
            keyboardType="numeric"
            value={numeric.value}
            onChangeText={numeric.onChangeText}
            onBlur={numeric.onBlur}
          />
        </View>
        {diff !== 0 ? (
          <Text
            className={`ml-3 text-body font-semibold ${
              diff > 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {diff > 0 ? `+${formatQty(diff, unit)}` : `−${formatQty(-diff, unit)}`}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => onCommit(duKien)}
        hitSlop={8}
        className="self-start rounded-input mt-1 px-3 py-2 bg-neutral-100 active:opacity-80"
      >
        <Text className="text-small text-ink">Về dự kiến</Text>
      </Pressable>
    </View>
  );
}
