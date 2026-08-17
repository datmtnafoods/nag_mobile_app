import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { listLoai, listVatTu } from '../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { SkuRow } from '../../src/features/vat-tu/components/SkuRow';

export default function Catalog() {
  const [q, setQ] = useState('');
  const [loaiId, setLoaiId] = useState<string | undefined>(undefined);

  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', { q, loaiId }],
    queryFn: () => listVatTu({ q, loaiId }),
    staleTime: 30_000,
  });

  const loaiTenMap: Record<string, string> = {};
  (loaiQuery.data ?? []).forEach((l) => {
    loaiTenMap[l.id] = l.ten;
  });

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="px-4 pt-3">
        <Input
          placeholder="Tìm theo tên, mã, barcode..."
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
          <FilterChip
            label="Tất cả"
            active={!loaiId}
            onPress={() => setLoaiId(undefined)}
          />
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
          <Ionicons name="cloud-offline-outline" size={48} color="#dd1c2e" />
          <Text className="text-body text-ink mt-3 text-center">
            {apiErrorMessage(skuQuery.error)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={skuQuery.data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <SkuRow sku={item} loaiTen={loaiTenMap[item.loaiId]} />
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
