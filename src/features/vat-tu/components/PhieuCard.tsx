import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PhieuHeader } from '../types';
import { formatDate, formatQty, formatVND, RECEIPT_KIND_META, RECEIPT_STATUS_META } from '../format';
import { KindBadge } from './KindBadge';

export function PhieuCard({ phieu, onPress }: { phieu: PhieuHeader; onPress: () => void }) {
  const kindMeta = RECEIPT_KIND_META[phieu.kind];
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${kindMeta.label} ${phieu.id}, ${statusMeta.label}, ${formatVND(phieu.tongTien)}`}
      accessibilityHint="Nhấn để xem chi tiết phiếu"
      className={`rounded-card bg-white border border-border border-l-4 ${kindMeta.border} p-4 mb-3 active:bg-bg-soft`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-body text-ink font-semibold">{phieu.id}</Text>
          <Text className="text-caption text-ink-muted mt-0.5">
            {formatDate(phieu.taoLuc)}
            {phieu.partnerTen ? ` · ${phieu.partnerTen}` : ''}
          </Text>
        </View>
        <View className="items-end gap-y-1">
          <KindBadge kind={phieu.kind} small />
          <View className={`rounded-input px-2 py-0.5 ${statusMeta.bg}`}>
            <Text className={`text-small font-semibold ${statusMeta.text}`}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center mt-1">
        <Ionicons name="business-outline" size={14} color="#6b7280" />
        <Text className="text-caption text-ink-muted ml-1" numberOfLines={1}>
          {phieu.khoTen ?? phieu.khoId}
        </Text>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
        <Text className="text-caption text-ink-muted">
          Tổng: {formatQty(phieu.tongSoLuong)}
        </Text>
        <Text
          className={`text-body text-ink font-semibold ${
            phieu.trangThai === 'huy' ? 'line-through opacity-60' : ''
          }`}
        >
          {formatVND(phieu.tongTien)}
        </Text>
      </View>
    </Pressable>
  );
}
