import { Stack } from 'expo-router';

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
      <Stack.Screen name="index" options={{ title: 'Quản lý nông hộ' }} />
      <Stack.Screen name="tao" options={{ title: 'Tạo nông hộ' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết nông hộ' }} />
    </Stack>
  );
}
