import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function EmptyOrders({ filterLabel }: { filterLabel?: string }) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
      <Text className="text-h2 text-ink mt-4">Chưa có đơn hàng</Text>
      <Text className="text-body text-ink-muted mt-2 text-center">
        {filterLabel
          ? `Không có đơn nào ở trạng thái "${filterLabel}".`
          : 'Bạn chưa có đơn nào. Nhấn nút + để tạo đơn mới.'}
      </Text>
    </View>
  );
}
