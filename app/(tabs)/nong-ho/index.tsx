import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { listParties } from '../../../src/api/erp/parties';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { ErrorState } from '../../../src/components/ErrorState';
import { apiErrorMessage } from '../../../src/api/client';
import { useMyScope } from '../../../src/auth/store';

type TabKind = 'mine' | 'all';

export default function NongHoList() {
  const [tim, setTim] = useState('');
  const [tab, setTab] = useState<TabKind>('mine');
  const scope = useMyScope();

  const q = useQuery({
    // key theo tab để switch tabs → fetch lại (dữ liệu khác)
    queryKey: ['nong-ho-list', tab],
    queryFn: () => listParties({ kind: 'household', mine: tab === 'mine' }),
    staleTime: 30_000,
  });

  const ds = q.data ?? [];
  const needle = tim.trim().toLowerCase();
  const dsLoc = needle
    ? ds.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) || p.phones.some((ph) => ph.includes(needle)),
      )
    : ds;

  // Hiển thị vùng phụ trách + cảnh báo nếu KTV chưa gán trạm (data nợ ở admin).
  const chuaCoTram = scope && !scope.seeAll && scope.stations.length === 0;
  const tramLabel = scope && scope.stations.length > 0
    ? scope.stations.map((s) => s.commune ?? s.name).join(' · ')
    : null;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-3">
          <Button label="Tạo nông hộ mới" onPress={() => router.push('/nong-ho/tao' as never)} />
        </View>

        {/* Tab "Của tôi (theo vùng)" / "Tất cả" — mặc định của tôi để KTV thấy ngay
            hộ mình phụ trách. Search bar lọc trong danh sách hiện tại. */}
        <View className="flex-row mb-3">
          {(['mine', 'all'] as const).map((t, i) => {
            const active = tab === t;
            const nhan = t === 'mine' ? 'Của tôi' : 'Tất cả';
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 h-11 rounded-input items-center justify-center border ${
                  i > 0 ? 'ml-2' : ''
                } ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                  {nhan}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'mine' && chuaCoTram ? (
          <View className="rounded-card bg-amber-50 border border-amber-200 p-3 mb-3 flex-row">
            <Ionicons name="information-circle-outline" size={18} color="#92400e" />
            <Text className="text-small text-amber-900 ml-2 flex-1">
              Bạn chưa được gán nông trạm nào. Danh sách này chỉ hiện hộ do chính bạn tạo — liên hệ
              admin để gán nông trạm phụ trách.
            </Text>
          </View>
        ) : tab === 'mine' && tramLabel ? (
          <View className="rounded-card bg-primary-50 border border-primary/20 p-3 mb-3">
            <Text className="text-small text-primary">Vùng phụ trách: {tramLabel}</Text>
          </View>
        ) : null}

        <Input
          placeholder="Tìm theo tên hoặc số điện thoại…"
          leftIcon="search-outline"
          value={tim}
          onChangeText={setTim}
          autoCapitalize="none"
        />

        <Text className="text-caption text-ink-muted uppercase mb-2">
          Nông hộ{ds.length ? ` (${ds.length})` : ''}
        </Text>

        {q.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : q.isError ? (
          <ErrorState message={apiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        ) : dsLoc.length > 0 ? (
          dsLoc.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/nong-ho/${p.id}` as never)}
              className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
            >
              <View className="h-10 w-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                <Ionicons name="person" size={18} color="#dd1c2e" />
              </View>
              <View className="flex-1">
                <Text className="text-body text-ink font-semibold">{p.name}</Text>
                <Text className="text-caption text-ink-muted" numberOfLines={1}>
                  {p.phones[0] ?? 'Chưa có SĐT'}
                  {p.commune ? ` · ${p.commune}` : p.address ? ` · ${p.address}` : ''}
                </Text>
                {p.createdByName ? (
                  <Text className="text-small text-ink-muted mt-0.5" numberOfLines={1}>
                    Người tạo: {p.createdByName}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
          ))
        ) : (
          <View className="rounded-card bg-white border border-border p-6 items-center">
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text className="text-caption text-ink-muted mt-2 text-center">
              {needle
                ? 'Không có hộ nào khớp tìm kiếm.'
                : tab === 'mine'
                ? 'Chưa có nông hộ nào trong vùng của bạn. Tạo hộ đầu tiên, hoặc chuyển tab "Tất cả".'
                : 'Chưa có nông hộ nào.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
