import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlot, updatePlot } from '../../../src/api/erp/growing-areas';
import { apiErrorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { DateField } from '../../../src/components/DateField';
import { ErrorState } from '../../../src/components/ErrorState';
import { ChonCayTrong } from '../../../src/features/den-thua/components/ChonCayTrong';
import { CAY_XEN_GOI_Y } from '../../../src/features/den-thua/cay-trong';

/**
 * Sửa thông tin thửa: cây trồng chính · cây xen · ngày kích hoạt · ghi chú.
 * Ranh giới KHÔNG sửa ở đây (dùng "Sửa ranh" ở màn chi tiết). Lưu qua `updatePlot`.
 * ⚠️ Backend thật: mọi PATCH reset thửa về `pending`; `ngayGoc` mock-only.
 */
export default function SuaThongTinThua() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const plotId = typeof id === 'string' ? id : '';
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['thua', plotId],
    queryFn: () => getPlot(plotId),
    enabled: Boolean(plotId),
  });

  const [cayTrong, setCayTrong] = useState('');
  const [xenCanh, setXenCanh] = useState(false);
  const [cayXen, setCayXen] = useState('');
  const [ngayGoc, setNgayGoc] = useState<string | undefined>(undefined);
  const [ghiChu, setGhiChu] = useState('');
  const [daNap, setDaNap] = useState(false);

  // Nạp giá trị hiện tại vào form 1 lần khi query có data.
  useEffect(() => {
    if (daNap || !q.data) return;
    setCayTrong(q.data.cropName ?? '');
    const xen = q.data.cropXen ?? '';
    setXenCanh(Boolean(xen));
    setCayXen(xen);
    setNgayGoc(q.data.ngayGoc ? q.data.ngayGoc.slice(0, 10) : undefined);
    setGhiChu(q.data.note ?? '');
    setDaNap(true);
  }, [q.data, daNap]);

  const xenTrungCayChinh =
    xenCanh &&
    Boolean(cayXen.trim()) &&
    cayXen.trim().toLowerCase() === cayTrong.trim().toLowerCase();

  const luu = useMutation({
    mutationFn: () =>
      updatePlot(plotId, {
        cropName: cayTrong.trim() || undefined,
        // '' để CLEAR khi tắt xen canh; tên khi bật + khác cây chính.
        cropXen: xenCanh && cayXen.trim() && !xenTrungCayChinh ? cayXen.trim() : '',
        note: ghiChu.trim() || undefined,
        ngayGoc: ngayGoc ? new Date(ngayGoc).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thua', plotId] });
      qc.invalidateQueries({ queryKey: ['do-thua'] });
      qc.invalidateQueries({ queryKey: ['thua-list'] });
      qc.invalidateQueries({ queryKey: ['thua-by-party'] });
      router.back();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-soft">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Sửa thông tin thửa' }} />
        <ErrorState
          message={q.error ? apiErrorMessage(q.error) : 'Không tìm thấy thửa'}
          onRetry={() => void q.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Sửa thông tin thửa' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cây trồng + xen canh */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <ChonCayTrong
              label="Cây trồng chính"
              giaTri={cayTrong}
              onChange={setCayTrong}
              loaiTru={xenCanh && cayXen.trim() ? [cayXen] : undefined}
            />

            <View className="flex-row items-center justify-between py-1">
              <View className="flex-1 pr-3">
                <Text className="text-caption text-ink font-semibold">Trồng xen canh</Text>
                <Text className="text-small text-ink-muted">
                  Có cây phụ trồng xen trên cùng thửa.
                </Text>
              </View>
              <Switch
                value={xenCanh}
                onValueChange={setXenCanh}
                trackColor={{ true: '#dd1c2e', false: '#d1d5db' }}
              />
            </View>

            {xenCanh ? (
              <View className="mt-3">
                <ChonCayTrong
                  label="Cây xen (khác cây chính)"
                  giaTri={cayXen}
                  onChange={setCayXen}
                  placeholder="Chọn hoặc gõ cây trồng xen…"
                  goiY={CAY_XEN_GOI_Y}
                  loaiTru={cayTrong.trim() ? [cayTrong] : undefined}
                />
                {xenTrungCayChinh ? (
                  <Text className="text-small text-red-600 -mt-2">
                    Cây xen phải khác cây trồng chính.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Ngày kích hoạt */}
          <View className="rounded-card bg-white border border-border p-4 mb-4">
            <DateField
              label="Ngày kích hoạt / bắt đầu trồng"
              value={ngayGoc}
              onChange={setNgayGoc}
              maximumDate={new Date()}
            />
            <Text className="text-small text-ink-muted -mt-2">
              Lịch canh tác tính từ ngày này. Vườn đã trồng lâu thì chỉnh lại cho đúng.
            </Text>
          </View>

          {/* Ghi chú */}
          <View className="rounded-card bg-white border border-border p-4">
            <Input
              label="Ghi chú"
              placeholder="Đặc điểm nhận biết, đường vào…"
              multiline
              numberOfLines={3}
              value={ghiChu}
              onChangeText={setGhiChu}
            />
          </View>
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          <View className="flex-1">
            <Button label="Huỷ" variant="secondary" onPress={() => router.back()} />
          </View>
          <View className="flex-1">
            <Button
              label="Lưu"
              loading={luu.isPending}
              disabled={xenTrungCayChinh || luu.isPending}
              onPress={() => luu.mutate()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
