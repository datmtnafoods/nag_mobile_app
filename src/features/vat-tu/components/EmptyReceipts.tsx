import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  filterLabel?: string;
  onCreate?: () => void;
  onResetFilter?: () => void;
  createLabel?: string;
};

export function EmptyReceipts({
  filterLabel,
  onCreate,
  onResetFilter,
  createLabel = 'Tạo phiếu mới',
}: Props) {
  const isFiltered = Boolean(filterLabel);
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
      <Text className="text-h2 text-ink mt-4">
        {isFiltered ? 'Không có phiếu phù hợp' : 'Chưa có phiếu nào'}
      </Text>
      <Text className="text-body text-ink-muted mt-2 text-center">
        {isFiltered ? `Không có phiếu ở "${filterLabel}".` : 'Bắt đầu bằng cách tạo phiếu đầu tiên.'}
      </Text>
      {isFiltered && onResetFilter ? (
        <Pressable
          onPress={onResetFilter}
          accessibilityRole="button"
          className="mt-5 rounded-input border border-primary px-4 py-2"
        >
          <Text className="text-primary font-semibold">Xem tất cả</Text>
        </Pressable>
      ) : null}
      {!isFiltered && onCreate ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          className="mt-5 rounded-input bg-primary px-4 py-2 flex-row items-center"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-semibold ml-1">{createLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
