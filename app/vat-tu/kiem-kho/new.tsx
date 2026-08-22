import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createKiemKe, getStock, listKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { formatQty } from '../../../src/features/vat-tu/format';
import { useKiemDraftStore } from '../../../src/stores/kiem-draft';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { useNumericInput } from '../../../src/hooks/useNumericInput';
import { DiffBadge } from '../../../src/features/vat-tu/components/DiffBadge';
import { WizardSection } from '../../../src/features/vat-tu/components/WizardSection';
import { ViTriBadge } from '../../../src/features/location/components/ViTriBadge';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';

export default function NewKiemKe() {
  const qc = useQueryClient();
  const params = useLocalSearchParams<{
    pickedId?: string;
    pickedTen?: string;
    donViCoBan?: string;
  }>();
  const {
    khoId,
    dongKiem,
    ghiChu,
    setKho,
    addSku,
    updateThucTe,
    removeAt,
    setGhiChu,
    setViTri,
    reset,
    toCreateBody,
  } = useKiemDraftStore();

  // Kiểm kê là nghiệp vụ dễ gian nhất — toạ độ giúp đối chiếu NV có mặt tại kho.
  const {
    state: viTriState,
    viTri: viTriDo,
    loi: viTriLoi,
    canAskAgain: viTriCanAsk,
    layViTri,
  } = useDeviceLocation({ auto: true });

  useEffect(() => {
    if (viTriDo) setViTri(viTriDo);
  }, [viTriDo, setViTri]);

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 5 * 60_000,
  });

  // Handle SKU picked từ sku-picker — expo-router đã decode params rồi, dùng as-is.
  const consumedPickIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!params.pickedId || !params.pickedTen) return;
    if (consumedPickIdRef.current === params.pickedId) return;
    consumedPickIdRef.current = params.pickedId;
    const result = addSku({
      vatTuId: params.pickedId,
      tenSku: params.pickedTen,
      donViCoBan: params.donViCoBan ?? '',
      thucTe: 0,
    });
    if (result.duplicate) {
      Alert.alert(
        'Đã có dòng',
        `Vật tư "${params.pickedTen}" đã có dòng — sửa trực tiếp bên dưới.`,
      );
    }
  }, [params.pickedId, params.pickedTen, params.donViCoBan, addSku]);

  const submit = useMutation({
    mutationFn: async () => {
      const body = toCreateBody();
      if (!body) throw new Error('Phiếu chưa đủ thông tin');
      return createKiemKe(body);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.setQueryData(['receipt', result.phieu.id], result);
      reset();
      router.replace(`/vat-tu/kiem-kho/${result.phieu.id}` as never);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const canSubmit = Boolean(khoId) && dongKiem.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Tạo phiếu kiểm',
          headerRight: () =>
            dongKiem.length > 0 ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Xoá nội dung đang soạn?', 'Toàn bộ dòng đếm sẽ bị xoá.', [
                    { text: 'Không', style: 'cancel' },
                    { text: 'Xoá', style: 'destructive', onPress: () => reset() },
                  ])
                }
                hitSlop={8}
                style={{ paddingHorizontal: 4 }}
              >
                <Text className="text-primary font-semibold">Xoá</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mb-4 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
            <Text className="text-small text-blue-800 ml-2 flex-1">
              Quét mã hoặc thêm SKU → nhập số đếm được. Kiểm kê là đếm CHÍNH XÁC — quét lại
              cùng SKU sẽ báo "đã có dòng", không +1.
            </Text>
          </View>

          <WizardSection title="1 · Kho">
            {khoQuery.isPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <View className="flex-row flex-wrap">
                {(khoQuery.data ?? []).map((k) => {
                  const active = khoId === k.id;
                  return (
                    <Pressable
                      key={k.id}
                      onPress={() => setKho(k.id)}
                      className={`h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border ${
                        active ? 'bg-primary border-primary' : 'bg-white border-border'
                      }`}
                    >
                      <Ionicons
                        name={k.loai === 'tong' ? 'business' : 'storefront-outline'}
                        size={14}
                        color={active ? '#fff' : '#6b7280'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className={`text-caption font-semibold ${
                          active ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {k.ten}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </WizardSection>

          <WizardSection
            title="2 · Dòng đếm"
            right={
              <Pressable
                onPress={() => router.push('/vat-tu/sku-picker?addToKiem=1' as never)}
                hitSlop={8}
                className="flex-row items-center"
              >
                <Ionicons name="add-circle" size={20} color="#dd1c2e" />
                <Text className="text-caption text-primary ml-1 font-semibold">Thêm SKU</Text>
              </Pressable>
            }
          >
            {dongKiem.length === 0 ? (
              <View className="py-6 items-center">
                <Ionicons name="clipboard-outline" size={36} color="#d1d5db" />
                <Text className="text-caption text-ink-muted mt-2">Chưa có dòng đếm nào</Text>
              </View>
            ) : (
              dongKiem.map((d, idx) => (
                <KiemLineRow
                  key={`${d.vatTuId}-${idx}`}
                  khoId={khoId}
                  line={d}
                  onChange={(v) => updateThucTe(idx, v)}
                  onRemove={() => removeAt(idx)}
                />
              ))
            )}
          </WizardSection>

          <WizardSection title="3 · Bằng chứng">
            <ViTriBadge
              state={viTriState}
              viTri={viTriDo}
              loi={viTriLoi}
              canAskAgain={viTriCanAsk}
              onRetry={() => void layViTri()}
            />
          </WizardSection>

          <WizardSection title="4 · Ghi chú">
            <Input
              placeholder="Ghi chú thêm..."
              multiline
              numberOfLines={3}
              value={ghiChu ?? ''}
              onChangeText={(v) => setGhiChu(v || undefined)}
            />
          </WizardSection>
        </ScrollView>

        {/* Footer: Lưu tạm — cân bằng đi qua detail sau khi lưu */}
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Lưu tạm phiếu kiểm"
            disabled={!canSubmit || submit.isPending}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
          <Text className="text-small text-ink-muted mt-1 text-center">
            Mở chi tiết để "Cân bằng kho".
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function KiemLineRow({
  khoId,
  line,
  onChange,
  onRemove,
}: {
  khoId?: string;
  line: { vatTuId: string; tenSku: string; donViCoBan: string; thucTe: number };
  onChange: (v: number) => void;
  onRemove: () => void;
}) {
  const stockQuery = useQuery({
    queryKey: ['stock', khoId, line.vatTuId],
    queryFn: () => getStock({ khoId: khoId!, vatTuId: line.vatTuId }),
    enabled: Boolean(khoId),
    staleTime: 20_000,
  });
  const tonSo = stockQuery.data?.soLuong ?? 0;
  const lech = line.thucTe - tonSo;
  const numeric = useNumericInput(line.thucTe, onChange);

  return (
    <View className="py-3 border-b border-border">
      <View className="flex-row items-start">
        <View className="h-10 w-10 rounded-input bg-blue-50 items-center justify-center mr-3">
          <Ionicons name="cube" size={20} color="#1e40af" />
        </View>
        <View className="flex-1">
          <Text className="text-body text-ink font-semibold" numberOfLines={1}>
            {line.tenSku}
          </Text>
          <Text className="text-small text-ink-muted mt-0.5">
            Sổ: {formatQty(tonSo, line.donViCoBan)}
            {stockQuery.isPending ? ' (đang tính...)' : ''}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="flex-1 mr-2">
              <Input
                label={`Thực đếm (${line.donViCoBan})`}
                keyboardType="numeric"
                value={numeric.value}
                onChangeText={numeric.onChangeText}
                onBlur={numeric.onBlur}
              />
            </View>
          </View>
          <View className="flex-row items-center">
            <Text className="text-small text-ink-muted mr-2">Lệch:</Text>
            <DiffBadge lech={lech} donViCoBan={line.donViCoBan} compact />
          </View>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel="Xoá dòng"
        >
          <Ionicons name="trash-outline" size={20} color="#b91c1c" />
        </Pressable>
      </View>
    </View>
  );
}
