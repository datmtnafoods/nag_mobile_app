import { useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listReceipts } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { PhieuCard } from '../../../src/features/vat-tu/components/PhieuCard';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { FilterChip } from '../../../src/components/FilterChip';
import type { PhieuTrangThai } from '../../../src/features/vat-tu/types';
import { usePermissions } from '../../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { useReceiptDraftStore } from '../../../src/stores/receipt-draft';

type StatusFilter = 'all' | PhieuTrangThai;
const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ghi', label: 'Đã ghi' },
  { id: 'huy', label: 'Đã huỷ' },
];

export default function BanHangList() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canCreate = canCreateReceipt(perms, 'ban');
  const startDraft = useReceiptDraftStore((s) => s.startDraft);

  const listQuery = useQuery({
    queryKey: ['receipts', 'ban', { status }],
    queryFn: () =>
      listReceipts({
        kind: 'ban',
        status: status === 'all' ? undefined : status,
      }),
    placeholderData: keepPreviousData,
  });

  const onCreate = () => {
    startDraft('ban');
    router.push('/vat-tu/ban-hang/new' as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="pb-2 border-b border-border">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <FilterChip
              key={s.id}
              label={s.label}
              active={status === s.id}
              onPress={() => setStatus(s.id)}
            />
          ))}
        </ScrollView>
      </View>

      {listQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : listQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : (
        <FlatList
          data={listQuery.data?.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <PhieuCard
              phieu={item}
              onPress={() => router.push(`/vat-tu/ban-hang/${item.id}` as never)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={status !== 'all' ? 'Không có phiếu phù hợp' : 'Chưa có phiếu bán nào'}
              message={
                status !== 'all'
                  ? 'Thử bỏ bộ lọc để xem tất cả phiếu.'
                  : 'Bắt đầu bằng cách tạo phiếu bán đầu tiên.'
              }
              cta={
                status !== 'all'
                  ? { label: 'Xem tất cả', onPress: () => setStatus('all'), variant: 'outline' }
                  : canCreate
                    ? { label: 'Tạo phiếu bán', onPress: onCreate, icon: 'add' }
                    : undefined
              }
            />
          }
        />
      )}

      {canCreate ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Tạo phiếu bán"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
