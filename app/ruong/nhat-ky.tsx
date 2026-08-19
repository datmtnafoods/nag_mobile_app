import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { taoNhatKy, listNhatKy } from '../../src/api/erp/nhat-ky';
import { listVatTu } from '../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { WizardSection } from '../../src/features/vat-tu/components/WizardSection';
import { ImagePickerRow } from '../../src/features/vat-tu/components/ImagePickerRow';
import { MAX_ANH_PHIEU } from '../../src/features/vat-tu/anh';
import {
  LoaiNhatKyChips,
  LOAI_NHAT_KY_META,
} from '../../src/features/den-ruong/components/LoaiNhatKyChips';
import { AudioRecorderRow } from '../../src/features/den-ruong/components/AudioRecorderRow';
import { useDeviceLocation } from '../../src/hooks/useDeviceLocation';
import { useNumericInput } from '../../src/hooks/useNumericInput';
import { formatDateTime } from '../../src/features/vat-tu/format';
import type { DongVatTuNhatKy, LoaiNhatKy } from '../../src/features/den-ruong/types';

export default function GhiNhatKy() {
  const params = useLocalSearchParams<{ plotId?: string; partyId?: string; tenHo?: string }>();
  const plotId = typeof params.plotId === 'string' ? params.plotId : '';
  const partyId = typeof params.partyId === 'string' ? params.partyId : '';
  const tenHo = typeof params.tenHo === 'string' && params.tenHo ? params.tenHo : null;
  const qc = useQueryClient();

  const [loai, setLoai] = useState<LoaiNhatKy | null>(null);
  const [moTa, setMoTa] = useState('');
  const [anh, setAnh] = useState<string[]>([]);
  const [ghiAm, setGhiAm] = useState<{ uri: string; giay: number } | undefined>();

  // Bán vật tư — chỉ ghi nhận, KHÔNG trừ tồn kho.
  const [skuId, setSkuId] = useState<string | null>(null);
  const [soLuong, setSoLuong] = useState(1);
  const soLuongInput = useNumericInput(soLuong, setSoLuong, { min: 0, maxDecimals: 2 });

  const { viTri } = useDeviceLocation({ auto: true, accuracy: Location.Accuracy.High });

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', 'nhat-ky'],
    queryFn: () => listVatTu({}),
    enabled: loai === 'ban_vat_tu',
    staleTime: 60_000,
  });

  const lichSuQuery = useQuery({
    queryKey: ['nhat-ky', plotId],
    queryFn: () => listNhatKy({ plotId }),
    enabled: Boolean(plotId),
  });

  const luu = useMutation({
    mutationFn: async () => {
      if (!loai) throw new Error('Chọn loại nhật ký.');
      let dongVatTu: DongVatTuNhatKy[] | undefined;
      if (loai === 'ban_vat_tu') {
        const sku = (skuQuery.data ?? []).find((s) => s.id === skuId);
        if (!sku) throw new Error('Chọn vật tư đã bán.');
        if (!(soLuong > 0)) throw new Error('Nhập số lượng lớn hơn 0.');
        dongVatTu = [
          {
            vatTuId: sku.id,
            tenSku: sku.ten,
            donViCoBan: sku.donViCoBan,
            soLuong,
          },
        ];
      }
      return taoNhatKy({
        plotId,
        partyId,
        loai,
        moTa: moTa.trim() || undefined,
        anh,
        ghiAmUri: ghiAm?.uri,
        ghiAmGiay: ghiAm?.giay,
        dongVatTu,
        viTri: viTri ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nhat-ky'] });
      Alert.alert('Đã ghi nhật ký', 'Bản ghi đã lưu cho thửa này.', [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const coTheLuu =
    Boolean(plotId) &&
    Boolean(loai) &&
    (loai !== 'ban_vat_tu' || (Boolean(skuId) && soLuong > 0)) &&
    (Boolean(moTa.trim()) || anh.length > 0 || Boolean(ghiAm) || loai === 'ban_vat_tu');

  if (!plotId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">Thiếu mã thửa đất.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-white border border-border p-3 mb-4 flex-row items-center">
            <View className="h-10 w-10 rounded-input bg-green-100 items-center justify-center mr-3">
              <Ionicons name="leaf" size={20} color="#166534" />
            </View>
            <View className="flex-1">
              <Text className="text-body text-ink font-semibold">{tenHo ?? 'Nông hộ'}</Text>
              <Text className="text-caption text-ink-muted font-mono">{plotId}</Text>
            </View>
          </View>

          <WizardSection title="1 · Loại công việc">
            <LoaiNhatKyChips value={loai} onChange={setLoai} />
          </WizardSection>

          {loai === 'ban_vat_tu' ? (
            <WizardSection title="2 · Vật tư đã bán">
              {skuQuery.isPending ? (
                <ActivityIndicator color="#dd1c2e" />
              ) : (
                <>
                  <Text className="text-caption text-ink-muted mb-2">Chọn mặt hàng</Text>
                  <View className="flex-row flex-wrap mb-2">
                    {(skuQuery.data ?? []).slice(0, 12).map((s) => {
                      const active = skuId === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setSkuId(s.id)}
                          className={`h-11 mr-2 mb-2 px-3 rounded-input items-center justify-center border ${
                            active ? 'bg-primary border-primary' : 'bg-white border-border'
                          }`}
                        >
                          <Text
                            className={`text-caption font-semibold ${
                              active ? 'text-white' : 'text-ink'
                            }`}
                          >
                            {s.ten}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {skuId ? (
                    <Input
                      label={`Số lượng (${(skuQuery.data ?? []).find((s) => s.id === skuId)?.donViCoBan ?? ''})`}
                      keyboardType="numeric"
                      value={soLuongInput.value}
                      onChangeText={soLuongInput.onChangeText}
                      onBlur={soLuongInput.onBlur}
                    />
                  ) : null}
                  <View className="rounded-input bg-amber-50 border border-amber-200 p-3 flex-row">
                    <Ionicons name="information-circle-outline" size={16} color="#92400e" />
                    <Text className="text-small text-amber-900 ml-2 flex-1">
                      Đây chỉ là ghi nhận vào nhật ký — KHÔNG lập phiếu bán và KHÔNG trừ tồn
                      kho. Muốn trừ tồn thì lập phiếu bán ở mục Vật tư.
                    </Text>
                  </View>
                </>
              )}
            </WizardSection>
          ) : null}

          <WizardSection title={loai === 'ban_vat_tu' ? '3 · Mô tả' : '2 · Mô tả'}>
            <Input
              placeholder="Ghi ngắn gọn tình hình…"
              multiline
              numberOfLines={4}
              value={moTa}
              onChangeText={setMoTa}
            />
          </WizardSection>

          <WizardSection title={loai === 'ban_vat_tu' ? '4 · Hình ảnh' : '3 · Hình ảnh'}>
            <ImagePickerRow images={anh} onChange={setAnh} maxCount={MAX_ANH_PHIEU} />
          </WizardSection>

          <WizardSection title={loai === 'ban_vat_tu' ? '5 · Ghi âm' : '4 · Ghi âm'}>
            <AudioRecorderRow
              uri={ghiAm?.uri}
              giay={ghiAm?.giay}
              onChange={(v) => setGhiAm(v)}
            />
          </WizardSection>

          {/* Lịch sử */}
          {(lichSuQuery.data ?? []).length > 0 ? (
            <View className="rounded-card bg-white border border-border p-4">
              <Text className="text-caption text-ink-muted uppercase mb-2">
                Nhật ký trước đó ({lichSuQuery.data!.length})
              </Text>
              {lichSuQuery.data!.slice(0, 5).map((n) => {
                const meta = LOAI_NHAT_KY_META[n.loai];
                return (
                  <View key={n.id} className="py-2 border-b border-border">
                    <View className="flex-row items-center">
                      <Ionicons name={meta.icon} size={14} color={meta.mau} />
                      <Text className="text-caption text-ink font-semibold ml-1 flex-1">
                        {meta.nhan}
                      </Text>
                      <Text className="text-small text-ink-muted">
                        {formatDateTime(n.taoLuc)}
                      </Text>
                    </View>
                    {n.moTa ? (
                      <Text className="text-small text-ink-muted mt-1">{n.moTa}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Lưu nhật ký"
            loading={luu.isPending}
            disabled={!coTheLuu || luu.isPending}
            onPress={() => luu.mutate()}
          />
          {!loai ? (
            <Text className="text-small text-ink-muted mt-1 text-center">
              Chọn loại công việc để tiếp tục.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
