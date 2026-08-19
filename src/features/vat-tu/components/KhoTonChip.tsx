import { View, Text } from 'react-native';
import { formatQty } from '../format';

type Props = {
  khoTen: string;
  soLuong: number;
  donViCoBan: string;
};

/** Chip "Kho X: 500 kg" — red khi tồn âm. */
export function KhoTonChip({ khoTen, soLuong, donViCoBan }: Props) {
  const isNeg = soLuong < 0;
  const tone = isNeg ? 'bg-red-50 border-red-200' : 'bg-neutral-100 border-neutral-200';
  const textTone = isNeg ? 'text-red-700' : 'text-neutral-700';
  return (
    <View className={`rounded-input border ${tone} px-2 py-1 mr-1 mb-1`}>
      <Text className={`text-small ${textTone}`}>
        {khoTen}: <Text className="font-semibold">{formatQty(soLuong, donViCoBan)}</Text>
      </Text>
    </View>
  );
}
