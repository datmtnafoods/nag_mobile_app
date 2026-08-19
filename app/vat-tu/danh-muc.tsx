import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listLoai, listVatTu } from '../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../src/api/client';
import { Input } from '../../src/components/Input';
import { SkuRow } from '../../src/features/vat-tu/components/SkuRow';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChip } from '../../src/components/FilterChip';
import { useCurrentUser } from '../../src/auth/store';
import { canManageCatalog, permsForVatTu } from '../../src/features/vat-tu/perms';

export default function DanhMuc() {
  const [q, setQ] = useState('');
  const [loaiId, setLoaiId] = useState<string | undefined>(undefined);
  const [includeNgung, setIncludeNgung] = useState(false);
  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const canManage = canManageCatalog(perms);

  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'list', { q, loaiId, includeNgung }],
    queryFn: () => listVatTu({ q, loaiId, includeNgung }),
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
          <FilterChip label="Tất cả" active={!loaiId} onPress={() => setLoaiId(undefined)} />
          {(loaiQuery.data ?? []).map((l) => (
            <FilterChip
              key={l.id}
              label={l.ten}
              active={loaiId === l.id}
              onPress={() => setLoaiId(l.id)}
            />
          ))}
          <FilterChip
            label={includeNgung ? 'Ẩn ngừng KD' : 'Hiện ngừng KD'}
            active={includeNgung}
            onPress={() => setIncludeNgung((v) => !v)}
            icon="eye-outline"
          />
        </ScrollView>
      </View>

      {skuQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : skuQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(skuQuery.error)}
          onRetry={() => void skuQuery.refetch()}
        />
      ) : (
        <FlatList
          data={skuQuery.data ?? []}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <SkuRow
              sku={item}
              loaiTen={loaiTenMap[item.loaiId]}
              onPress={() => router.push(`/vat-tu/sku/${item.id}` as never)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title={q || loaiId ? 'Không có vật tư phù hợp' : 'Chưa có vật tư nào'}
              message={
                q || loaiId
                  ? 'Thử đổi từ khoá tìm kiếm hoặc bỏ bộ lọc loại.'
                  : 'Thêm vật tư đầu tiên vào danh mục.'
              }
              cta={
                q || loaiId
                  ? {
                      label: 'Xem tất cả',
                      onPress: () => {
                        setQ('');
                        setLoaiId(undefined);
                      },
                      variant: 'outline',
                    }
                  : canManage
                    ? {
                        label: 'Tạo vật tư',
                        onPress: () => router.push('/vat-tu/sku/new' as never),
                        icon: 'add',
                      }
                    : undefined
              }
            />
          }
        />
      )}

      {canManage ? (
        <Pressable
          onPress={() => router.push('/vat-tu/sku/new' as never)}
          accessibilityRole="button"
          accessibilityLabel="Tạo vật tư mới"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

