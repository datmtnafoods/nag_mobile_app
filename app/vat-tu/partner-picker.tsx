import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { apiErrorMessage } from '../../src/api/client';
import { listParties } from '../../src/api/erp/parties';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import {
  ChonNongHo,
  giaiQuyetHo,
  hoHopLe,
  type KetQuaChonHo,
} from '../../src/features/den-thua/components/ChonNongHo';

type Kind = 'ncc' | 'nongHo' | 'htx';

/**
 * Chọn đối tác cho phiếu vật tư.
 *
 * - `kind=ncc` (nhập kho): nhập tay tên NCC — backend phiếu nhập nhận `ncc` là
 *   chuỗi, chưa có sổ NCC dùng chung.
 * - `kind=nongHo` (bán hàng): BẮT BUỘC gắn hồ sơ nông hộ thật. Tái dùng
 *   `ChonNongHo` (chọn hộ có sẵn / tạo hộ mới, quét CCCD) — cùng component với
 *   luồng tạo thửa.
 * - `kind=htx` (bán sỉ): chọn hồ sơ HTX (partyKind 'cooperative') — list đơn
 *   giản + tìm kiếm, KHÔNG dùng ChonNongHo (đó là luồng hộ + CCCD).
 */
export default function PartnerPicker() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = kindParam === 'ncc' ? 'ncc' : kindParam === 'htx' ? 'htx' : 'nongHo';
  const isNCC = kind === 'ncc';
  const isHTX = kind === 'htx';

  const setPartner = useReceiptDraftStore((s) => s.setPartner);
  const qc = useQueryClient();

  const [manualName, setManualName] = useState('');
  const [kq, setKq] = useState<KetQuaChonHo>({ loai: 'chon', party: null });
  const [htxQ, setHtxQ] = useState('');
  const htxQDebounced = useDebouncedValue(htxQ, 300);
  const htxQuery = useQuery({
    queryKey: ['parties', 'htx', htxQDebounced],
    queryFn: () => listParties({ kind: 'cooperative', q: htxQDebounced }),
    enabled: isHTX,
  });

  const manualValid = useMemo(() => manualName.trim().length >= 2, [manualName]);

  const submitManual = () => {
    if (!manualValid) return;
    setPartner({ ten: manualName.trim(), kind: 'ncc' });
    router.back();
  };

  // Chốt nông hộ: 'chon' trả id sẵn có, 'moi' TẠO hồ sơ thật rồi trả id.
  const chotHo = useMutation({
    mutationFn: async () => {
      const partyId = await giaiQuyetHo(kq, {});
      if (!partyId) throw new Error('Chọn hoặc tạo nông hộ để tiếp tục.');
      // `bo_qua` không xảy ra ở đây (không truyền `choBoQua`), nhưng union vẫn
      // gồm nhánh đó nên phải bóc rõ ràng.
      const ten =
        kq.loai === 'chon' ? (kq.party?.name ?? '') : kq.loai === 'moi' ? kq.ten.trim() : '';
      return { partyId, ten };
    },
    onSuccess: ({ partyId, ten }) => {
      setPartner({ id: partyId, ten, kind: 'nongHo' });
      // Hộ mới vừa tạo phải xuất hiện ở mọi danh sách/tìm kiếm hộ.
      qc.invalidateQueries({ queryKey: ['parties'] });
      router.back();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  if (isHTX) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Chọn HTX' }} />
        <View className="px-4 pt-3">
          <Input
            placeholder="Tìm HTX theo tên / SĐT..."
            leftIcon="search-outline"
            value={htxQ}
            onChangeText={setHtxQ}
            autoCapitalize="none"
          />
        </View>
        {htxQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : htxQuery.isError ? (
          <ErrorState
            message={apiErrorMessage(htxQuery.error)}
            onRetry={() => void htxQuery.refetch()}
          />
        ) : (
          <FlatList
            data={htxQuery.data ?? []}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setPartner({ id: item.id, ten: item.name, kind: 'htx' });
                  router.back();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Chọn ${item.name}`}
                className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
              >
                <View className="h-10 w-10 rounded-input bg-green-100 items-center justify-center mr-3">
                  <Ionicons name="people-outline" size={20} color="#166534" />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.phones[0] ? (
                    <Text className="text-caption text-ink-muted">{item.phones[0]}</Text>
                  ) : null}
                  {item.address ? (
                    <Text className="text-small text-ink-muted" numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="Không tìm thấy HTX"
                message="Thử đổi từ khoá tìm kiếm."
              />
            }
          />
        )}
      </SafeAreaView>
    );
  }

  if (isNCC) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Nhà cung cấp' }} />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="px-4 pt-3 flex-1">
            <Input
              label="Tên nhà cung cấp"
              placeholder="VD: NCC Nông Nghiệp Miền Nam"
              leftIcon="business-outline"
              value={manualName}
              onChangeText={setManualName}
            />
          </View>
          <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
            <Button label="Lưu" disabled={!manualValid} onPress={submitManual} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Khách hàng' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-blue-50 border border-blue-200 p-3 mb-4 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#1e40af" />
            <Text className="text-small text-blue-900 ml-2 flex-1">
              Mỗi phiếu bán phải gắn một hồ sơ nông hộ. Chưa có hộ thì tạo nhanh ở tab "Hộ
              mới" — chỉ cần họ tên là lưu được.
            </Text>
          </View>

          <ChonNongHo giaTri={kq} onChange={setKq} />
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={kq.loai === 'moi' ? 'Tạo hộ & chọn' : 'Chọn hộ này'}
            loading={chotHo.isPending}
            disabled={!hoHopLe(kq) || chotHo.isPending}
            onPress={() => chotHo.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
