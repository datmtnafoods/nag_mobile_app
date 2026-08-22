import { View, Text, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderCloseButton } from '../src/components/HeaderCloseButton';
import { SectionLabel } from '../src/components/SectionLabel';
import { RowGroup } from '../src/components/RowGroup';
import { ListRow } from '../src/components/ListRow';
import { BONG, ICON, MAU } from '../src/theme/tokens';

const HEADER = {
  headerShown: true,
  headerStyle: { backgroundColor: MAU.white },
  headerTintColor: MAU.ink,
  headerTitleStyle: { fontWeight: '600' as const },
};

// TODO: thay bằng email + hotline hỗ trợ THẬT của Nafoods trước khi phát hành.
const EMAIL_HO_TRO = 'support@nafoods.com';
const HOTLINE = '1900xxxx';

const MEO = [
  'GPS phải chính xác dưới 50 m mới dò được thửa — ra chỗ thoáng rồi bấm "Đo lại".',
  'Đang nhập dở? App tự lưu nháp — thoát ra vào lại vẫn còn nội dung.',
  'Quét mã QR trên tem / CCCD thay vì gõ tay để nhanh và đỡ sai.',
  'Ảnh hiện trường được nén sẵn nên gửi được cả khi sóng yếu.',
];

async function moLink(url: string, moTaLoi: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert('Không mở được', moTaLoi);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Không mở được', moTaLoi);
  }
}

export default function TroGiup() {
  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          ...HEADER,
          title: 'Trợ giúp & liên hệ',
          headerLeft: () => <HeaderCloseButton fallbackHref="/profile" />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <SectionLabel>Liên hệ hỗ trợ</SectionLabel>
        <RowGroup>
          <ListRow
            grouped
            icon="mail-outline"
            accent="xanh-duong"
            title="Gửi email hỗ trợ"
            subtitle={EMAIL_HO_TRO}
            onPress={() =>
              moLink(`mailto:${EMAIL_HO_TRO}`, `Hãy gửi email tới ${EMAIL_HO_TRO}.`)
            }
          />
          <ListRow
            grouped
            icon="call-outline"
            accent="xanh-la"
            title="Gọi hotline"
            subtitle={HOTLINE}
            onPress={() => moLink(`tel:${HOTLINE}`, `Hãy gọi tới ${HOTLINE}.`)}
          />
        </RowGroup>

        <View className="mt-6">
          <SectionLabel>Hướng dẫn nhanh</SectionLabel>
          <View className="rounded-card-lg bg-white border border-border px-4" style={BONG.card}>
            {MEO.map((m, i) => (
              <View
                key={i}
                className={`flex-row items-start py-3 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <Ionicons
                  name="bulb-outline"
                  size={ICON.vua}
                  color={MAU.inkMuted}
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text className="text-body text-ink flex-1 leading-6">{m}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="text-small text-ink-soft mt-4 px-1">
          Thông tin liên hệ trên là tạm — sẽ cập nhật email/hotline chính thức của Nafoods.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
