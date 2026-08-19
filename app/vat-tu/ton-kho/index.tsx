import { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listKho, tonKho } from '../../../src/api/erp/warehouse';
import { listLoai, listVatTu } from '../../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../../src/api/client';
import { StockBadge } from '../../../src/features/vat-tu/components/StockBadge';
import { SkuThumbnail } from '../../../src/features/vat-tu/components/SkuThumbnail';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { FilterChip } from '../../../src/components/FilterChip';
import { useKhoPicker } from '../../../src/stores/kho-picker';

type Filter = 'all' | 'neg' | 'low';

export default function TonKhoTab() {
  const khoDangChon = useKhoPicker((s) => s.khoDangChon);
  const setKho = useKhoPicker((s) => s.setKho);
  const [filter, setFilter] = useState<Filter>('all');
  const [loaiId, setLoaiId] = useState<string | undefined>(undefined);

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 5 * 60_000,
  });
  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });
  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', 'all'],
    queryFn: () => listVatTu({ includeNgung: true }),
    staleTime: 60_000,
  });
  const tonQuery = useQuery({
    queryKey: ['ton-kho', khoDangChon],
    queryFn: () => tonKho({ khoId: khoDangChon }),
    enabled: Boolean(khoDangChon),
    staleTime: 15_000,
  });

  const activeKho = (khoQuery.data ?? []).find((k) => k.id === khoDangChon);
  const skuMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof skuQuery.data>[number]>();
    for (const s of skuQuery.data ?? []) m.set(s.id, s);
    return m;
  }, [skuQuery.data]);

  const rows = useMemo(() => {
    const all = tonQuery.data ?? [];
    return all
      .filter((r) => {
        const sku = skuMap.get(r.vatTuId);
        if (loaiId && sku?.loaiId !== loaiId) return false;
        if (filter === 'neg') return r.soLuong < 0;
        if (filter === 'low') {
          const min = sku?.tonMin;
          return min != null && r.soLuong >= 0 && r.soLuong <= min;
        }
        return true;
      })
      .sort((a, b) => a.soLuong - b.soLuong);
  }, [tonQuery.data, skuMap, loaiId, filter]);

  const soTonAm = (tonQuery.data ?? []).filter((r) => r.soLuong < 0).length;
  const soDuoiDinhMuc = (tonQuery.data ?? []).filter((r) => {
    const sku = skuMap.get(r.vatTuId);
    return sku?.tonMin != null && r.soLuong >= 0 && r.soLuong <= sku.tonMin;
  }).length;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="pb-2 border-b border-border">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          {(khoQuery.data ?? []).map((k) => (
            <FilterChip
              key={k.id}
              label={k.ten}
              active={khoDangChon === k.id}
              onPress={() => setKho(k.id)}
              icon={k.loai === 'tong' ? 'business' : 'storefront-outline'}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}
        >
          <FilterChip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip
            label="Chỉ tồn âm"
            count={soTonAm}
            active={filter === 'neg'}
            onPress={() => setFilter('neg')}
          />
          <FilterChip
            label="Dưới định mức"
            count={soDuoiDinhMuc}
            active={filter === 'low'}
            onPress={() => setFilter('low')}
          />
          <FilterChip label="Loại: Tất cả" active={!loaiId} onPress={() => setLoaiId(undefined)} />
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

      {soTonAm > 0 && activeKho ? (
        <View className="mx-4 mt-3 rounded-card bg-red-50 border border-red-200 p-3">
          <View className="flex-row items-start">
            <Ionicons name="alert-circle" size={20} color="#b91c1c" />
            <Text className="text-small text-red-700 ml-2 flex-1">
              {soTonAm} mặt hàng đang có tồn ÂM ở {activeKho.ten} — dấu hiệu sót phiếu hoặc xuất
              khống. Mở sổ chi tiết từng dòng để tìm chứng từ gây lệch.
            </Text>
          </View>
        </View>
      ) : null}

      {tonQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : tonQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(tonQuery.error)}
          onRetry={() => void tonQuery.refetch()}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.khoId}::${r.vatTuId}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const sku = skuMap.get(item.vatTuId);
            return (
              <Pressable
                onPress={() =>
                  router.push(
                    `/vat-tu/ton-kho/so-chi-tiet?khoId=${item.khoId}&vatTuId=${item.vatTuId}` as never,
                  )
                }
                className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
              >
                <View className="mr-3">
                  <SkuThumbnail uri={sku?.anh?.[0]} size={40} />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold" numberOfLines={1}>
                    {sku?.ten ?? item.vatTuId}
                  </Text>
                  <Text className="text-caption text-ink-muted font-mono">{item.vatTuId}</Text>
                  <View className="mt-1">
                    <StockBadge
                      soLuong={item.soLuong}
                      donViCoBan={sku?.donViCoBan ?? ''}
                      tonMin={sku?.tonMin}
                      compact
                    />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title={
                filter !== 'all' || loaiId
                  ? 'Không có mặt hàng phù hợp'
                  : 'Chưa có dữ liệu tồn'
              }
              message={
                filter !== 'all' || loaiId
                  ? 'Thử bỏ bộ lọc để xem toàn bộ tồn kho.'
                  : 'Tồn kho được tính từ các dòng sổ. Tạo phiếu nhập để bắt đầu.'
              }
              cta={
                filter !== 'all' || loaiId
                  ? {
                      label: 'Xem tất cả',
                      onPress: () => {
                        setFilter('all');
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
