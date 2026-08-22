import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, ICON, MAU, type Accent } from '../theme/tokens';

/**
 * Lối tắt kiểu quick-action (app ngân hàng): chip icon màu tròn-vuông + nhãn chữ
 * đen bên dưới, không viền không nền card. Xếp 4 cột 1 hàng (`flex-1`).
 * `enabled=false`: chip xám + chữ mờ (vẫn bấm để hiện Alert thiếu quyền nếu cần).
 */
export function QuickAction({
  label,
  icon,
  accent = 'do',
  onPress,
  enabled = true,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: Accent;
  onPress: () => void;
  enabled?: boolean;
}) {
  const a = ACCENT[accent];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 items-center active:opacity-70"
    >
      <View
        className={`w-14 h-14 rounded-2xl items-center justify-center ${
          enabled ? a.bg : 'bg-neutral-100'
        }`}
      >
        <Ionicons name={icon} size={ICON.lon} color={enabled ? a.icon : MAU.inkSoft} />
      </View>
      <Text
        className={`text-small font-medium text-center mt-1.5 ${
          enabled ? 'text-ink' : 'text-ink-muted'
        }`}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}
