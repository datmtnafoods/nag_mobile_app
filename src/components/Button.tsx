import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { PressableProps } from 'react-native';

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

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  ...rest
}: Props) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
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
