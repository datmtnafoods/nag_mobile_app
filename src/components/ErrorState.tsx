import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

type Props = {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Error state chuẩn: icon + message + nút thử lại. */
export function ErrorState({
  message,
  icon = 'cloud-offline-outline',
  title,
  onRetry,
  retryLabel = 'Thử lại',
}: Props) {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Ionicons name={icon} size={48} color="#dd1c2e" />
      {title ? <Text className="text-h2 text-ink mt-3 text-center">{title}</Text> : null}
      <Text className="text-body text-ink mt-3 text-center">{message}</Text>
      {onRetry ? (
        <View className="mt-5 w-full max-w-[240px]">
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
