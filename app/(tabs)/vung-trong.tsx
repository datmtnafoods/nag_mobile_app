import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePermissions } from '../../src/auth/store';
import { permsDenThua, type DenThuaPerms } from '../../src/features/den-thua/perms';
import { SectionLabel } from '../../src/components/SectionLabel';
import { RowGroup } from '../../src/components/RowGroup';
import { ListRow } from '../../src/components/ListRow';

type RowMeta = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  permLabel?: string;
  gate: (p: DenThuaPerms) => boolean;
};

// Hai row bản đồ, khác đích:
//   quanh_ban       → màn riêng `/thua/quanh-ban` (full-screen, zoom về GPS).
//   danh_sach_thua  → tab Thửa, chế độ Bản đồ (fit-bounds toàn bộ thửa).
const NHOM_THUA: RowMeta[] = [
  {
    key: 'quanh_ban',
    title: 'Thửa quanh bạn',
    subtitle: 'Theo GPS',
    icon: 'locate-outline',
    href: '/thua/quanh-ban',
    permLabel: 'activation:view',
    gate: (p) => p.xemThua,
  },
  {
    key: 'danh_sach_thua',
    title: 'Danh sách thửa',
    icon: 'map-outline',
    href: '/den-thua?view=ban-do',
    permLabel: 'activation:view',
    gate: (p) => p.xemThua,
  },
  {
    key: 'tao_thua',
    title: 'Tạo thửa mới',
    icon: 'add-circle-outline',
    href: '/thua/tao-thua',
    permLabel: 'growing-area:draw',
    gate: (p) => p.veThua,
  },
];

const NHOM_HO: RowMeta[] = [
  {
    key: 'nong_ho',
    title: 'Nông hộ',
    icon: 'people-outline',
    href: '/nong-ho',
    gate: () => true,
  },
  {
    key: 'tao_ho',
    title: 'Tạo nông hộ',
    icon: 'person-add-outline',
    href: '/nong-ho/tao',
    permLabel: 'party:create',
    gate: (p) => p.taoHo,
  },
];

export default function VungTrongTab() {
  const permissions = usePermissions();
  const perms = permsDenThua(permissions);

  const onRowPress = (row: RowMeta) => {
    if (!row.gate(perms)) {
      Alert.alert('Thiếu quyền', `Bạn không có quyền ${row.permLabel ?? 'truy cập'}.`);
      return;
    }
    router.push(row.href as never);
  };

  const renderRow = (row: RowMeta, accent: 'xanh-la' | 'tim') => (
    <ListRow
      key={row.key}
      title={row.title}
      subtitle={row.subtitle}
      icon={row.icon}
      accent={accent}
      size="lon"
      grouped
      enabled={row.gate(perms)}
      permLabel={row.permLabel}
      onPress={() => onRowPress(row)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="mb-5">
          <Text className="text-h1 text-ink">Vùng trồng</Text>
        </View>

        <SectionLabel>Thửa đất</SectionLabel>
        <RowGroup inset={72}>{NHOM_THUA.map((row) => renderRow(row, 'xanh-la'))}</RowGroup>

        <View className="mb-5" />

        <SectionLabel>Nông hộ</SectionLabel>
        <RowGroup inset={72}>{NHOM_HO.map((row) => renderRow(row, 'tim'))}</RowGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
