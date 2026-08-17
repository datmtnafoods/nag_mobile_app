import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VatTu } from '../types';
import { formatVND } from '../format';

type Props = {
  sku: VatTu;
  loaiTen?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

export function SkuRow({ sku, loaiTen, onPress, right }: Props) {
  const Container: React.ElementType = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
    >
      <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
        <Ionicons name="cube-outline" size={20} color="#dd1c2e" />
      </View>
      <View className="flex-1">
        <Text className="text-body text-ink font-semibold" numberOfLines={1}>
          {sku.ten}
        </Text>
        <Text className="text-caption text-ink-muted" numberOfLines={1}>
          {loaiTen ? `${loaiTen} · ` : ''}
          {sku.donViCoBan}
          {sku.donViLon && sku.heSoQuyDoi ? ` (${sku.heSoQuyDoi} ${sku.donViCoBan}/${sku.donViLon})` : ''}
        </Text>
        {sku.giaBan ? (
          <Text className="text-caption text-primary font-semibold mt-0.5">
            {formatVND(sku.giaBan)}/{sku.donViCoBan}
          </Text>
        ) : null}
      </View>
      {right}
    </Container>
  );
}
