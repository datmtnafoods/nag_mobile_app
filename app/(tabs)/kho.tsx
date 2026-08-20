import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listKho, listReceipts } from '../../src/api/erp/warehouse';
import { PhieuCard } from '../../src/features/vat-tu/components/PhieuCard';
import { usePermissions } from '../../src/auth/store';
import {
  canCreateReceipt,
  canDoInventoryCount,
  canManageCatalog,
  permsForVatTu,
} from '../../src/features/vat-tu/perms';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { useKiemDraftStore } from '../../src/stores/kiem-draft';
import { useKhoPicker } from '../../src/stores/kho-picker';

type CardKey = 'danh_muc' | 'nhap' | 'ban' | 'ton_kho' | 'kiem_ke';

type CardMeta = {
  key: CardKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  border: string;
  text: string;
  href: string;
  perm: string;
  gate: (perms: ReturnType<typeof permsForVatTu>) => boolean;
};

const CARDS: CardMeta[] = [
  {
    key: 'danh_muc',
    title: 'Danh mục',
    subtitle: 'SKU + ảnh + mã QR',
    icon: 'albums-outline',
    iconColor: '#dd1c2e',
    bg: 'bg-primary-50',
    border: 'border-primary/30',
    text: 'text-primary-700',
    href: '/vat-tu/danh-muc',
    perm: 'vattu:view',
    gate: (p) => p.has('vattu:view'),
  },
  {
    key: 'nhap',
    title: 'Nhập kho',
    subtitle: 'Lưu tạm hoặc ghi thẳng',
    icon: 'download-outline',
    iconColor: '#166534',
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-800',
    href: '/vat-tu/nhap-kho',
    perm: 'kho:nhap',
    gate: (p) => p.has('kho:nhap') || p.has('kho:view'),
  },
  {
    key: 'ban',
    title: 'Bán hàng',
    subtitle: 'Bán tại quầy trạm',
    icon: 'arrow-up-circle-outline',
    iconColor: '#92400e',
    bg: 'bg-amber-100',
    border: 'border-amber-500',
    text: 'text-amber-800',
    href: '/vat-tu/ban-hang',
    perm: 'kho:ban',
    gate: (p) => p.has('kho:ban') || p.has('kho:view'),
  },
  {
    key: 'ton_kho',
    title: 'Tồn kho',
    subtitle: 'Tồn hiện tại + sổ chi tiết',
    icon: 'stats-chart-outline',
    iconColor: '#1e40af',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    href: '/vat-tu/ton-kho',
    perm: 'kho:view',
    gate: (p) => p.has('kho:view'),
  },
  {
    key: 'kiem_ke',
    title: 'Kiểm kho',
    subtitle: 'Đếm thực tế → cân bằng',
    icon: 'clipboard-outline',
    iconColor: '#4338ca',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    href: '/vat-tu/kiem-kho',
    perm: 'kho:kiem',
    gate: (p) => p.has('kho:kiem') || p.has('kho:view'),
  },
];

