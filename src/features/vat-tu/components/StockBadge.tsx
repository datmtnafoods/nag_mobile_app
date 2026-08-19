import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatQty } from '../format';

type Props = {
  soLuong: number;
  donViCoBan: string;
  /** Định mức tối thiểu (tonMin) — dưới mức này hiện tone amber. */
  tonMin?: number;
  compact?: boolean;
  /** Backwards-compat: nếu không có tonMin, dùng lowThreshold. */
  lowThreshold?: number;
};

/**
 * 3 tone: âm (red + "Âm"), dưới định mức (amber + "Dưới định mức"), dư (green).
 * Ưu tiên tonMin (định mức SKU) hơn lowThreshold (fallback cũ).
 */
export function StockBadge({ soLuong, donViCoBan, tonMin, lowThreshold = 5, compact }: Props) {
  const threshold = tonMin ?? lowThreshold;
  const isNeg = soLuong < 0;
  const isLow = !isNeg && soLuong <= threshold;
  const tone = isNeg
    ? { bg: 'bg-red-50', text: 'text-red-700', icon: 'alert-circle-outline', color: '#b91c1c', label: 'Âm' }
    : isLow
      ? {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          icon: 'warning-outline',
          color: '#92400e',
          label: tonMin != null ? 'Dưới định mức' : 'Thấp',
        }
      : {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: 'checkmark-circle-outline',
          color: '#166534',
          label: null as string | null,
        };

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
      {tone.label ? (
        <Text className={`${tone.text} ${compact ? 'text-small' : 'text-caption'} ml-1`}>
          · {tone.label}
        </Text>
      ) : null}
    </View>
  );
}
