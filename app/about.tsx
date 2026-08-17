import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../src/components/Button';

export default function About() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['bottom']}>
      <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-h2 text-ink mb-2">Giới thiệu</Text>
        <Text className="text-body text-ink-muted mb-4">
          Đây là khung khởi tạo (Phase 0) của ứng dụng mobile NaGreen. Mục tiêu Phase 0: xác nhận
          quy trình dev + Expo Go chạy thông trên iPhone/Android trước khi triển khai các chức năng
          nghiệp vụ.
        </Text>

        <Text className="text-h2 text-ink mb-2 mt-2">Roadmap tiếp theo</Text>
        <View className="gap-y-2">
          {[
            'Phase 1 — Login (JWT ERP) + Quét & kích hoạt tem QR',
            'Phase 2 — Đơn hàng đại lý, kho, vật tư',
            'Phase 3 — Chat / Inbox đa kênh (realtime)',
            'Phase 4 — Scan nhãn thuốc BVTV / triệu chứng cây',
          ].map((line) => (
            <View key={line} className="flex-row items-start">
              <Text className="text-primary mr-2">•</Text>
              <Text className="text-body text-ink flex-1">{line}</Text>
            </View>
          ))}
        </View>

        <Text className="text-h2 text-ink mb-2 mt-6">Design tokens</Text>
        <View className="rounded-card border border-border p-4 bg-bg-soft">
          <Text className="text-caption text-ink-muted mb-1">Primary</Text>
          <View className="flex-row items-center gap-x-2">
            <View className="h-6 w-6 rounded-full bg-primary" />
            <Text className="text-body text-ink">#dd1c2e</Text>
          </View>
          <Text className="text-caption text-ink-muted mt-3">Sizes</Text>
          <Text className="text-body text-ink">Input 44 · Button 48 · Header 48</Text>
          <Text className="text-caption text-ink-muted mt-3">Radius</Text>
          <Text className="text-body text-ink">Input 10 · Card 12 · Frame 28</Text>
        </View>
      </ScrollView>

      <View className="px-6 pb-4">
        <Button label="Quay lại" variant="secondary" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
