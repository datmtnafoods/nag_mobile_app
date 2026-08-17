import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  filterLabel?: string;
  onCreate?: () => void;
  onResetFilter?: () => void;
};

export function EmptyOrders({ filterLabel, onCreate, onResetFilter }: Props) {
  const isFiltered = Boolean(filterLabel);
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
      <Text className="text-h2 text-ink mt-4">
        {isFiltered ? 'Không có đơn phù hợp' : 'Chưa có đơn hàng'}
      </Text>
      <Text className="text-body text-ink-muted mt-2 text-center">
        {isFiltered
          ? `Không có đơn nào ở trạng thái "${filterLabel}".`
          : 'Bạn chưa có đơn nào. Bắt đầu bằng cách tạo đơn đầu tiên.'}
      </Text>

      {isFiltered && onResetFilter ? (
        <Pressable
          onPress={onResetFilter}
          accessibilityRole="button"
          className="mt-5 rounded-input border border-primary px-4 py-2"
        >
          <Text className="text-primary font-semibold">Xem tất cả đơn</Text>
        </Pressable>
      ) : null}

      {!isFiltered && onCreate ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          className="mt-5 rounded-input bg-primary px-4 py-2 flex-row items-center"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-semibold ml-1">Tạo đơn mới</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
