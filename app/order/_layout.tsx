import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết đơn' }} />
      <Stack.Screen name="new" options={{ title: 'Tạo đơn mới' }} />
      <Stack.Screen
        name="customer-picker"
        options={{ title: 'Chọn khách hàng', presentation: 'modal' }}
      />
      <Stack.Screen
        name="nursery-picker"
        options={{ title: 'Chọn giống', presentation: 'modal' }}
      />
    </Stack>
  );
}
