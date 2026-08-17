import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ScanTab() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="scan-outline" size={72} color="#dd1c2e" />
        <Text className="text-h2 text-ink mt-4">Quét tem QR</Text>
        <Text className="text-body text-ink-muted mt-2 text-center">
          Chức năng quét & kích hoạt tem sẽ hoàn thiện ở bước tiếp theo của Phase 1.
        </Text>
      </View>
    </SafeAreaView>
  );
}
