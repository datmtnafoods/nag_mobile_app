import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Cta = {
  label: string;
  onPress: () => void;
  /** 'primary' = nền đỏ (tạo mới); 'outline' = viền (reset filter). */
  variant?: 'primary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  cta?: Cta;
  /** CTA phụ hiển thị dưới CTA chính. */
  secondaryCta?: Cta;
};

/** Empty state chuẩn: icon + tiêu đề + mô tả + tối đa 2 CTA. */
export function EmptyState({
  icon = 'document-text-outline',
  title,
  message,
  cta,
  secondaryCta,
}: Props) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name={icon} size={56} color="#9ca3af" />
      <Text className="text-h2 text-ink mt-4 text-center">{title}</Text>
      {message ? (
        <Text className="text-body text-ink-muted mt-2 text-center">{message}</Text>
      ) : null}
      {cta ? <EmptyCta {...cta} /> : null}
      {secondaryCta ? <EmptyCta {...secondaryCta} /> : null}
    </View>
  );
}

function EmptyCta({ label, onPress, variant = 'primary', icon }: Cta) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`mt-4 min-h-[44px] rounded-input px-4 py-2.5 flex-row items-center active:opacity-80 ${
        isPrimary ? 'bg-primary' : 'border border-primary'
      }`}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={isPrimary ? '#fff' : '#dd1c2e'}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text className={`font-semibold ${isPrimary ? 'text-white' : 'text-primary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
