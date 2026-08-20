import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getParty } from '../../../src/api/erp/parties';
import { listPlotsKemHo } from '../../../src/api/erp/growing-areas';
import { ThuaDatCard } from '../../../src/features/den-thua/components/ThuaDatCard';
import { Button } from '../../../src/components/Button';
import { ErrorState } from '../../../src/components/ErrorState';
import { apiErrorMessage } from '../../../src/api/client';
import { GENDER_LABELS } from '../../../src/features/orders/types';

function InfoRow({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value?: string }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center mt-1.5">
      <Ionicons name={icon} size={15} color="#6b7280" />
      <Text className="text-caption text-ink ml-2 flex-1">{value}</Text>
    </View>
  );
}

// dd/MM/yyyy HH:mm — chống lệch múi giờ VN (server trả UTC ISO, `new Date` cast local).
function formatVn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NongHoDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const partyId = typeof id === 'string' ? id : '';

  const partyQuery = useQuery({
    queryKey: ['party', partyId],
    queryFn: () => getParty(partyId),
    enabled: Boolean(partyId),
  });
  const plotsQuery = useQuery({
    queryKey: ['thua-by-party', partyId],
    queryFn: () => listPlotsKemHo({ partyId }),
    enabled: Boolean(partyId),
  });

  if (partyQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-soft">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (partyQuery.isError || !partyQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <ErrorState
          message={partyQuery.error ? apiErrorMessage(partyQuery.error) : 'Không tìm thấy nông hộ'}
          onRetry={() => void partyQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const ho = partyQuery.data;
  const thuas = plotsQuery.data ?? [];

  const taoThua = () => {
    const q = ho.lat != null && ho.lng != null ? `?lat=${ho.lat}&lng=${ho.lng}` : '';
    router.push(`/thua/tao-thua${q}` as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Thông tin hộ */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-full bg-primary-50 items-center justify-center mr-3">
              <Ionicons name="person" size={22} color="#dd1c2e" />
            </View>
            <View className="flex-1">
              <Text className="text-h2 text-ink">{ho.name}</Text>
              <Text className="text-caption text-ink-muted font-mono mt-0.5">{ho.id}</Text>
            </View>
          </View>

          <View className="mt-2">
            <InfoRow icon="call-outline" value={ho.phones[0]} />
            <InfoRow icon="location-outline" value={ho.address ?? ho.commune} />
            <InfoRow
              icon="card-outline"
              value={ho.cccd ? `CCCD: ${ho.cccd}` : undefined}
            />
            <InfoRow
              icon="male-female-outline"
              value={ho.gender ? GENDER_LABELS[ho.gender] : undefined}
            />
            {/* Attribution: KTV nào tạo + vùng chuẩn hoá + ngày tạo. Backend enrich
                sẵn createdByName; các field cũ (mock) không có → InfoRow ẩn tự động. */}
            <InfoRow
              icon="person-add-outline"
              value={ho.createdByName ? `Người tạo: ${ho.createdByName}` : undefined}
            />
            <InfoRow
              icon="business-outline"
              value={ho.commune ? `Nông trạm/vùng: ${ho.commune}` : undefined}
            />
            <InfoRow
              icon="calendar-outline"
              value={ho.createdAt ? `Tạo lúc ${formatVn(ho.createdAt)}` : undefined}
            />
          </View>
        </View>

        {/* Thửa của hộ */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-caption text-ink-muted uppercase">
            Thửa của hộ{thuas.length ? ` (${thuas.length})` : ''}
          </Text>
        </View>

        {plotsQuery.isPending ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#dd1c2e" />
          </View>
        ) : thuas.length > 0 ? (
          thuas.map((t) => (
            <ThuaDatCard key={t.id} thua={t} onPress={() => router.push(`/thua/${t.id}` as never)} />
          ))
        ) : (
          <View className="rounded-card bg-white border border-border p-5 items-center mb-2">
            <Ionicons name="leaf-outline" size={36} color="#d1d5db" />
            <Text className="text-caption text-ink-muted mt-2 text-center">
              Hộ này chưa có thửa nào.
            </Text>
          </View>
        )}

        <View className="mt-3">
          <Button label="Tạo thửa cho hộ" variant="secondary" onPress={taoThua} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
