import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-24 w-24 items-center justify-center rounded-frame bg-primary mb-6">
          <Text className="text-white text-4xl font-bold">N</Text>
        </View>
        <Text className="text-h1 text-ink">NaGreen</Text>
        <Text className="text-body text-ink-muted mt-2 text-center">
          Ứng dụng nội bộ Nafoods — NaGreen
        </Text>
        <Text className="text-caption text-ink-soft mt-1">Phase 0 · Bootstrap</Text>
      </View>

      <View className="px-6 pb-4">
        <Button label="Xem giới thiệu" onPress={() => router.push('/about')} />
      </View>
    </SafeAreaView>
  );
}
