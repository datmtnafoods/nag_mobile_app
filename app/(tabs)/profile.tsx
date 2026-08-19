import { View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, useCurrentUser } from '../../src/auth/store';
import { logout } from '../../src/api/erp/auth';
import { Button } from '../../src/components/Button';
import { API_BASE_URL, MOCK_API } from '../../src/api/client';
import { useCartStore, CART_STORAGE_KEY } from '../../src/stores/cart';
import { useReceiptDraftStore, RECEIPT_DRAFT_KEY } from '../../src/stores/receipt-draft';
import { useKiemDraftStore, KIEM_DRAFT_KEY } from '../../src/stores/kiem-draft';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABELS, PROVIDER_LABELS, nurseryName } from '../../src/features/auth/roles';

function initialsOf(name?: string, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Profile() {
  const user = useCurrentUser();
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await clearSession();
          useCartStore.getState().reset();
          useReceiptDraftStore.getState().reset();
          useKiemDraftStore.getState().reset();
          await Promise.all([
            AsyncStorage.removeItem(CART_STORAGE_KEY),
            AsyncStorage.removeItem(RECEIPT_DRAFT_KEY),
            AsyncStorage.removeItem(KIEM_DRAFT_KEY),
          ]);
          qc.clear();
        },
      },
    ]);
  };

  const providerLabel = user?.provider ? PROVIDER_LABELS[user.provider] : null;
  const providerTone =
    user?.provider === 'entra'
      ? 'bg-blue-100 text-blue-800'
      : user?.provider === 'entra_external'
        ? 'bg-violet-100 text-violet-800'
        : 'bg-neutral-100 text-neutral-800';

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="rounded-card bg-white border border-border p-4 items-center">
          <View className="h-20 w-20 rounded-frame bg-primary items-center justify-center mb-3">
            <Text className="text-white text-h1">{initialsOf(user?.name, 'N')}</Text>
          </View>
          <Text className="text-h2 text-ink text-center">{user?.name ?? 'Không rõ'}</Text>
          {user?.email ? (
            <Text className="text-caption text-ink-muted mt-1">{user.email}</Text>
          ) : null}
          {providerLabel ? (
            <View className={`rounded-input mt-2 px-2 py-1 ${providerTone.split(' ')[0]}`}>
              <Text className={`text-small ${providerTone.split(' ')[1]}`}>{providerLabel}</Text>
            </View>
          ) : null}
          {user?.roles?.length ? (
            <View className="flex-row flex-wrap justify-center mt-3 gap-x-1 gap-y-1">
              {user.roles.map((role) => (
                <View key={role} className="rounded-input bg-primary-50 px-2 py-1">
                  <Text className="text-small text-primary-700">{ROLE_LABELS[role] ?? role}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {(user?.department ||
          user?.salesTerritory ||
          (user?.nurseryIds && user.nurseryIds.length > 0) ||
          user?.group) ? (
          <View className="rounded-card bg-white border border-border mt-4 p-4">
            <Text className="text-caption text-ink-muted mb-2">Thông tin</Text>
            {user?.department ? (
              <View className="flex-row justify-between py-1">
                <Text className="text-body text-ink-muted">Phòng ban</Text>
                <Text className="text-body text-ink text-right flex-1 ml-3">
                  {user.department}
                </Text>
              </View>
            ) : null}
            {user?.salesTerritory ? (
              <View className="flex-row justify-between py-1">
                <Text className="text-body text-ink-muted">Vùng phụ trách</Text>
                <Text className="text-body text-ink text-right flex-1 ml-3">
                  {user.salesTerritory}
                </Text>
              </View>
            ) : null}
            {user?.nurseryIds && user.nurseryIds.length > 0 ? (
              <View className="flex-row justify-between py-1">
                <Text className="text-body text-ink-muted">Viện sản xuất</Text>
                <Text className="text-body text-ink text-right flex-1 ml-3">
                  {user.nurseryIds.map(nurseryName).join(', ')}
                </Text>
              </View>
            ) : null}
            {user?.group ? (
              <View className="flex-row justify-between py-1">
                <Text className="text-body text-ink-muted">Nhóm</Text>
                <Text className="text-body text-ink text-right flex-1 ml-3">{user.group}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="rounded-card bg-white border border-border mt-4 p-4">
          <Text className="text-caption text-ink-muted">Backend</Text>
          <Text className="text-body text-ink mt-1">
            {MOCK_API ? 'Mock API (offline)' : API_BASE_URL}
          </Text>
        </View>

        <View className="mt-6">
          <Button label="Đăng xuất" variant="secondary" onPress={onLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
