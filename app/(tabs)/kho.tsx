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
import { SectionLabel } from '../../src/components/SectionLabel';
import { RowGroup } from '../../src/components/RowGroup';
import { ListRow } from '../../src/components/ListRow';
import { BONG, MAU, type Accent } from '../../src/theme/tokens';

type CardKey =
  | 'danh_muc'
  | 'nhap'
  | 'ban'
  | 'ton_kho'
  | 'kiem_ke'
  | 'chuyen_kho'
  | 'don_giong'
  | 'quet_tem';

type CardMeta = {
  key: CardKey;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  /** Quyền hiển thị khi thiếu. Bỏ trống với card luôn mở (đơn giống, quét tem). */
  permLabel?: string;
  gate: (perms: ReturnType<typeof permsForVatTu>) => boolean;
};

// Màu THEO NHÓM (không mỗi row một màu) — phân biệt bằng icon, không bằng cầu vồng.
type CardGroup = { label: string; accent: Accent; cards: CardMeta[] };

const CARD_GROUPS: CardGroup[] = [
  {
    label: 'Nghiệp vụ hằng ngày',
    accent: 'do',
    cards: [
      {
        key: 'ban',
        title: 'Bán hàng',
        icon: 'arrow-up-circle-outline',
        href: '/vat-tu/ban-hang',
        permLabel: 'kho:ban',
        gate: (p) => p.has('kho:ban') || p.has('kho:view'),
      },
      {
        key: 'nhap',
        title: 'Nhập kho',
        icon: 'download-outline',
        href: '/vat-tu/nhap-kho',
        permLabel: 'kho:nhap',
        gate: (p) => p.has('kho:nhap') || p.has('kho:view'),
      },
      {
        key: 'chuyen_kho',
        title: 'Chuyển kho',
        icon: 'swap-horizontal-outline',
        href: '/vat-tu/chuyen-kho',
        permLabel: 'kho:chuyen',
        // Bên nhận (chỉ có kho:nhan) cũng cần vào danh sách để xác nhận nhận.
        gate: (p) => p.has('kho:chuyen') || p.has('kho:nhan') || p.has('kho:view'),
      },
      {
        key: 'kiem_ke',
        title: 'Kiểm kho',
        icon: 'clipboard-outline',
        href: '/vat-tu/kiem-kho',
        permLabel: 'kho:kiem',
        gate: (p) => p.has('kho:kiem') || p.has('kho:view'),
      },
    ],
  },
  {
    label: 'Tra cứu & danh mục',
    accent: 'xanh-duong',
    cards: [
      {
        key: 'ton_kho',
        title: 'Tồn kho',
        icon: 'stats-chart-outline',
        href: '/vat-tu/ton-kho',
        permLabel: 'kho:view',
        gate: (p) => p.has('kho:view'),
      },
      {
        key: 'danh_muc',
        title: 'Danh mục',
        icon: 'albums-outline',
        href: '/vat-tu/danh-muc',
        permLabel: 'vattu:view',
        gate: (p) => p.has('vattu:view'),
      },
    ],
  },
  {
    label: 'Tiện ích',
    accent: 'xam',
    cards: [
      {
        key: 'don_giong',
        title: 'Đơn hàng giống',
        subtitle: 'Đặt từ vườn ươm',
        icon: 'receipt-outline',
        href: '/orders',
        gate: () => true,
      },
      {
        key: 'quet_tem',
        title: 'Quét tem kích hoạt',
        icon: 'scan-outline',
        href: '/scan',
        gate: () => true,
      },
    ],
  },
];

export default function BanHangTab() {
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
      Alert.alert('Thiếu quyền', `Bạn không có quyền ${card.permLabel ?? 'truy cập'}.`);
      return;
    }
    // Tạo mới từ hub → wipe + mở draft trắng. (Chuyển kho tự start draft ở màn
    // list của nó nên KHÔNG start ở đây, tránh xoá lệnh đang soạn dở.)
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
        <View className="mb-5">
          <Text className="text-h1 text-ink">Bán hàng</Text>
        </View>

        {khoQuery.data && khoQuery.data.length > 0 ? (
          <View
            className="rounded-card-lg bg-white border border-border p-3 mb-5"
            style={BONG.card}
          >
            <SectionLabel>Kho đang chọn</SectionLabel>
            <View className="flex-row flex-wrap">
              {khoQuery.data.map((k) => {
                const active = k.id === khoDangChon;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => setKho(k.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn kho ${k.ten}`}
                    accessibilityState={{ selected: active }}
                    className={`rounded-input mr-2 mb-1 px-3 py-1.5 border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={k.loai === 'tong' ? 'business' : 'storefront-outline'}
                        size={14}
                        color={active ? MAU.white : MAU.inkMuted}
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

        {CARD_GROUPS.map((group) => (
          <View key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <RowGroup inset={72}>
              {group.cards.map((card) => (
                <ListRow
                  key={card.key}
                  title={card.title}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  accent={group.accent}
                  size="lon"
                  grouped
                  enabled={card.gate(perms)}
                  permLabel={card.permLabel}
                  onPress={() => onCardPress(card)}
                />
              ))}
              {group.label === 'Tiện ích' && canManageCatalog(perms) && activeKho ? (
                <ListRow
                  title="Gắn mã QR cho SKU"
                  subtitle="Gán mã lạ vào SKU"
                  icon="qr-code-outline"
                  accent="xam"
                  size="lon"
                  grouped
                  onPress={() => router.push('/vat-tu/sku/pair-code' as never)}
                />
              ) : null}
            </RowGroup>
          </View>
        ))}

        <SectionLabel
          className="mt-2"
          right={
            <Pressable onPress={() => router.push('/vat-tu/nhap-kho' as never)}>
              <Text className="text-caption text-primary font-semibold">Nhập kho</Text>
            </Pressable>
          }
        >
          Phiếu gần đây
        </SectionLabel>

        {recentQuery.isPending ? (
          <View className="items-center py-8">
            <ActivityIndicator color={MAU.primary} />
          </View>
        ) : recentQuery.data?.data.length ? (
          recentQuery.data.data.map((p) => (
            <PhieuCard
              key={p.id}
              phieu={p}
              onPress={() => {
                // Kind lạ (BE thêm loại mới, response cũ, corrupt data) — không đoán
                // route, quay về danh sách chức năng thay vì crash detail screen.
                const path =
                  p.kind === 'nhap'
                    ? `/vat-tu/nhap-kho/${p.id}`
                    : p.kind === 'ban'
                      ? `/vat-tu/ban-hang/${p.id}`
                      : p.kind === 'kiem_ke'
                        ? `/vat-tu/kiem-kho/${p.id}`
                        : null;
                if (!path) {
                  Alert.alert('Không mở được phiếu', `Loại phiếu "${p.kind}" chưa có màn chi tiết.`);
                  return;
                }
                router.push(path as never);
              }}
            />
          ))
        ) : (
          <View className="rounded-card-lg bg-white border border-border items-center py-8" style={BONG.card}>
            <Ionicons name="document-text-outline" size={32} color={MAU.inkSoft} />
            <Text className="text-caption text-ink-muted mt-2">Chưa có phiếu nào</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
