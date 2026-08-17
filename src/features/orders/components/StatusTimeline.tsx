import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../types';
import { STATUS_ORDER, statusIndex } from '../fsm';
import { STATUS_META } from '../format';

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const currentIdx = statusIndex(status);

  if (status === 'cancelled') {
    return (
      <View className="rounded-card bg-red-50 border border-red-200 p-3 flex-row items-center">
        <Ionicons name="close-circle" size={20} color="#b91c1c" />
        <Text className="text-caption text-red-700 ml-2 font-semibold">Đơn đã huỷ</Text>
      </View>
    );
  }

  return (
    <View className="rounded-card bg-white border border-border p-4">
      <View className="flex-row items-start">
        {STATUS_ORDER.filter((s) => s !== 'draft').map((s, i, arr) => {
          const idx = STATUS_ORDER.indexOf(s);
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          const meta = STATUS_META[s];
          const isLast = i === arr.length - 1;
          return (
            <View key={s} className="flex-1 items-center">
              <View className="flex-row items-center w-full">
                <View className="flex-1 h-0.5 bg-transparent" />
                <View
                  className={`h-8 w-8 rounded-full items-center justify-center ${
                    done ? 'bg-primary' : 'bg-neutral-200'
                  }`}
                  style={active ? { borderWidth: 2, borderColor: '#dd1c2e' } : undefined}
                >
                  <Ionicons
                    name={done ? 'checkmark' : 'ellipse-outline'}
                    size={16}
                    color={done ? '#fff' : '#9ca3af'}
                  />
                </View>
                <View className={`flex-1 h-0.5 ${isLast ? 'bg-transparent' : done ? 'bg-primary' : 'bg-neutral-200'}`} />
              </View>
              <Text
                className={`text-small text-center mt-1 ${
                  active ? 'text-primary font-semibold' : done ? 'text-ink' : 'text-ink-soft'
                }`}
                numberOfLines={2}
              >
                {meta.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
