import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPhieuChuyen, xacNhanNhan } from '../../../../src/api/erp/phieu-chuyen';
import { apiErrorMessage } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { useNumericInput } from '../../../../src/hooks/useNumericInput';
import { formatQty } from '../../../../src/features/vat-tu/format';
import { convertToBase } from '../../../../src/features/vat-tu/unit-convert';
import { MOCK_VATTU } from '../../../../src/mocks/vat-tu.mock';
import type { DongHangNhapLieu } from '../../../../src/features/vat-tu/types';

function tenSku(vatTuId: string): string {
  return MOCK_VATTU.find((v) => v.id === vatTuId)?.ten ?? vatTuId;
}

function donViCoBanCua(vatTuId: string): string {
  return MOCK_VATTU.find((v) => v.id === vatTuId)?.donViCoBan ?? '';
}

export default function XacNhanNhanChuyen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const phieuId = typeof id === 'string' ? id : '';
  const qc = useQueryClient();
  const [thucNhan, setThucNhan] = useState<DongHangNhapLieu[]>([]);

  const q = useQuery({
    queryKey: ['phieu-chuyen', 'one', phieuId],
    queryFn: () => getPhieuChuyen(phieuId),
    enabled: Boolean(phieuId),
  });

  // Prefill = số dự kiến khi lần đầu vào (KTV chỉ chỉnh những dòng có hao hụt).
  useEffect(() => {
    if (q.data && thucNhan.length === 0) {
      setThucNhan([...(q.data.dongHang ?? [])]);
    }
  }, [q.data, thucNhan.length]);

  const submit = useMutation({
    mutationFn: () => xacNhanNhan(phieuId, thucNhan),
    onSuccess: (result) => {
      qc.setQueryData(['phieu-chuyen', 'one', phieuId], result);
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      qc.invalidateQueries({ queryKey: ['ton-kho'] });
      qc.invalidateQueries({ queryKey: ['moves'] });
      router.replace(`/vat-tu/chuyen-kho/${phieuId}` as never);
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
  if (!q.data || q.data.trangThai !== 'dang_chuyen') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          Phiếu không ở trạng thái "đang chuyển" — không xác nhận nhận được.
        </Text>
        <View className="mt-4 w-full">
          <Button label="Quay lại" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const phieu = q.data;

  const updateQty = (idx: number, so: number) => {
    setThucNhan((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, soLuong: Math.max(0, so) };
      return next;
    });
  };

  // Cảnh báo Δ dương: BE chặn cứng `nhan_qua_xuat`. Cảnh báo Δ âm: sẽ vào cho_duyet_lech.
  const summary = thucNhan.map((d, i) => {
    const goc = phieu.dongHang[i];
    const gocBase = goc
      ? convertToBase(goc.soLuong, goc.donVi, { heSoQuyDoi: goc.heSoQuyDoiSnapshot })
      : 0;
    const thucBase = convertToBase(d.soLuong, d.donVi, {
      heSoQuyDoi: d.heSoQuyDoiSnapshot,
    });
    const delta = thucBase - gocBase;
    return { delta, gocBase, thucBase };
  });
  const coDuong = summary.some((s) => s.delta > 0);
  const coAm = summary.some((s) => s.delta < 0);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: `Xác nhận nhận · ${phieu.id}` }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mb-4">
            <Text className="text-caption text-blue-900">
              Kiểm đếm từng dòng khi hàng về xe. Số ít hơn dự kiến → phiếu sẽ vào "chờ duyệt
              lệch"; số nhiều hơn → hệ thống từ chối (phải sửa xuất trước).
            </Text>
          </View>

          {thucNhan.map((d, idx) => (
            <RowNumInput
              key={idx}
              row={d}
              deltaBase={summary[idx]?.delta ?? 0}
              onChange={(so) => updateQty(idx, so)}
            />
          ))}

          {coDuong ? (
            <View className="rounded-card bg-red-50 border border-red-200 p-3 mt-3">
              <View className="flex-row items-start">
                <Ionicons name="close-circle" size={16} color="#b91c1c" style={{ marginTop: 1 }} />
                <Text className="text-caption text-red-800 ml-2 flex-1">
                  Có dòng nhận nhiều hơn xuất. Không xuất được — hãy sửa số về ≤ số dự kiến, hoặc
                  yêu cầu bên nguồn xuất bù trước.
                </Text>
              </View>
            </View>
          ) : coAm ? (
            <View className="rounded-card bg-orange-50 border border-orange-200 p-3 mt-3">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={16} color="#c2410c" style={{ marginTop: 1 }} />
                <Text className="text-caption text-orange-800 ml-2 flex-1">
                  Có dòng nhận ít hơn xuất. Phiếu sẽ vào "chờ duyệt lệch" — admin/quản lý kho cần
                  duyệt trước khi hàng thật sự ghi sổ ở kho đích.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={coAm ? 'Nhận (sẽ vào chờ duyệt lệch)' : 'Nhận đủ'}
            disabled={coDuong || submit.isPending}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RowNumInput({
  row,
  deltaBase,
  onChange,
}: {
  row: DongHangNhapLieu;
  deltaBase: number;
  onChange: (soLuong: number) => void;
}) {
  const donViCoBan = row.donViCoBanSnapshot ?? donViCoBanCua(row.vatTuId);
  const donViHienThi = row.donVi === 'lon' ? row.donViLonSnapshot ?? donViCoBan : donViCoBan;
  const num = useNumericInput(row.soLuong, (v) => onChange(v));
  return (
    <View className="rounded-card bg-white border border-border p-3 mb-2">
      <Text className="text-body text-ink font-semibold" numberOfLines={1}>
        {row.tenSkuSnapshot ?? tenSku(row.vatTuId)}
      </Text>
      {row.lo ? (
        <Text className="text-caption text-ink-muted">Lô: {row.lo}</Text>
      ) : null}
      <View className="mt-2">
        <Input
          label={`Số thực nhận (${donViHienThi})`}
          keyboardType="numeric"
          value={num.value}
          onChangeText={num.onChangeText}
          onBlur={num.onBlur}
        />
      </View>
      {deltaBase !== 0 ? (
        <Text
          className={`text-caption mt-1 ${
            deltaBase > 0 ? 'text-red-700' : 'text-orange-700'
          } font-semibold`}
        >
          Δ so với dự kiến: {deltaBase > 0 ? '+' : ''}
          {formatQty(deltaBase, donViCoBan)}
        </Text>
      ) : null}
    </View>
  );
}
