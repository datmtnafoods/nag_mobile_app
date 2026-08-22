import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, ICON, MAU, type Accent } from '../theme/tokens';

/**
 * Row danh sách chuẩn: ô icon chip màu accent + tiêu đề + phụ đề + chevron/badge.
 * Bề mặt trung tính (trắng), màu CHỈ nằm trong chip — khuôn chính cho hub sau khi
 * bỏ lưới card nhuộm màu.
 *
 * - `grouped`: bỏ vỏ card riêng (dùng bên trong `RowGroup` có divider chung).
 * - `size`: 'lon' cho hub (chip 48, icon 26); 'vua' cho list thường (chip 40, icon 20).
 * - `enabled=false`: làm mờ + phụ đề "Cần quyền …" (vẫn bấm được để hiện Alert thiếu quyền).
 * - `badge` hiện số; nếu không có badge thì hiện chevron.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  accent = 'do',
  badge,
  onPress,
  accessibilityLabel,
  enabled = true,
  permLabel,
  size = 'vua',
  grouped = false,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: Accent;
  badge?: number;
  onPress: () => void;
  accessibilityLabel?: string;
  enabled?: boolean;
  permLabel?: string;
  size?: 'vua' | 'lon';
  grouped?: boolean;
}) {
  const a = ACCENT[accent];
  const chip = size === 'lon' ? 'w-12 h-12' : 'w-10 h-10';
  const iconSize = size === 'lon' ? ICON.lon : ICON.vua;
  const sub = enabled ? subtitle : permLabel ? `Cần quyền ${permLabel}` : subtitle;
  const shell = grouped
    ? 'flex-row items-center p-3 min-h-[56px] active:bg-bg-soft'
    : 'rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      className={`${shell} ${enabled ? '' : 'opacity-50'}`}
    >
      <View
        className={`${chip} rounded-input items-center justify-center mr-3 ${
          enabled ? a.bg : 'bg-neutral-100'
        }`}
      >
        <Ionicons name={icon} size={iconSize} color={enabled ? a.icon : MAU.inkSoft} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-body font-semibold ${enabled ? 'text-ink' : 'text-ink-muted'}`}
          numberOfLines={1}
        >
          {title}
        </Text>
        {sub ? (
          <Text className="text-caption text-ink-muted mt-0.5" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {badge != null && badge > 0 ? (
        <View className="ml-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary items-center justify-center">
          <Text className="text-small text-white font-bold">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={ICON.chevron} color={MAU.inkSoft} />
      )}
    </Pressable>
  );
}
