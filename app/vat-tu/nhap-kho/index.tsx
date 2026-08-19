import { useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData } from '@tanstack/react-query';
import { listNcc } from '../../../src/api/erp/catalog-supplies';
import { listReceipts } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { PhieuCard } from '../../../src/features/vat-tu/components/PhieuCard';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { FilterChip } from '../../../src/components/FilterChip';
import type { PhieuTrangThai } from '../../../src/features/vat-tu/types';
import { useCurrentUser } from '../../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { useReceiptDraftStore } from '../../../src/stores/receipt-draft';

type StatusFilter = 'all' | PhieuTrangThai;

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ke_hoach', label: 'Phiếu tạm' },
  { id: 'ghi', label: 'Đã nhập' },
  { id: 'huy', label: 'Đã huỷ' },
];

export default function NhapKhoList() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [nccId, setNccId] = useState<string | undefined>(undefined);
  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const canCreate = canCreateReceipt(perms, 'nhap');
  const startDraft = useReceiptDraftStore((s) => s.startDraft);

  const nccQuery = useQuery({
    queryKey: ['vat-tu', 'ncc'],
    queryFn: () => listNcc(),
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['receipts', 'nhap', { status, nccId }],
    queryFn: () =>
      listReceipts({
        kind: 'nhap',
        status: status === 'all' ? undefined : status,
        nccId,
      }),
    placeholderData: keepPreviousData,
  });

  const onCreate = () => {
    startDraft('nhap');
    router.push('/vat-tu/nhap-kho/new' as never);
  };

  const isFiltered = status !== 'all' || Boolean(nccId);
  const resetFilters = () => {
    setStatus('all');
    setNccId(undefined);
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}
        >
          <FilterChip
            label="NCC: Tất cả"
            active={!nccId}
            onPress={() => setNccId(undefined)}
          />
          {(nccQuery.data ?? []).map((n) => (
            <FilterChip
              key={n.id}
              label={n.ten}
              active={nccId === n.id}
              onPress={() => setNccId(n.id)}
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
              onPress={() => router.push(`/vat-tu/nhap-kho/${item.id}` as never)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={isFiltered ? 'Không có phiếu phù hợp' : 'Chưa có phiếu nhập nào'}
              message={
                isFiltered
                  ? 'Thử bỏ bộ lọc để xem tất cả phiếu.'
                  : 'Bắt đầu bằng cách tạo phiếu nhập đầu tiên.'
              }
              cta={
                isFiltered
                  ? { label: 'Xem tất cả', onPress: resetFilters, variant: 'outline' }
                  : canCreate
                    ? { label: 'Tạo phiếu nhập', onPress: onCreate, icon: 'add' }
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
          accessibilityLabel="Tạo phiếu nhập"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

