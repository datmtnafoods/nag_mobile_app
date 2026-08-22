import { View, Text } from 'react-native';

/** Nhãn ngày ngăn giữa các nhóm tin trong màn chat ("Hôm nay", "Hôm qua", "Thứ Hai, 19/08"). */
export function DaySeparator({ nhan }: { nhan: string }) {
  return (
    <View className="items-center my-2">
      <View className="rounded-full bg-neutral-200 px-3 py-1">
        <Text className="text-small text-ink-muted font-medium">{nhan}</Text>
      </View>
    </View>
  );
}
