import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createNcc, listNcc } from '../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../src/api/client';
import { Input } from '../../src/components/Input';
import { EmptyState } from '../../src/components/EmptyState';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { NccQuickCreateModal } from '../../src/features/vat-tu/components/NccQuickCreateModal';
import { usePermissions } from '../../src/auth/store';
import { canCreateNcc, permsForVatTu } from '../../src/features/vat-tu/perms';

export default function NccPicker() {
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const setPartner = useReceiptDraftStore((s) => s.setPartner);
  const qc = useQueryClient();
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const canCreate = canCreateNcc(perms);

  const nccQuery = useQuery({
    queryKey: ['vat-tu', 'ncc'],
    queryFn: () => listNcc(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createNcc,
    onSuccess: (ncc) => {
      qc.invalidateQueries({ queryKey: ['vat-tu', 'ncc'] });
      setShowCreate(false);
      setCreateErr(null);
      setPartner({ id: ncc.id, ten: ncc.ten, kind: 'ncc' });
      if (router.canGoBack()) router.back();
    },
    onError: (err) => setCreateErr(apiErrorMessage(err)),
  });

  const filtered = (nccQuery.data ?? []).filter((n) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return `${n.ten} ${n.dienThoai ?? ''} ${n.diaChi ?? ''}`.toLowerCase().includes(needle);
  });

  const pick = (id: string, ten: string) => {
    setPartner({ id, ten, kind: 'ncc' });
    if (router.canGoBack()) router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <View className="px-4 pt-3">
        <Input
          placeholder="Tìm NCC..."
          leftIcon="search-outline"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />
      </View>
      {nccQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#dd1c2e" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => pick(item.id, item.ten)}
              className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
            >
              <View className="w-10 h-10 rounded-input bg-blue-50 items-center justify-center mr-3">
                <Ionicons name="business-outline" size={20} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="text-body text-ink font-semibold">{item.ten}</Text>
                <Text className="text-caption text-ink-muted">
                  {item.id}
                  {item.dienThoai ? ` · ${item.dienThoai}` : ''}
                </Text>
                {item.diaChi ? (
                  <Text className="text-small text-ink-muted mt-0.5" numberOfLines={1}>
                    {item.diaChi}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title={q ? 'Không có NCC phù hợp' : 'Chưa có nhà cung cấp'}
              message={
                q ? 'Thử đổi từ khoá tìm kiếm.' : 'Thêm nhà cung cấp đầu tiên để lập phiếu nhập.'
              }
              cta={
                q
                  ? { label: 'Xoá tìm kiếm', onPress: () => setQ(''), variant: 'outline' }
                  : canCreate
                    ? { label: 'Thêm NCC', onPress: () => setShowCreate(true), icon: 'add' }
                    : undefined
              }
            />
          }
        />
      )}

      {canCreate ? (
        <Pressable
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Thêm NCC mới"
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <NccQuickCreateModal
        visible={showCreate}
        submitting={createMutation.isPending}
        errorMessage={createErr}
        onDismiss={() => {
          setShowCreate(false);
          setCreateErr(null);
        }}
        onSubmit={(input) => createMutation.mutate(input)}
      />
    </SafeAreaView>
  );
}
