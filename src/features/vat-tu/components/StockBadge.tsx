import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatQty } from '../format';

type Props = {
  soLuong: number;
  donViCoBan: string;
  lowThreshold?: number;
  compact?: boolean;
};

/**
 * Hiển thị mức tồn với 3 tone: âm (red), thấp (amber, <=threshold), dư (green).
 */
export function StockBadge({ soLuong, donViCoBan, lowThreshold = 5, compact }: Props) {
  const tone =
    soLuong < 0
      ? { bg: 'bg-red-50', text: 'text-red-700', icon: 'alert-circle-outline', color: '#b91c1c' }
      : soLuong <= lowThreshold
        ? { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'warning-outline', color: '#92400e' }
        : { bg: 'bg-green-100', text: 'text-green-800', icon: 'checkmark-circle-outline', color: '#166534' };

  return (
    <View
      className={`self-start flex-row items-center rounded-input px-2 ${tone.bg} ${
        compact ? 'py-0.5' : 'py-1'
      }`}
    >
      <Ionicons
        name={tone.icon as keyof typeof Ionicons.glyphMap}
        size={compact ? 12 : 14}
        color={tone.color}
        style={{ marginRight: 4 }}
      />
      <Text className={`${tone.text} ${compact ? 'text-small' : 'text-caption'} font-semibold`}>
        {formatQty(soLuong, donViCoBan)}
      </Text>
    </View>
  );
}
