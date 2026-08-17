import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useCurrentUser } from '../../src/auth/store';
import { logout } from '../../src/api/erp/auth';
import { Button } from '../../src/components/Button';
import { API_BASE_URL, MOCK_API } from '../../src/api/client';
import { useCartStore, CART_STORAGE_KEY } from '../../src/stores/cart';
import { useReceiptDraftStore, RECEIPT_DRAFT_KEY } from '../../src/stores/receipt-draft';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

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
          await Promise.all([
            AsyncStorage.removeItem(CART_STORAGE_KEY),
            AsyncStorage.removeItem(RECEIPT_DRAFT_KEY),
          ]);
          qc.clear();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      <View className="p-4">
        <View className="rounded-card bg-white border border-border p-4 items-center">
          <View className="h-16 w-16 rounded-frame bg-primary items-center justify-center mb-3">
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <Text className="text-h2 text-ink">{user?.fullName ?? user?.username}</Text>
          <Text className="text-caption text-ink-muted mt-1">@{user?.username}</Text>
          {user?.roles?.length ? (
            <View className="flex-row flex-wrap justify-center mt-3 gap-x-1 gap-y-1">
              {user.roles.map((role) => (
                <View key={role} className="rounded-input bg-primary-50 px-2 py-1">
                  <Text className="text-small text-primary-700">{role}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="rounded-card bg-white border border-border mt-4 p-4">
          <Text className="text-caption text-ink-muted">Backend</Text>
          <Text className="text-body text-ink mt-1">
            {MOCK_API ? 'Mock API (offline)' : API_BASE_URL}
          </Text>
        </View>

        <View className="mt-6">
          <Button label="Đăng xuất" variant="secondary" onPress={onLogout} />
        </View>
      </View>
    </SafeAreaView>
  );
}
