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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { listLoai, listVatTu } from '../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../src/api/client';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { SkuRow } from '../../src/features/vat-tu/components/SkuRow';
import { QuantityStepper } from '../../src/features/vat-tu/components/QuantityStepper';
import type { VatTu } from '../../src/features/vat-tu/types';

export default function SkuPicker() {
  const [q, setQ] = useState('');
  const [loaiId, setLoaiId] = useState<string | undefined>(undefined);
  const [picked, setPicked] = useState<VatTu | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<'co_ban' | 'lon'>('co_ban');
  const [lo, setLo] = useState('');

  const addLine = useReceiptDraftStore((s) => s.addLine);

  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', { q, loaiId }],
    queryFn: () => listVatTu({ q, loaiId }),
    enabled: !picked,
    staleTime: 30_000,
  });

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
      donGia: picked.giaBan,
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
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-caption text-red-700 text-center">
              {apiErrorMessage(skuQuery.error)}
            </Text>
          </View>
        ) : (
          <FlatList
            data={skuQuery.data ?? []}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <SkuRow
                sku={item}
                onPress={() => {
                  setPicked(item);
                  setUnit('co_ban');
                  setQty(1);
                }}
                right={<Ionicons name="chevron-forward" size={18} color="#9ca3af" />}
              />
            )}
            ListEmptyComponent={
              <Text className="text-caption text-ink-muted text-center py-8">
                Không có vật tư phù hợp
              </Text>
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
          <SkuRow sku={picked} />
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

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`h-9 px-3 rounded-input flex-row items-center border ${
        active ? 'bg-primary border-primary' : 'bg-white border-border'
      }`}
    >
      <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
