import { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData } from '@tanstack/react-query';
import { huyKeHoach, listPhieuChuyen } from '../../../src/api/erp/phieu-chuyen';
import { listKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { FilterChip } from '../../../src/components/FilterChip';
import { SwipeToAction } from '../../../src/components/SwipeToAction';
import { CancelSheet } from '../../../src/components/CancelSheet';
import { formatDateTime } from '../../../src/features/vat-tu/format';
import type { PhieuChuyen, PhieuChuyenTrangThai } from '../../../src/features/vat-tu/types';
import { usePermissions } from '../../../src/auth/store';
import { canLapPhieuChuyen, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { usePhieuChuyenDraftStore } from '../../../src/stores/phieu-chuyen-draft';

type StatusFilter = 'all' | PhieuChuyenTrangThai;

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'ke_hoach', label: 'Kế hoạch' },
  { id: 'dang_chuyen', label: 'Đang chuyển' },
  { id: 'cho_duyet_lech', label: 'Chờ duyệt lệch' },
  { id: 'ghi', label: 'Đã ghi' },
  { id: 'huy', label: 'Đã huỷ' },
];

const STATUS_META: Record<PhieuChuyenTrangThai, { bg: string; text: string; label: string }> = {
  ke_hoach: { bg: 'bg-amber-50', text: 'text-amber-800', label: 'Kế hoạch' },
  dang_chuyen: { bg: 'bg-blue-50', text: 'text-blue-800', label: 'Đang chuyển' },
  cho_duyet_lech: { bg: 'bg-orange-50', text: 'text-orange-800', label: 'Chờ duyệt lệch' },
  ghi: { bg: 'bg-green-50', text: 'text-green-800', label: 'Đã ghi' },
  huy: { bg: 'bg-red-50', text: 'text-red-800', label: 'Đã huỷ' },
};

export default function ChuyenKhoList() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [khoId, setKhoId] = useState<string | undefined>(undefined);
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canLap = canLapPhieuChuyen(perms);
  const startDraft = usePhieuChuyenDraftStore((s) => s.startDraft);
  const qc = useQueryClient();
  const [phieuHuy, setPhieuHuy] = useState<PhieuChuyen | null>(null);
  const [huyErr, setHuyErr] = useState<string | null>(null);
  const huyMut = useMutation({
    // Chỉ `ke_hoach` mới huỷ được (BE: `huyKeHoach`). Sau `dang_chuyen`/`ghi`
    // không huỷ được — client tự lọc, BE cũng chặn.
    mutationFn: (lyDo: string) => huyKeHoach(phieuHuy!.id, lyDo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      setPhieuHuy(null);
      setHuyErr(null);
    },
    onError: (err) => setHuyErr(apiErrorMessage(err)),
  });

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['phieu-chuyen', { status, khoId }],
    queryFn: () => listPhieuChuyen({ status, khoId }),
    placeholderData: keepPreviousData,
  });

  const khoIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of khoQuery.data ?? []) m.set(k.id, k.ten);
    return m;
  }, [khoQuery.data]);

  const onCreate = () => {
    startDraft();
    router.push('/vat-tu/chuyen-kho/new' as never);
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
          <FilterChip label="Kho: Tất cả" active={!khoId} onPress={() => setKhoId(undefined)} />
          {(khoQuery.data ?? []).map((k) => (
            <FilterChip
              key={k.id}
              label={k.ten}
              icon={k.loai === 'xe' ? 'car-outline' : k.loai === 'tong' ? 'business' : 'storefront-outline'}
              active={khoId === k.id}
              onPress={() => setKhoId(k.id)}
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
            const huyDuoc = canLap && item.trangThai === 'ke_hoach';
            const card = (
              <PhieuChuyenCard
                phieu={item}
                khoNguonTen={khoIndex.get(item.khoNguonId)}
                khoDichTen={khoIndex.get(item.khoDichId)}
                onPress={() => router.push(`/vat-tu/chuyen-kho/${item.id}` as never)}
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
              icon="swap-horizontal-outline"
              title={isFiltered ? 'Không có phiếu phù hợp' : 'Chưa có phiếu chuyển nào'}
              message={
                isFiltered
                  ? 'Thử bỏ bộ lọc để xem tất cả phiếu.'
                  : 'Bắt đầu bằng cách lập lệnh chuyển từ kho tổng về kho xe.'
              }
              cta={
                isFiltered
                  ? { label: 'Xem tất cả', onPress: resetFilters, variant: 'outline' }
                  : canLap
                    ? { label: 'Lập lệnh chuyển', onPress: onCreate, icon: 'add' }
                    : undefined
              }
            />
          }
        />
      )}

      {canLap ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Lập lệnh chuyển kho"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <CancelSheet
        visible={phieuHuy != null}
        title={`Huỷ lệnh chuyển ${phieuHuy?.id ?? ''}`}
        helperText="Nhập lý do huỷ (chỉ huỷ được lệnh còn ở trạng thái kế hoạch)."
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

function PhieuChuyenCard({
  phieu,
  khoNguonTen,
  khoDichTen,
  onPress,
}: {
  phieu: PhieuChuyen;
  khoNguonTen?: string;
  khoDichTen?: string;
  onPress: () => void;
}) {
  const meta = STATUS_META[phieu.trangThai];
  const soDong = phieu.dongHang?.length ?? 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Phiếu chuyển ${phieu.id}`}
      className="rounded-card bg-white border border-border p-3 mb-3 active:opacity-90"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-body text-ink font-semibold">{phieu.id}</Text>
          <Text className="text-caption text-ink-muted mt-0.5">
            {formatDateTime(phieu.taoLuc)}
          </Text>
        </View>
        <View className={`rounded-input px-2 py-1 ${meta.bg}`}>
          <Text className={`text-caption font-semibold ${meta.text}`}>{meta.label}</Text>
        </View>
      </View>
      <View className="flex-row items-center mt-2">
        <Ionicons name="business" size={14} color="#6b7280" />
        <Text className="text-caption text-ink ml-1 flex-1" numberOfLines={1}>
          {khoNguonTen ?? phieu.khoNguonId}
        </Text>
        <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
        <Ionicons name="car-outline" size={14} color="#6b7280" style={{ marginLeft: 6 }} />
        <Text className="text-caption text-ink ml-1 flex-1" numberOfLines={1}>
          {khoDichTen ?? phieu.khoDichId}
        </Text>
      </View>
      <View className="flex-row items-center mt-1">
        <Ionicons name="cube-outline" size={14} color="#6b7280" />
        <Text className="text-caption text-ink-muted ml-1">{soDong} dòng</Text>
        {phieu.variance && phieu.variance.length > 0 ? (
          <Text className="text-caption text-orange-700 ml-2 font-semibold">
            · {phieu.variance.length} lệch
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