export default function VatTuTab() {
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const startReceiptDraft = useReceiptDraftStore((s) => s.startDraft);
  const startKiemDraft = useKiemDraftStore((s) => s.startDraft);
  const khoDangChon = useKhoPicker((s) => s.khoDangChon);
  const setKho = useKhoPicker((s) => s.setKho);

  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: listKho,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!khoDangChon && khoQuery.data && khoQuery.data.length > 0) {
      setKho(khoQuery.data[0]!.id);
    }
  }, [khoDangChon, khoQuery.data, setKho]);

  const recentQuery = useQuery({
    queryKey: ['receipts', 'all', { page: 1, pageSize: 4 }],
    queryFn: () => listReceipts({ kind: 'all', page: 1, pageSize: 4 }),
    staleTime: 30_000,
  });

  const onCardPress = (card: CardMeta) => {
    if (!card.gate(perms)) {
      Alert.alert('Thiếu quyền', `Bạn không có quyền ${card.perm}.`);
      return;
    }
    if (card.key === 'nhap') {
      if (canCreateReceipt(perms, 'nhap')) startReceiptDraft('nhap');
    } else if (card.key === 'ban') {
      if (canCreateReceipt(perms, 'ban')) startReceiptDraft('ban');
    } else if (card.key === 'kiem_ke') {
      if (canDoInventoryCount(perms)) startKiemDraft();
    }
    router.push(card.href as never);
  };

  const activeKho = khoQuery.data?.find((k) => k.id === khoDangChon);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="mb-4">
          <Text className="text-h1 text-ink">Quản lý vật tư</Text>
          <Text className="text-caption text-ink-muted mt-1">
            Danh mục, nhập/bán, tồn kho và kiểm kê.
          </Text>
        </View>

        {khoQuery.data && khoQuery.data.length > 0 ? (
          <View className="rounded-card bg-white border border-border p-3 mb-4">
            <Text className="text-caption text-ink-muted uppercase mb-2">Kho đang chọn</Text>
            <View className="flex-row flex-wrap">
              {khoQuery.data.map((k) => {
                const active = k.id === khoDangChon;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => setKho(k.id)}
                    className={`rounded-input mr-2 mb-1 px-3 py-1.5 border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={k.loai === 'tong' ? 'business' : 'storefront-outline'}
                        size={14}
                        color={active ? '#fff' : '#6b7280'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        className={`text-caption ${
                          active ? 'text-white font-semibold' : 'text-ink'
                        }`}
                      >
                        {k.ten}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text className="text-caption text-ink-muted uppercase mb-2">Chức năng</Text>
        <View className="flex-row flex-wrap -mx-1 mb-2">
          {CARDS.map((card) => {
            const enabled = card.gate(perms);
            return (
              <View key={card.key} className="w-1/2 px-1 mb-2">
                <Pressable
                  onPress={() => onCardPress(card)}
                  disabled={!enabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !enabled }}
                  className={`rounded-card p-4 border ${
                    enabled ? `${card.bg} ${card.border}` : 'bg-neutral-100 border-border opacity-50'
                  } active:opacity-80`}
                >
                  <Ionicons name={card.icon} size={26} color={enabled ? card.iconColor : '#9ca3af'} />
                  <Text
                    className={`text-body font-semibold mt-2 ${enabled ? card.text : 'text-ink-muted'}`}
                  >
                    {card.title}
                  </Text>
                  <Text
                    className={`text-small mt-1 ${enabled ? card.text : 'text-ink-muted'} opacity-90`}
                  >
                    {enabled ? card.subtitle : `Cần quyền ${card.perm}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {canManageCatalog(perms) && activeKho ? (
          <Pressable
            onPress={() => router.push('/vat-tu/sku/pair-code' as never)}
            className="rounded-card bg-white border border-border p-3 mt-2 flex-row items-center active:bg-bg-soft"
          >
            <View className="w-10 h-10 rounded-input bg-primary-50 items-center justify-center mr-3">
              <Ionicons name="qr-code-outline" size={22} color="#dd1c2e" />
            </View>
            <View className="flex-1">
              <Text className="text-body text-ink font-semibold">Gắn mã QR cho SKU</Text>
              <Text className="text-caption text-ink-muted">
                Quét mã lạ → chọn SKU → gắn để lần sau nhận diện
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>
        ) : null}

        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-h2 text-ink">Phiếu gần đây</Text>
          <Pressable onPress={() => router.push('/vat-tu/nhap-kho' as never)}>
            <Text className="text-caption text-primary font-semibold">Nhập kho</Text>
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
              onPress={() => {
                const path =
                  p.kind === 'nhap'
                    ? `/vat-tu/nhap-kho/${p.id}`
                    : p.kind === 'ban'
                      ? `/vat-tu/ban-hang/${p.id}`
                      : `/vat-tu/kiem-kho/${p.id}`;
                router.push(path as never);
              }}
            />
          ))
        ) : (
          <Text className="text-caption text-ink-muted text-center py-8">Chưa có phiếu nào</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
