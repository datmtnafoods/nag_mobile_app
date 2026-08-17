import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCurrentUser } from '../../src/auth/store';

type Shortcut = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: string;
};

const SHORTCUTS: Shortcut[] = [
  { key: 'scan', title: 'Quét tem QR', icon: 'scan-outline', color: '#dd1c2e', href: '/scan' },
  { key: 'orders', title: 'Đơn hàng', icon: 'receipt-outline', color: '#0ea5e9', href: '/(tabs)/' },
  { key: 'inbox', title: 'Chat / Inbox', icon: 'chatbubble-ellipses-outline', color: '#8b5cf6', href: '/(tabs)/' },
  { key: 'vision', title: 'Nhận diện ảnh', icon: 'camera-outline', color: '#16a34a', href: '/(tabs)/' },
];

export default function Home() {
  const user = useCurrentUser();
  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="mb-4">
          <Text className="text-caption text-ink-muted">Xin chào,</Text>
          <Text className="text-h2 text-ink">{user?.fullName ?? user?.username ?? 'NaGreen'}</Text>
          {user?.roles?.length ? (
            <Text className="text-caption text-ink-muted mt-1">
              Vai trò: {user.roles.join(', ')}
            </Text>
          ) : null}
        </View>

        <View className="rounded-card bg-primary p-4 mb-4">
          <Text className="text-white text-caption">Bảng điều khiển</Text>
          <Text className="text-white text-h1 mt-1">NaGreen</Text>
          <Text className="text-white/80 text-body mt-1">
            Kích hoạt tem giống · Đơn hàng · Chat · Nhận diện ảnh
          </Text>
        </View>

        <Text className="text-h2 text-ink mb-3">Chức năng</Text>
        <View className="flex-row flex-wrap -mx-1">
          {SHORTCUTS.map((s) => (
            <View key={s.key} className="w-1/2 px-1 mb-2">
              <Pressable
                onPress={() => router.push(s.href as never)}
                className="rounded-card bg-white border border-border p-4 items-start active:bg-bg-soft"
              >
                <View
                  className="h-10 w-10 rounded-input items-center justify-center mb-2"
                  style={{ backgroundColor: s.color + '1A' }}
                >
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                <Text className="text-body text-ink font-semibold">{s.title}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
