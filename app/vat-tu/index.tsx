import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listReceipts } from '../../src/api/erp/warehouse';
import { PhieuCard } from '../../src/features/vat-tu/components/PhieuCard';
import { RECEIPT_KIND_META } from '../../src/features/vat-tu/format';
import { useCurrentUser } from '../../src/auth/store';
import { canCreateReceipt, permsForVatTu } from '../../src/features/vat-tu/perms';
import type { ReceiptKind } from '../../src/features/vat-tu/types';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';

export default function VatTuHome() {
  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const startDraft = useReceiptDraftStore((s) => s.startDraft);
  const { action } = useLocalSearchParams<{ action?: string }>();
  const actionHandledRef = useRef(false);

  useEffect(() => {
    if (actionHandledRef.current) return;
    if (action === 'nhap' || action === 'ban') {
      actionHandledRef.current = true;
      if (!canCreateReceipt(perms, action)) {
        Alert.alert('Thiếu quyền', `Bạn không có quyền tạo phiếu ${RECEIPT_KIND_META[action].label.toLowerCase()}.`);
        return;
      }
      startDraft(action);
      router.push(`/vat-tu/new-receipt?kind=${action}` as never);
    }
  }, [action, perms, startDraft]);

  const recentQuery = useQuery({
    queryKey: ['receipts', 'all', { page: 1, pageSize: 4 }],
    queryFn: () => listReceipts({ kind: 'all', page: 1, pageSize: 4 }),
    staleTime: 30_000,
  });

  const onCreate = (kind: ReceiptKind) => {
    if (!canCreateReceipt(perms, kind)) {
      Alert.alert('Thiếu quyền', `Bạn không có quyền tạo phiếu ${RECEIPT_KIND_META[kind].label.toLowerCase()}.`);
      return;
    }
    startDraft(kind);
    router.push(`/vat-tu/new-receipt?kind=${kind}` as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text className="text-caption text-ink-muted uppercase mb-2">Thao tác</Text>
        <View className="flex-row gap-3 mb-4">
          {(['nhap', 'ban'] as const).map((k) => {
            const meta = RECEIPT_KIND_META[k];
            const enabled = canCreateReceipt(perms, k);
            return (
              <Pressable
                key={k}
                onPress={() => onCreate(k)}
                className={`flex-1 rounded-card p-4 border ${
                  enabled ? `${meta.bg} ${meta.border}` : 'bg-neutral-100 border-border opacity-50'
                }`}
                accessibilityRole="button"
                accessibilityLabel={meta.cta}
                accessibilityState={{ disabled: !enabled }}
              >
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name={meta.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={k === 'nhap' ? '#166534' : '#92400e'}
                  />
                </View>
                <Text className={`${meta.text} text-body font-semibold mt-1`}>{meta.label}</Text>
                <Text className={`${meta.text} text-small opacity-80 mt-1`}>{meta.cta}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-3 mb-4">
          <Pressable
            onPress={() => router.push('/vat-tu/receipts' as never)}
            className="flex-1 rounded-card bg-white border border-border p-4 active:bg-bg-soft"
          >
            <Ionicons name="list-outline" size={22} color="#dd1c2e" />
            <Text className="text-body text-ink font-semibold mt-2">Lịch sử phiếu</Text>
            <Text className="text-caption text-ink-muted mt-1">Nhập + bán + đã huỷ</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/vat-tu/catalog' as never)}
            className="flex-1 rounded-card bg-white border border-border p-4 active:bg-bg-soft"
          >
            <Ionicons name="albums-outline" size={22} color="#dd1c2e" />
            <Text className="text-body text-ink font-semibold mt-2">Danh mục</Text>
            <Text className="text-caption text-ink-muted mt-1">Tra cứu SKU + tồn</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-h2 text-ink">Phiếu gần đây</Text>
          <Pressable onPress={() => router.push('/vat-tu/receipts' as never)}>
            <Text className="text-caption text-primary font-semibold">Xem tất cả</Text>
          </Pressable>
        </View>

        {recentQuery.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : recentQuery.data?.data.length ? (
          recentQuery.data.data.map((p) => (
            <PhieuCard
              key={p.id}
              phieu={p}
              onPress={() => router.push(`/vat-tu/${p.id}` as never)}
            />
          ))
        ) : (
          <Text className="text-caption text-ink-muted text-center py-8">Chưa có phiếu nào</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
