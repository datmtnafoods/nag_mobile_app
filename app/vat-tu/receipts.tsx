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
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listReceipts } from '../../src/api/erp/warehouse';
import { PhieuCard } from '../../src/features/vat-tu/components/PhieuCard';
import { EmptyReceipts } from '../../src/features/vat-tu/components/EmptyReceipts';
import { apiErrorMessage } from '../../src/api/client';
import type { ReceiptKind, ReceiptStatus } from '../../src/features/vat-tu/types';
import { RECEIPT_KIND_META, RECEIPT_STATUS_META } from '../../src/features/vat-tu/format';

type Kind = ReceiptKind | 'all';
type Status = ReceiptStatus | 'all';

const KIND_FILTERS: Array<{ key: Kind; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'nhap', label: RECEIPT_KIND_META.nhap.label },
  { key: 'ban', label: RECEIPT_KIND_META.ban.label },
];

const STATUS_FILTERS: Array<{ key: Status; label: string }> = [
  { key: 'all', label: 'Mọi trạng thái' },
  { key: 'ghi', label: RECEIPT_STATUS_META.ghi.label },
  { key: 'huy', label: RECEIPT_STATUS_META.huy.label },
];

export default function ReceiptsList() {
  const [kind, setKind] = useState<Kind>('all');
  const [status, setStatus] = useState<Status>('all');

  const q = useQuery({
    queryKey: ['receipts', kind, { status }],
    queryFn: () => listReceipts({ kind, status, page: 1, pageSize: 50 }),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const onRefresh = useCallback(() => {
    void q.refetch();
  }, [q]);

  const activeFilterLabel =
    kind === 'all' && status === 'all'
      ? undefined
      : `${kind === 'all' ? 'Tất cả' : RECEIPT_KIND_META[kind].label}${status !== 'all' ? ` · ${RECEIPT_STATUS_META[status].label}` : ''}`;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="pb-2 bg-bg-soft">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          {KIND_FILTERS.map((f) => {
            const active = kind === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setKind(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Lọc theo ${f.label}`}
                className={`h-9 px-3 rounded-input flex-row items-center border ${
                  active ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
          <View className="w-px h-9 bg-border mx-1" />
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Lọc theo ${f.label}`}
                className={`h-9 px-3 rounded-input flex-row items-center border ${
                  active ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {q.isPending && !q.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#dd1c2e" />
          <Text className="text-body text-ink mt-3 text-center">{apiErrorMessage(q.error)}</Text>
          <Pressable onPress={onRefresh} className="mt-4 rounded-input bg-primary px-4 py-2">
            <Text className="text-white font-semibold">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={q.data?.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          style={{ opacity: q.isFetching && !q.isPending ? 0.7 : 1 }}
          renderItem={({ item }) => (
            <PhieuCard phieu={item} onPress={() => router.push(`/vat-tu/${item.id}` as never)} />
          )}
          ListEmptyComponent={
            <EmptyReceipts
              filterLabel={activeFilterLabel}
              onResetFilter={() => {
                setKind('all');
                setStatus('all');
              }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={onRefresh}
              tintColor="#dd1c2e"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
