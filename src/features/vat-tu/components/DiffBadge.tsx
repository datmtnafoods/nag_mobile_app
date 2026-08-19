import { View, Text } from 'react-native';
import { formatQty } from '../format';

type Props = {
  lech: number;
  donViCoBan: string;
  compact?: boolean;
};

/** Badge lệch (thucTe - tonSo). Green nếu dương, red nếu âm, neutral nếu 0. */
export function DiffBadge({ lech, donViCoBan, compact }: Props) {
  const tone =
    lech > 0
      ? { bg: 'bg-green-100', text: 'text-green-800' }
      : lech < 0
        ? { bg: 'bg-red-50', text: 'text-red-700' }
        : { bg: 'bg-neutral-100', text: 'text-neutral-700' };
  const sign = lech > 0 ? '+' : lech < 0 ? '−' : '±';
  const value = Math.abs(lech);
  return (
    <View
      className={`self-start rounded-input px-2 ${tone.bg} ${compact ? 'py-0.5' : 'py-1'}`}
    >
      <Text
        className={`${tone.text} font-semibold ${compact ? 'text-small' : 'text-caption'}`}
      >
        {sign}
        {formatQty(value, donViCoBan)}
      </Text>
    </View>
  );
}
