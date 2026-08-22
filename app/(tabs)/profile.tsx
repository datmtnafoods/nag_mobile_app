import { View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore, useCurrentUser, usePermissions } from '../../src/auth/store';
import { logout } from '../../src/api/erp/auth';
import { Button } from '../../src/components/Button';
import { SectionLabel } from '../../src/components/SectionLabel';
import { RowGroup } from '../../src/components/RowGroup';
import { ListRow } from '../../src/components/ListRow';
import { API_BASE_URL, MOCK_API } from '../../src/api/client';
import { useCartStore, CART_STORAGE_KEY } from '../../src/stores/cart';
import { useReceiptDraftStore, RECEIPT_DRAFT_KEY } from '../../src/stores/receipt-draft';
import { useKiemDraftStore, KIEM_DRAFT_KEY } from '../../src/stores/kiem-draft';
import { useInboxDraftStore } from '../../src/stores/inbox-draft';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_SCOPE_LABELS,
  PROVIDER_LABELS,
  nurseryName,
} from '../../src/features/auth/roles';
import { ACCENT, BONG, ICON } from '../../src/theme/tokens';

function initialsOf(name?: string, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Profile() {
  const user = useCurrentUser();
  const permissions = usePermissions();
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
          useInboxDraftStore.getState().reset();
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
  const provAccent =
    user?.provider === 'entra'
      ? ACCENT['xanh-duong']
      : user?.provider === 'entra_external'
        ? ACCENT.tim
        : ACCENT.xam;

  const roles = user?.roles ?? [];

  const infoRows = [
    user?.department ? { label: 'Phòng ban', value: user.department } : null,
    user?.salesTerritory ? { label: 'Vùng phụ trách', value: user.salesTerritory } : null,
    user?.nurseryIds && user.nurseryIds.length > 0
      ? { label: 'Viện sản xuất', value: user.nurseryIds.map(nurseryName).join(', ') }
      : null,
    user?.group ? { label: 'Nhóm', value: user.group } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Danh tính */}
        <View
          className="rounded-card-lg bg-white border border-border p-5 items-center"
          style={BONG.card}
        >
          <View className="h-20 w-20 rounded-full bg-primary-100 items-center justify-center mb-3">
            <Text className="text-h1 text-primary-700">{initialsOf(user?.name, 'N')}</Text>
          </View>
          <Text className="text-h2 text-ink text-center">{user?.name ?? 'Không rõ'}</Text>
          {user?.email ? (
            <Text className="text-caption text-ink-muted mt-1">{user.email}</Text>
          ) : null}
          {providerLabel ? (
            <View className={`rounded-input mt-2 px-2 py-1 ${provAccent.bg}`}>
              <Text className={`text-small ${provAccent.text}`}>{providerLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Vai trò */}
        {roles.length > 0 ? (
          <View className="mt-6">
            <SectionLabel>Vai trò</SectionLabel>
            <View className="rounded-card-lg bg-white border border-border px-4" style={BONG.card}>
              {roles.map((role, i) => (
                <View
                  key={role}
                  className={`flex-row items-start py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="w-10 h-10 rounded-input items-center justify-center mr-3 bg-primary-100">
                    <Ionicons name="shield-checkmark-outline" size={ICON.vua} color={ACCENT.do.icon} />
                  </View>
                  <View className="flex-1 pr-2">
                    <Text className="text-body text-ink font-semibold">
                      {ROLE_LABELS[role] ?? role}
                    </Text>
                    {ROLE_DESCRIPTIONS[role] ? (
                      <Text className="text-caption text-ink-muted mt-0.5">
                        {ROLE_DESCRIPTIONS[role]}
                      </Text>
                    ) : null}
                  </View>
                  {ROLE_SCOPE_LABELS[role] ? (
                    <View className="rounded-input bg-primary-50 px-2 py-1 mt-0.5">
                      <Text className="text-small text-primary-700">{ROLE_SCOPE_LABELS[role]}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Thông tin */}
        {infoRows.length > 0 ? (
          <View className="mt-6">
            <SectionLabel>Thông tin</SectionLabel>
            <View className="rounded-card-lg bg-white border border-border px-4" style={BONG.card}>
              {infoRows.map((row, i) => (
                <View
                  key={row.label}
                  className={`flex-row justify-between py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <Text className="text-body text-ink-muted">{row.label}</Text>
                  <Text className="text-body text-ink text-right flex-1 ml-3">{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Ứng dụng */}
        <View className="mt-6">
          <SectionLabel>Ứng dụng</SectionLabel>
          <RowGroup>
            <ListRow
              grouped
              icon="information-circle-outline"
              accent="xanh-duong"
              title="Giới thiệu NaGreen"
              subtitle="Phiên bản, tính năng"
              onPress={() => router.push('/gioi-thieu' as never)}
            />
            <ListRow
              grouped
              icon="help-buoy-outline"
              accent="xanh-la"
              title="Trợ giúp & liên hệ"
              subtitle="Hỗ trợ, hotline, email"
              onPress={() => router.push('/tro-giup' as never)}
            />
          </RowGroup>
        </View>

        {/* Nhà phát triển (chỉ dev) */}
        {__DEV__ ? (
          <View className="mt-6">
            <SectionLabel>Nhà phát triển</SectionLabel>
            <View className="rounded-card-lg bg-white border border-border p-4" style={BONG.card}>
              <Text className="text-caption text-ink-muted">Backend</Text>
              <Text className="text-body text-ink mt-0.5">
                {MOCK_API ? 'Mock API (offline)' : API_BASE_URL}
              </Text>
              <Text className="text-caption text-ink-muted mt-3">
                Quyền ({permissions.includes('*') ? 'toàn quyền' : permissions.length})
              </Text>
              {!permissions.includes('*') && permissions.length > 0 ? (
                <Text className="text-small text-ink-soft mt-0.5">{permissions.join(' · ')}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View className="mt-4">
          <Button label="Đăng xuất" variant="danger" onPress={onLogout} />
        </View>

        <Text className="text-small text-ink-soft text-center mt-4">
          NaGreen · Phiên bản {version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
