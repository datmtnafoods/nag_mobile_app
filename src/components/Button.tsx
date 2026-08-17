import { useCallback, useRef } from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import type { PressableProps, GestureResponderEvent } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

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
    text: 'text-white font-semibold text-base',
  },
  secondary: {
    container: 'bg-white border border-border active:bg-bg-soft',
    text: 'text-ink font-semibold text-base',
  },
  ghost: {
    container: 'bg-transparent active:bg-bg-soft',
    text: 'text-primary font-semibold text-base',
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
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#dd1c2e'} />
      ) : (
        <Text className={v.text}>{label}</Text>
      )}
    </Pressable>
  );
}
