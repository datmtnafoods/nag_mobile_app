import { useCallback, useRef } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import type { PressableProps, GestureResponderEvent } from 'react-native';
import { MAU } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

const base = 'h-button items-center justify-center rounded-card px-4 flex-row';

const variants: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary active:bg-primary-700',
    text: 'text-white font-semibold text-body',
  },
  secondary: {
    container: 'bg-white border border-border active:bg-bg-soft',
    text: 'text-ink font-semibold text-body',
  },
  ghost: {
    container: 'bg-transparent active:bg-bg-soft',
    text: 'text-primary font-semibold text-body',
  },
  // "Chốt" (finalize/xác nhận). Xanh đậm khác đỏ primary — dùng ở nút Xong đè
  // lên nền đỏ của bản đồ vẽ ranh: contrast rõ hẳn (ve-ranh.tsx).
  success: {
    container: 'bg-green-700 active:bg-green-800',
    text: 'text-white font-semibold text-body',
  },
  // Hành động huỷ/đăng xuất — đỏ nhạt (không đặc) để không hét lên như primary.
  danger: {
    container: 'bg-primary-50 border border-primary-200 active:bg-primary-100',
    text: 'text-primary-700 font-semibold text-body',
  },
};

const DOUBLE_TAP_MS = 500;

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  onPress,
  ...rest
}: Props) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  const lastPressRef = useRef(0);

  const guardedPress = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      if (now - lastPressRef.current < DOUBLE_TAP_MS) return;
      lastPressRef.current = now;
      onPress?.(e);
    },
    [onPress],
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={isDisabled ? undefined : guardedPress}
      className={`${base} ${v.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-60' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'success' ? MAU.white : MAU.primary}
        />
      ) : (
        <Text className={v.text}>{label}</Text>
      )}
    </Pressable>
  );
}
