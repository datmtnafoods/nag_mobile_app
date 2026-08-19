import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Số đếm hiển thị sau label — "Chỉ tồn âm (3)". */
  count?: number;
};

/** Chip filter chuẩn — 44pt cao (đạt iOS HIG tap target). */
export function FilterChip({ label, active, onPress, icon, count }: Props) {
  const text = count !== undefined ? `${label} (${count})` : label;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={text}
      hitSlop={{ top: 4, bottom: 4 }}
      className={`min-h-[44px] px-3.5 rounded-input flex-row items-center border active:opacity-80 ${
        active ? 'bg-primary border-primary' : 'bg-white border-border'
      }`}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={active ? '#fff' : '#6b7280'}
          style={{ marginRight: 5 }}
        />
      ) : null}
      <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
        {text}
      </Text>
    </Pressable>
  );
}
