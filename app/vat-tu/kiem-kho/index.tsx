import { useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { huyPhieu, listKho, listPhieuKiem } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { PhieuCard } from '../../../src/features/vat-tu/components/PhieuCard';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { FilterChip } from '../../../src/components/FilterChip';
import { SwipeToAction } from '../../../src/components/SwipeToAction';
import { CancelSheet } from '../../../src/components/CancelSheet';
import type { PhieuHeader, PhieuTrangThai } from '../../../src/features/vat-tu/types';
import { usePermissions } from '../../../src/auth/store';
import { canCancelReceipt, canDoInventoryCount, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { useKiemDraftStore } from '../../../src/stores/kiem-draft';

type StatusFilter = 'all' | PhieuTrangThai;
const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ke_hoach', label: 'Phiếu tạm' },
  { id: 'ghi', label: 'Đã cân bằng' },
  { id: 'huy', label: 'Đã huỷ' },
];

export default function KiemKhoList() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [khoId, setKhoId] = useState<string | undefined>(undefined);
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canCreate = canDoInventoryCount(perms);
  const canCancel = canCancelReceipt(perms);
  const startDraft = useKiemDraftStore((s) => s.startDraft);
  const qc = useQueryClient();
  const [phieuHuy, setPhieuHuy] = useState<PhieuHeader | null>(null);
  const [huyErr, setHuyErr] = useState<string | null>(null);
  const huyMut = useMutation({
    mutationFn: (lyDo: string) => huyPhieu(phieuHuy!.id, lyDo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      setPhieuHuy(null);
      setHuyErr(null);
    },
    onError: (err) => setHuyErr(apiErrorMessage(err)),
  });

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 5 * 60_000,
  });
  const listQuery = useQuery({
    queryKey: ['receipts', 'kiem_ke', { status, khoId }],
    queryFn: () =>
      listPhieuKiem({
        status: status === 'all' ? undefined : status,
        khoId,
      }),
  });

  const onCreate = () => {
    startDraft();
    router.push('/vat-tu/kiem-kho/new' as never);
  };

  const isFiltered = status !== 'all' || Boolean(khoId);
  const resetFilters = () => {
    setStatus('all');
    setKhoId(undefined);
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
            label="Kho: Tất cả"
            active={!khoId}
            onPress={() => setKhoId(undefined)}
          />
          {(khoQuery.data ?? []).map((k) => (
            <FilterChip
              key={k.id}
              label={k.ten}
              active={khoId === k.id}
              onPress={() => setKhoId(k.id)}
              icon={k.loai === 'tong' ? 'business' : 'storefront-outline'}
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
          data={listQuery.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => {
            // Chỉ phiếu `ke_hoach` mới huỷ được (sau `ghi`/`huy` không huỷ lại).
            const huyDuoc = canCancel && item.trangThai === 'ke_hoach';
            const card = (
              <PhieuCard
                phieu={item}
                onPress={() => router.push(`/vat-tu/kiem-kho/${item.id}` as never)}
              />
            );
            return huyDuoc ? (
              <SwipeToAction
                actions={[
                  {
                    key: 'huy',
                    label: 'Huỷ',
                    icon: 'close-circle-outline',
                    bg: 'bg-red-600',
                    onPress: () => setPhieuHuy(item),
                  },
                ]}
              >
                {card}
              </SwipeToAction>
            ) : (
              card
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title={isFiltered ? 'Không có phiếu phù hợp' : 'Chưa có phiếu kiểm nào'}
              message={
                isFiltered
                  ? 'Thử bỏ bộ lọc để xem tất cả phiếu.'
                  : 'Kiểm kho giúp đối chiếu số đếm thực tế với tồn sổ.'
              }
              cta={
                isFiltered
                  ? { label: 'Xem tất cả', onPress: resetFilters, variant: 'outline' }
                  : canCreate
                    ? { label: 'Tạo phiếu kiểm', onPress: onCreate, icon: 'add' }
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
          accessibilityLabel="Tạo phiếu kiểm"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <CancelSheet
        visible={phieuHuy != null}
        title={`Huỷ phiếu ${phieuHuy?.id ?? ''}`}
        helperText="Nhập lý do huỷ phiếu."
        submitting={huyMut.isPending}
        errorMessage={huyErr}
        onDismiss={() => {
          setPhieuHuy(null);
          setHuyErr(null);
        }}
        onSubmit={(lyDo) => huyMut.mutate(lyDo)}
      />
    </SafeAreaView>
  );
}
