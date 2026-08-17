import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listOrders } from '../../src/api/erp/orders';
import { OrderCard } from '../../src/features/orders/components/OrderCard';
import { EmptyOrders } from '../../src/features/orders/components/EmptyOrders';
import { apiErrorMessage } from '../../src/api/client';
import type { OrderStatus } from '../../src/features/orders/types';
import { STATUS_META } from '../../src/features/orders/format';

type FilterKey = 'all' | OrderStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'draft', label: STATUS_META.draft.label },
  { key: 'new', label: STATUS_META.new.label },
  { key: 'confirmed', label: STATUS_META.confirmed.label },
  { key: 'delivering', label: STATUS_META.delivering.label },
  { key: 'completed', label: STATUS_META.completed.label },
  { key: 'cancelled', label: STATUS_META.cancelled.label },
];

export default function OrdersTab() {
  const [filter, setFilter] = useState<FilterKey>('all');

  const ordersQuery = useQuery({
    queryKey: ['orders', { status: filter }],
    queryFn: () =>
      listOrders({ status: filter === 'all' ? undefined : filter, page: 1, pageSize: 50 }),
    staleTime: 0,
  });

  const onRefresh = useCallback(() => {
    void ordersQuery.refetch();
  }, [ordersQuery]);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      <View className="px-4 pt-2 pb-3 bg-bg-soft">
        <View className="flex-row items-center justify-between">
          <Text className="text-h1 text-ink">Đơn hàng</Text>
        </View>
      </View>

      <View className="pb-2 bg-bg-soft">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4, gap: 8 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`h-9 px-3 rounded-input flex-row items-center border ${
                  active ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text
                  className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {ordersQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : ordersQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#dd1c2e" />
          <Text className="text-body text-ink mt-3 text-center">
            {apiErrorMessage(ordersQuery.error)}
          </Text>
          <Pressable
            onPress={onRefresh}
            className="mt-4 rounded-input bg-primary px-4 py-2"
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={ordersQuery.data?.data ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push(`/order/${item.id}` as never)} />
          )}
          ListEmptyComponent={
            <EmptyOrders
              filterLabel={filter === 'all' ? undefined : STATUS_META[filter].label}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={ordersQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor="#dd1c2e"
            />
          }
        />
      )}

      <Pressable
        onPress={() => router.push('/order/new' as never)}
        accessibilityRole="button"
        accessibilityLabel="Tạo đơn mới"
        className="absolute right-4 bottom-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}
