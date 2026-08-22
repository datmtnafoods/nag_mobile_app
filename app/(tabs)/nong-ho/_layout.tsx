import { Stack } from 'expo-router';
import { HeaderCloseButton } from '../../../src/components/HeaderCloseButton';

// Nhóm tab đã chặn đăng nhập ở `app/(tabs)/_layout.tsx` nên đây không cần guard.
export default function NongHoLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Quản lý nông hộ',
          // Nông hộ nay vào từ hub Vùng trồng (route ẩn khỏi tab bar) → cần nút
          // đóng về hub khi không có history (VD mở qua deeplink).
          headerLeft: () => <HeaderCloseButton fallbackHref="/vung-trong" />,
        }}
      />
      <Stack.Screen name="tao" options={{ title: 'Tạo nông hộ' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết nông hộ' }} />
      <Stack.Screen name="sua/[id]" options={{ title: 'Sửa nông hộ' }} />
    </Stack>
  );
}
