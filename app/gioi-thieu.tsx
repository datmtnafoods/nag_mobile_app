import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { HeaderCloseButton } from '../src/components/HeaderCloseButton';
import { SectionLabel } from '../src/components/SectionLabel';
import { ACCENT, BONG, ICON, MAU, type Accent } from '../src/theme/tokens';

const HEADER = {
  headerShown: true,
  headerStyle: { backgroundColor: MAU.white },
  headerTintColor: MAU.ink,
  headerTitleStyle: { fontWeight: '600' as const },
};

type Feature = { icon: keyof typeof Ionicons.glyphMap; accent: Accent; title: string; desc: string };

const FEATURES: Feature[] = [
  { icon: 'map-outline', accent: 'xanh-la', title: 'Vùng trồng', desc: 'Dò thửa GPS, vẽ ranh, bản đồ vệ tinh' },
  { icon: 'people-outline', accent: 'tim', title: 'Nông hộ', desc: 'Hồ sơ hộ, quét CCCD, gán thửa' },
  { icon: 'cube-outline', accent: 'xanh-duong', title: 'Vật tư & kho', desc: 'Nhập / bán / chuyển / kiểm kho' },
  { icon: 'leaf-outline', accent: 'ho-phach', title: 'Đơn hàng giống', desc: 'Đặt giống từ vườn ươm' },
  { icon: 'book-outline', accent: 'cham', title: 'Nhật ký canh tác', desc: 'Bón phân, phun thuốc, thu hoạch (VietGAP)' },
  { icon: 'chatbubbles-outline', accent: 'do', title: 'Tin nhắn', desc: 'Trao đổi với nông hộ / HTX' },
];

export default function GioiThieu() {
  const version = Constants.expoConfig?.version ?? '—';
  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          ...HEADER,
          title: 'Giới thiệu',
          headerLeft: () => <HeaderCloseButton fallbackHref="/profile" />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center py-4">
          <View className="h-20 w-20 rounded-frame bg-primary items-center justify-center mb-3">
            <Text className="text-h1 text-white font-bold">NG</Text>
          </View>
          <Text className="text-h2 text-ink">NaGreen</Text>
          <Text className="text-caption text-ink-muted mt-1">Phiên bản {version}</Text>
        </View>

        <View className="rounded-card-lg bg-white border border-border p-4" style={BONG.card}>
          <Text className="text-body text-ink leading-6">
            Ứng dụng thực địa cho kỹ thuật viên Nafoods: quản lý vùng trồng và nông hộ, ghi nhật ký
            canh tác theo chuẩn VietGAP, nhập/bán/kiểm vật tư tại quầy trạm, đặt đơn giống và trao đổi
            với nông hộ — làm việc được cả khi sóng yếu ngoài vườn.
          </Text>
        </View>

        <View className="mt-6">
          <SectionLabel>Tính năng chính</SectionLabel>
          <View className="rounded-card-lg bg-white border border-border px-4" style={BONG.card}>
            {FEATURES.map((f, i) => {
              const a = ACCENT[f.accent];
              return (
                <View
                  key={f.title}
                  className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className={`w-10 h-10 rounded-input items-center justify-center mr-3 ${a.bg}`}>
                    <Ionicons name={f.icon} size={ICON.vua} color={a.icon} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink font-semibold">{f.title}</Text>
                    <Text className="text-caption text-ink-muted mt-0.5">{f.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Text className="text-small text-ink-soft text-center mt-8">© 2026 Nafoods Group</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
