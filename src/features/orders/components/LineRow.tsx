import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderLine } from '../types';
import { formatQuantity, formatVND } from '../format';

export function LineRow({
  line,
  onRemove,
  onQuantityChange,
  editable,
}: {
  line: OrderLine;
  onRemove?: () => void;
  onQuantityChange?: (delta: number) => void;
  editable?: boolean;
}) {
  const amount = line.amount ?? line.unitPrice * line.quantity;
  return (
    <View className="flex-row items-start py-3 border-b border-border">
      <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
        <Ionicons name="leaf" size={20} color="#dd1c2e" />
      </View>
      <View className="flex-1">
        <Text className="text-body text-ink font-semibold">
          {line.seedProductName ?? line.seedProductId}
        </Text>
        {line.varietyCode ? (
          <Text className="text-caption text-ink-muted">{line.varietyCode}</Text>
        ) : null}
        {line.nurseryName ? (
          <Text className="text-caption text-ink-muted">{line.nurseryName}</Text>
        ) : null}
        <View className="flex-row items-center justify-between mt-2">
          {editable && onQuantityChange ? (
            <View className="flex-row items-center rounded-input border border-border">
              <Pressable
                onPress={() => onQuantityChange(-1)}
                className="h-9 w-9 items-center justify-center"
                accessibilityLabel="Giảm số lượng"
              >
                <Ionicons name="remove" size={18} color="#111827" />
              </Pressable>
              <Text className="text-body text-ink font-semibold w-10 text-center">
                {formatQuantity(line.quantity)}
              </Text>
              <Pressable
                onPress={() => onQuantityChange(1)}
                className="h-9 w-9 items-center justify-center"
                accessibilityLabel="Tăng số lượng"
              >
                <Ionicons name="add" size={18} color="#111827" />
              </Pressable>
            </View>
          ) : (
            <Text className="text-caption text-ink-muted">
              SL: {formatQuantity(line.quantity)} · {formatVND(line.unitPrice)}/cây
            </Text>
          )}
          <Text className="text-body text-ink font-semibold">{formatVND(amount)}</Text>
        </View>
      </View>
      {editable && onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="ml-2 h-8 w-8 items-center justify-center"
          accessibilityLabel="Xoá dòng"
        >
          <Ionicons name="trash-outline" size={18} color="#b91c1c" />
        </Pressable>
      ) : null}
    </View>
  );
}
