import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { addMa, listLoai, listVatTu } from '../../src/api/erp/catalog-supplies';
import { tonKho } from '../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../src/api/client';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { useNumericInput } from '../../src/hooks/useNumericInput';
import { formatVND } from '../../src/features/vat-tu/format';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { usePhieuChuyenDraftStore } from '../../src/stores/phieu-chuyen-draft';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChip } from '../../src/components/FilterChip';
import { SkuRow } from '../../src/features/vat-tu/components/SkuRow';
import { QuantityStepper } from '../../src/features/vat-tu/components/QuantityStepper';
import type { VatTu } from '../../src/features/vat-tu/types';

export default function SkuPicker() {
  const params = useLocalSearchParams<{
    pairMa?: string;
    addToKiem?: string;
    addToChuyen?: string;
    khoId?: string;
    editGia?: string;
  }>();
  const pairMa = typeof params.pairMa === 'string' ? params.pairMa : undefined;
  const addToKiem = params.addToKiem === '1';
  const addToChuyen = params.addToChuyen === '1';
  const khoId = typeof params.khoId === 'string' && params.khoId ? params.khoId : undefined;
  // Cho sửa đơn giá tại chỗ — chỉ luồng bán truyền cờ này.
  const editGia = params.editGia === '1' && !addToChuyen && !addToKiem && !pairMa;

  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 300);
  const [loaiId, setLoaiId] = useState<string | undefined>(undefined);
  const [picked, setPicked] = useState<VatTu | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<'co_ban' | 'lon'>('co_ban');
  const [lo, setLo] = useState('');
  const [gia, setGia] = useState(0);
  const giaInput = useNumericInput(gia, setGia, { maxDecimals: 0 });

  const addLineReceipt = useReceiptDraftStore((s) => s.addLine);
  const addLineChuyen = usePhieuChuyenDraftStore((s) => s.addLine);
  // Route theo `addToChuyen` param — mặc định (bao gồm nhánh receipt) đi vào
  // receipt-draft như hôm nay. Không đụng nhánh `addToKiem` (đường riêng, xem
  // dưới) vì kiểm-kho có shape khác (không SL/đơn vị, chỉ pickedId).
  const addLine = addToChuyen ? addLineChuyen : addLineReceipt;
  const qc = useQueryClient();

  const pairMutation = useMutation({
    mutationFn: ({ skuId, ma }: { skuId: string; ma: string }) =>
      addMa(skuId, { ma, kieu: 'qr', nguon: 'tu_gan' }),
    onSuccess: (sku) => {
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
      qc.setQueryData(['vat-tu', 'one', sku.id], sku);
      Alert.alert('Đã gắn mã', `Mã "${pairMa}" đã gắn vào ${sku.ten}.`, [
        {
          text: 'Xong',
          onPress: () => {
            if (router.canGoBack()) router.back();
            else router.replace(`/vat-tu/sku/${sku.id}` as never);
          },
        },
      ]);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', { q: qDebounced, loaiId }],
    queryFn: () => listVatTu({ q: qDebounced, loaiId }),
    enabled: !picked,
    staleTime: 30_000,
  });

  // Tồn kho tại kho đang thao tác — 1 request cả bảng, không N+1 per-SKU.
  const tonQuery = useQuery({
    queryKey: ['ton-kho', { khoId }],
    queryFn: () => tonKho({ khoId }),
    enabled: Boolean(khoId),
    staleTime: 30_000,
  });
  const tonMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of tonQuery.data ?? []) map.set(row.vatTuId, row.soLuong);
    return map;
  }, [tonQuery.data]);

  // Gợi ý theo kho: SKU còn tồn nổi lên trước (sort stable, không đổi thứ tự nội bộ).
  const skuList = useMemo(() => {
    const data = skuQuery.data ?? [];
    if (!khoId || !tonQuery.data) return data;
    return [...data].sort(
      (a, b) =>
        ((tonMap.get(b.id) ?? 0) > 0 ? 1 : 0) - ((tonMap.get(a.id) ?? 0) > 0 ? 1 : 0),
    );
  }, [skuQuery.data, khoId, tonQuery.data, tonMap]);

  const backToList = useCallback(() => {
    setPicked(null);
    setUnit('co_ban');
    setQty(1);
    setLo('');
  }, []);

  // Android hardware back: khi đã pick SKU → quay lại list thay vì đóng picker.
  useEffect(() => {
    if (!picked) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToList();
      return true;
    });
    return () => sub.remove();
  }, [picked, backToList]);

  const canAdd = useMemo(() => Boolean(picked) && qty > 0, [picked, qty]);

  const onAdd = () => {
    if (!picked) return;
    addLine({
      vatTuId: picked.id,
      tenSku: picked.ten,
      donViCoBan: picked.donViCoBan,
      donViLon: picked.donViLon,
      heSoQuyDoi: picked.heSoQuyDoi,
      soLuong: qty,
      donVi: unit,
      lo: lo.trim() || undefined,
      // Chuyển kho nội bộ KHÔNG kèm giá (giá vốn kế thừa từ ledger phía server).
      donGia: addToChuyen ? undefined : editGia ? gia : picked.giaBan,
    });
    router.back();
  };

  if (!picked) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Chọn vật tư' }} />
        <View className="px-4 pt-3">
          <Input
            placeholder="Tìm theo tên / mã / barcode..."
            leftIcon="search-outline"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
          />
        </View>
        <View className="pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4, gap: 8 }}
          >
            <FilterChip label="Tất cả" active={!loaiId} onPress={() => setLoaiId(undefined)} />
            {(loaiQuery.data ?? []).map((l) => (
              <FilterChip
                key={l.id}
                label={l.ten}
                active={loaiId === l.id}
                onPress={() => setLoaiId(l.id)}
              />
            ))}
          </ScrollView>
        </View>
        {skuQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : skuQuery.isError ? (
          <ErrorState
            message={apiErrorMessage(skuQuery.error)}
            onRetry={() => void skuQuery.refetch()}
          />
        ) : (
          <FlatList
            data={skuList}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <SkuRow
                sku={item}
                ton={khoId && tonQuery.data ? tonMap.get(item.id) ?? 0 : undefined}
                onPress={() => {
                  if (pairMa) {
                    Alert.alert(
                      'Gắn mã',
                      `Gắn mã "${pairMa}" vào SKU "${item.ten}"?`,
                      [
                        { text: 'Huỷ', style: 'cancel' },
                        {
                          text: 'Gắn mã',
                          onPress: () =>
                            pairMutation.mutate({ skuId: item.id, ma: pairMa }),
                        },
                      ],
                    );
                    return;
                  }
                  if (addToKiem) {
                    // expo-router tự encode params — không encodeURIComponent tay để tránh double-decode.
                    router.replace({
                      pathname: '/vat-tu/kiem-kho/new',
                      params: {
                        pickedId: item.id,
                        pickedTen: item.ten,
                        donViCoBan: item.donViCoBan,
                      },
                    } as never);
                    return;
                  }
                  setPicked(item);
                  setUnit('co_ban');
                  setQty(1);
                  setGia(item.giaBan ?? 0);
                }}
                right={<Ionicons name="chevron-forward" size={18} color="#9ca3af" />}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="cube-outline"
                title="Không có vật tư phù hợp"
                message="Thử đổi từ khoá tìm kiếm hoặc bỏ bộ lọc loại."
                cta={
                  q || loaiId
                    ? {
                        label: 'Xem tất cả',
                        onPress: () => {
                          setQ('');
                          setLoaiId(undefined);
                        },
                        variant: 'outline',
                      }
                    : undefined
                }
              />
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: picked.ten,
          headerLeft: () => (
            <Pressable onPress={backToList} hitSlop={12} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="chevron-back" size={26} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={backToList}
            className="flex-row items-center pb-2"
            hitSlop={4}
          >
            <Ionicons name="chevron-back" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-1">Chọn vật tư khác</Text>
          </Pressable>
          <SkuRow
            sku={picked}
            ton={khoId && tonQuery.data ? tonMap.get(picked.id) ?? 0 : undefined}
          />
          <Text className="text-caption text-ink-muted mt-3 mb-1">Số lượng</Text>
          <QuantityStepper
            sku={picked}
            value={qty}
            unit={unit}
            onChange={({ soLuong, donVi }) => {
              setQty(soLuong);
              setUnit(donVi);
            }}
          />
          {editGia ? (
            <View className="mt-3">
              <Input
                label={`Đơn giá (đ/${picked.donViCoBan})`}
                placeholder="Giá bán"
                keyboardType="decimal-pad"
                value={giaInput.value}
                onChangeText={giaInput.onChangeText}
                onBlur={giaInput.onBlur}
              />
              {picked.giaBan != null && gia !== picked.giaBan ? (
                <Text className="text-small text-ink-muted mt-1">
                  Giá niêm yết: {formatVND(picked.giaBan)}/{picked.donViCoBan}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View className="mt-3">
            <Input
              label="Lô (không bắt buộc)"
              placeholder="Số lô sản xuất"
              value={lo}
              onChangeText={setLo}
              autoCapitalize="none"
            />
          </View>
        </ScrollView>
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button label="Thêm vào phiếu" disabled={!canAdd} onPress={onAdd} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

