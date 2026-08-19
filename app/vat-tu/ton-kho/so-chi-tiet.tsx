import { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMoves, listKho } from '../../../src/api/erp/warehouse';
import { getVatTu } from '../../../src/api/erp/catalog-supplies';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { formatQty } from '../../../src/features/vat-tu/format';

export default function SoChiTiet() {
  const params = useLocalSearchParams<{ khoId?: string; vatTuId?: string }>();
  const khoId = typeof params.khoId === 'string' ? params.khoId : '';
  const vatTuId = typeof params.vatTuId === 'string' ? params.vatTuId : '';

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'one', vatTuId],
    queryFn: () => getVatTu(vatTuId),
    enabled: !!vatTuId,
  });
  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 5 * 60_000,
  });
  const movesQuery = useQuery({
    queryKey: ['moves', { khoId, vatTuId }],
    queryFn: () => getMoves({ khoId, vatTuId }),
    enabled: !!khoId && !!vatTuId,
  });

  const kho = (khoQuery.data ?? []).find((k) => k.id === khoId);
  const sku = skuQuery.data;

  const sortedAsc = useMemo(() => {
    if (!movesQuery.data) return [];
    return [...movesQuery.data].sort((a, b) => a.taoLuc.localeCompare(b.taoLuc));
  }, [movesQuery.data]);

  const runningTotals = useMemo(() => {
    const res: Record<string, number> = {};
    let running = 0;
    for (const m of sortedAsc) {
      running += m.huong === 'in' ? m.soLuong : -m.soLuong;
      res[m.id] = running;
    }
    return res;
  }, [sortedAsc]);

  const currentTotal = sortedAsc.reduce(
    (s, m) => s + (m.huong === 'in' ? m.soLuong : -m.soLuong),
    0,
  );

  const displayMoves = useMemo(() => [...sortedAsc].reverse(), [sortedAsc]);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-h2 text-ink">{sku?.ten ?? vatTuId}</Text>
          <Text className="text-caption text-ink-muted font-mono mt-0.5">{vatTuId}</Text>
          {kho ? (
            <Text className="text-body text-ink mt-2">
              {kho.ten} · tồn hiện tại{' '}
              <Text className="font-semibold">
                {formatQty(currentTotal, sku?.donViCoBan ?? '')}
              </Text>{' '}
              = cộng dồn {sortedAsc.length} dòng sổ
            </Text>
          ) : null}
        </View>

        {movesQuery.isPending || skuQuery.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : displayMoves.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Chưa có dòng sổ nào"
            message="Mặt hàng này chưa phát sinh nhập/bán/kiểm ở kho đang chọn."
          />
        ) : (
          <View className="rounded-card bg-white border border-border p-4">
            {displayMoves.map((m) => (
              <TheKhoRow
                key={m.id}
                move={m}
                donViCoBan={sku?.donViCoBan ?? ''}
                runningTotal={runningTotals[m.id]}
                onPressChungTu={() => {
                  const path =
                    m.chungTuLoai === 'nhap'
                      ? `/vat-tu/nhap-kho/${m.chungTuId}`
                      : m.chungTuLoai === 'ban'
                        ? `/vat-tu/ban-hang/${m.chungTuId}`
                        : m.chungTuLoai === 'kiem_ke'
                          ? `/vat-tu/kiem-kho/${m.chungTuId}`
                          : `/vat-tu/${m.chungTuId}`;
                  router.push(path as never);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
