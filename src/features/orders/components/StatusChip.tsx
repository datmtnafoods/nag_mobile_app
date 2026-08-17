import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../types';
import { STATUS_META } from '../format';

export function StatusChip({ status, small }: { status: OrderStatus; small?: boolean }) {
  const meta = STATUS_META[status];
  const size = small ? 12 : 14;
  return (
    <View
      className={`self-start flex-row items-center rounded-input px-2 ${meta.bg} ${
        small ? 'py-0.5' : 'py-1'
      }`}
    >
      <Ionicons
        name={meta.icon as keyof typeof Ionicons.glyphMap}
        size={size}
        color={statusIconColor(status)}
        style={{ marginRight: 4 }}
      />
      <Text className={`${meta.text} ${small ? 'text-small' : 'text-caption'} font-semibold`}>
        {meta.label}
      </Text>
    </View>
  );
}

function statusIconColor(status: OrderStatus): string {
  switch (status) {
    case 'draft':
      return '#374151';
    case 'new':
      return '#92400e';
    case 'confirmed':
      return '#075985';
    case 'producing':
    case 'delivering':
      return '#a3131f';
    case 'completed':
      return '#166534';
    case 'cancelled':
      return '#b91c1c';
  }
}
