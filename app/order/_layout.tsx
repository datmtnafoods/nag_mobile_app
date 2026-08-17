import { Redirect, Stack, useSegments } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';

export default function OrderLayout() {
  const isAuth = useIsAuthenticated();
  const segments = useSegments();

  if (!isAuth) {
    // Segments looks like ['order', '[id]'] or ['order', 'new'] — preserve as next
    const path = '/' + segments.join('/');
    return <Redirect href={`/(auth)/login?next=${encodeURIComponent(path)}` as never} />;
  }

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
