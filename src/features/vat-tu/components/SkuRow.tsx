import { View, Text, Pressable } from 'react-native';
import type { VatTu } from '../types';
import { formatVND } from '../format';
import { SkuThumbnail } from './SkuThumbnail';
import { StockBadge } from './StockBadge';

type Props = {
  sku: VatTu;
  loaiTen?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  /** Tồn kho tại kho đang thao tác — undefined thì không render badge. */
  ton?: number;
};

export function SkuRow({ sku, loaiTen, onPress, right, ton }: Props) {
  const Container: React.ElementType = onPress ? Pressable : View;
  const isNgung = sku.trangThai === 'ngung';
  return (
    <Container
      onPress={onPress}
      className={`rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft ${
        isNgung ? 'opacity-70' : ''
      }`}
    >
      <View className="mr-3">
        <SkuThumbnail uri={sku.anh?.[0]} size={44} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-body text-ink font-semibold flex-1" numberOfLines={1}>
            {sku.ten}
          </Text>
          {isNgung ? (
            <View className="rounded-input bg-neutral-200 px-2 py-0.5 ml-2">
              <Text className="text-small text-neutral-700">Ngừng KD</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-caption text-ink-muted" numberOfLines={1}>
          <Text className="font-mono">{sku.id}</Text>
          {loaiTen ? ` · ${loaiTen}` : ''}
          {' · '}
          {sku.donViCoBan}
          {sku.donViLon && sku.heSoQuyDoi ? ` (1 ${sku.donViLon} = ${sku.heSoQuyDoi} ${sku.donViCoBan})` : ''}
        </Text>
        {sku.giaBan ? (
          <Text className="text-caption text-primary font-semibold mt-0.5">
            {formatVND(sku.giaBan)}/{sku.donViCoBan}
          </Text>
        ) : null}
        {ton !== undefined ? (
          <View className="mt-1">
            <StockBadge soLuong={ton} donViCoBan={sku.donViCoBan} tonMin={sku.tonMin} compact />
          </View>
        ) : null}
      </View>
      {right}
    </Container>
  );
}
