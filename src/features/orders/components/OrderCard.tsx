import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SeedOrder } from '../types';
import { formatDate, formatQuantity, formatVND, STATUS_META } from '../format';
import { StatusChip } from './StatusChip';

export function OrderCard({ order, onPress }: { order: SeedOrder; onPress: () => void }) {
  const primaryCustomer = order.customers[0];
  const firstLine = primaryCustomer?.lines[0];
  const totalLines = order.customers.reduce((s, c) => s + c.lines.length, 0);
  const extra = totalLines - 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Đơn ${order.orderNo}, ${STATUS_META[order.status].label}, ${formatVND(order.totalAmount)}${primaryCustomer?.name ? `, khách ${primaryCustomer.name}` : ''}`}
      accessibilityHint="Nhấn để xem chi tiết đơn"
      className="rounded-card bg-white border border-border p-4 mb-3 active:bg-bg-soft"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-body text-ink font-semibold">{order.orderNo}</Text>
          <Text className="text-caption text-ink-muted mt-0.5">
            {formatDate(order.orderedOn)}
            {primaryCustomer?.name ? ` · ${primaryCustomer.name}` : ''}
          </Text>
        </View>
        <StatusChip status={order.status} />
      </View>

      {firstLine ? (
        <View className="flex-row items-center mt-1">
          <Ionicons name="leaf-outline" size={16} color="#6b7280" />
          <Text className="text-caption text-ink-muted ml-2 flex-1" numberOfLines={1}>
            {firstLine.seedProductName ?? firstLine.seedProductId}
            {firstLine.varietyCode ? ` · ${firstLine.varietyCode}` : ''}
            {extra > 0 ? ` +${extra} loại` : ''}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
        <View className="flex-row items-center">
          <Ionicons name="cube-outline" size={16} color="#6b7280" />
          <Text className="text-caption text-ink-muted ml-1">
            {formatQuantity(order.totalQuantity)} cây
          </Text>
        </View>
        <Text className="text-body text-ink font-semibold">{formatVND(order.totalAmount)}</Text>
      </View>
    </Pressable>
  );
}
