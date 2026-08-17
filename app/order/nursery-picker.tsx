import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { listNurseries, listSeedProducts } from '../../src/api/erp/catalog';
import { apiErrorMessage } from '../../src/api/client';
import { useCartStore } from '../../src/stores/cart';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { formatVND } from '../../src/features/orders/format';
import { PROVINCE_LABELS } from '../../src/features/orders/types';
import type { Nursery, SeedProduct } from '../../src/features/orders/types';

export default function NurseryPicker() {
  const [nursery, setNursery] = useState<Nursery | null>(null);
  const [q, setQ] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<SeedProduct | null>(null);
  const [qty, setQty] = useState('10');

  const nurseriesQuery = useQuery({
    queryKey: ['nurseries'],
    queryFn: () => listNurseries(),
    staleTime: 60_000,
  });

  const productsQuery = useQuery({
    queryKey: ['seed-products', { nurseryId: nursery?.id, q }],
    queryFn: () => listSeedProducts({ nurseryId: nursery?.id, q }),
    enabled: Boolean(nursery),
    staleTime: 30_000,
  });

  const addLine = useCartStore((s) => s.addLine);

  const canAdd = useMemo(() => {
    const n = Number.parseInt(qty, 10);
    return Boolean(selectedProduct && nursery && Number.isFinite(n) && n > 0);
  }, [selectedProduct, nursery, qty]);

  const onAdd = () => {
    if (!selectedProduct || !nursery) return;
    const n = Math.max(1, Number.parseInt(qty, 10) || 0);
    addLine({
      nurseryId: nursery.id,
      nurseryName: nursery.name,
      seedProductId: selectedProduct.id,
      seedProductName: selectedProduct.name,
      varietyCode: selectedProduct.varietyCode,
      quantity: n,
      unitPrice: selectedProduct.unitPrice,
    });
    router.back();
  };

  if (!nursery) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Chọn viện giống' }} />
        {nurseriesQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : nurseriesQuery.isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-caption text-red-700 text-center">
              {apiErrorMessage(nurseriesQuery.error)}
            </Text>
          </View>
        ) : (
          <FlatList
            data={nurseriesQuery.data ?? []}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setNursery(item)}
                className="rounded-card bg-white border border-border p-4 mb-2 active:bg-bg-soft flex-row items-center"
              >
                <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
                  <Ionicons name="business-outline" size={20} color="#dd1c2e" />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold">{item.name}</Text>
                  <Text className="text-caption text-ink-muted">
                    {PROVINCE_LABELS[item.province]}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: nursery.name }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="px-4 pt-3">
          <Pressable
            onPress={() => {
              setNursery(null);
              setSelectedProduct(null);
              setQ('');
            }}
            className="flex-row items-center py-2"
          >
            <Ionicons name="chevron-back" size={18} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-1">Đổi viện khác</Text>
          </Pressable>
          <Input
            placeholder="Tìm giống theo tên hoặc mã..."
            leftIcon="search-outline"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={productsQuery.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const selected = selectedProduct?.id === item.id;
            return (
              <Pressable
                onPress={() => setSelectedProduct(item)}
                className={`rounded-card bg-white border p-4 mb-2 active:bg-bg-soft flex-row items-center ${
                  selected ? 'border-primary' : 'border-border'
                }`}
              >
                <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
                  <Ionicons name="leaf" size={20} color="#dd1c2e" />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold">{item.name}</Text>
                  <Text className="text-caption text-ink-muted">
                    {item.varietyCode ? `${item.varietyCode} · ` : ''}
                    {formatVND(item.unitPrice)}/cây
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#dd1c2e" />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color="#d1d5db" />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            productsQuery.isPending ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#dd1c2e" />
              </View>
            ) : (
              <Text className="text-caption text-ink-muted text-center py-8">
                Không có giống phù hợp
              </Text>
            )
          }
        />

        {selectedProduct ? (
          <View className="px-4 pb-4 pt-3 border-t border-border bg-bg gap-y-2">
            <Text className="text-caption text-ink-muted">Số lượng (cây)</Text>
            <Input
              placeholder="10"
              keyboardType="number-pad"
              value={qty}
              onChangeText={setQty}
            />
            <Button label="Thêm vào đơn" disabled={!canAdd} onPress={onAdd} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
