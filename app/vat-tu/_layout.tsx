import { Redirect, Stack, useSegments } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';
import { HeaderCloseButton } from '../../src/components/HeaderCloseButton';

export default function VatTuLayout() {
  const isAuth = useIsAuthenticated();
  const segments = useSegments();
  if (!isAuth) {
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
        headerLeft: () => <HeaderCloseButton fallbackHref="/" />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Vật tư' }} />
      <Stack.Screen name="receipts" options={{ title: 'Phiếu vật tư' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết phiếu' }} />
      <Stack.Screen name="catalog" options={{ title: 'Danh mục vật tư' }} />
      <Stack.Screen name="new-receipt" options={{ title: 'Tạo phiếu' }} />
      <Stack.Screen
        name="sku-picker"
        options={{ title: 'Chọn vật tư', presentation: 'modal' }}
      />
      <Stack.Screen
        name="partner-picker"
        options={{ title: 'Chọn đối tác', presentation: 'modal' }}
      />
      <Stack.Screen
        name="scan-code"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}
