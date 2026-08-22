import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { danhDauDaDoc, listHoiThoai } from '../../../src/api/erp/inbox';
import { apiErrorMessage } from '../../../src/api/client';
import { usePermissions } from '../../../src/auth/store';
import { permsForInbox } from '../../../src/features/inbox/perms';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Input } from '../../../src/components/Input';
import { SwipeToAction } from '../../../src/components/SwipeToAction';
import { HoiThoaiRow } from '../../../src/features/inbox/components/HoiThoaiRow';
import { MAU } from '../../../src/theme/tokens';

export default function InboxList() {
  const permissions = usePermissions();
  const perms = permsForInbox(permissions);
  const qc = useQueryClient();
  const [tim, setTim] = useState('');

  const q = useQuery({
    queryKey: ['inbox', 'hoi-thoai'],
    queryFn: () => listHoiThoai(),
    enabled: perms.canView,
  });

  // Làm mới khi quay lại tab (đọc tin mới / auto-reply mock).
  useFocusEffect(
    useCallback(() => {
      if (perms.canView) qc.invalidateQueries({ queryKey: ['inbox', 'hoi-thoai'] });
    }, [perms.canView, qc]),
  );

  // Ẩn client-side: BE inbox 100% mock, chưa có DELETE hội thoại. Người dùng
  // reload app → hội thoại quay lại. Khi có BE thật, đổi thành mutation DELETE.
  const [anTai, setAnTai] = useState<Set<string>>(new Set());
  const anHoiThoai = useCallback((id: string) => {
    setAnTai((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }, []);
  const danhDau = useCallback(
    async (id: string) => {
      await danhDauDaDoc(id);
      qc.invalidateQueries({ queryKey: ['inbox', 'hoi-thoai'] });
    },
    [qc],
  );

  const timTre = useDebouncedValue(tim.trim().toLowerCase(), 250);
  const rows = useMemo(() => {
    const list = (q.data ?? []).filter((h) => !anTai.has(h.id));
    if (!timTre) return list;
    return list.filter(
      (h) => h.ten.toLowerCase().includes(timTre) || (h.tinCuoi ?? '').toLowerCase().includes(timTre),
    );
  }, [q.data, timTre, anTai]);

  if (!perms.canView) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <EmptyState
          icon="lock-closed-outline"
          title="Không có quyền xem tin nhắn"
          message="Tài khoản của bạn chưa được cấp quyền inbox."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="px-4 pt-3">
        <Input
          placeholder="Tìm hội thoại..."
          leftIcon="search-outline"
          value={tim}
          onChangeText={setTim}
          autoCapitalize="none"
        />
      </View>
      {q.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={MAU.primary} />
        </View>
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching && !q.isPending}
              onRefresh={() => void q.refetch()}
            />
          }
          renderItem={({ item }) => {
            const actions = [];
            if (item.chuaDoc > 0) {
              actions.push({
                key: 'doc',
                label: 'Đã đọc',
                icon: 'mail-open-outline' as const,
                bg: 'bg-blue-600',
                onPress: () => void danhDau(item.id),
              });
            }
            actions.push({
              key: 'an',
              label: 'Ẩn',
              icon: 'eye-off-outline' as const,
              bg: 'bg-neutral-600',
              onPress: () => anHoiThoai(item.id),
            });
            return (
              <SwipeToAction actions={actions}>
                <HoiThoaiRow
                  hoiThoai={item}
                  onPress={() => router.push(`/inbox/${item.id}` as never)}
                />
              </SwipeToAction>
            );
          }}
          ListEmptyComponent={
            timTre ? (
              <EmptyState
                icon="search-outline"
                title="Không tìm thấy hội thoại"
                message="Thử từ khoá khác."
              />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Chưa có hội thoại"
                message="Nhắn tin cho khách từ màn chi tiết phiếu bán."
                cta={{
                  label: 'Mở màn Bán hàng',
                  onPress: () => router.push('/kho' as never),
                  icon: 'storefront-outline',
                }}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
