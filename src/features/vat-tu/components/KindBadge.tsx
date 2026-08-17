import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReceiptKind } from '../types';
import { RECEIPT_KIND_META } from '../format';

export function KindBadge({ kind, small }: { kind: ReceiptKind; small?: boolean }) {
  const meta = RECEIPT_KIND_META[kind];
  return (
    <View
      className={`self-start flex-row items-center rounded-input px-2 ${meta.bg} ${
        small ? 'py-0.5' : 'py-1'
      }`}
    >
      <Ionicons
        name={meta.icon as keyof typeof Ionicons.glyphMap}
        size={small ? 12 : 14}
        color={kind === 'nhap' ? '#166534' : '#92400e'}
        style={{ marginRight: 4 }}
      />
      <Text className={`${meta.text} ${small ? 'text-small' : 'text-caption'} font-semibold`}>
        {meta.label}
      </Text>
    </View>
  );
}
