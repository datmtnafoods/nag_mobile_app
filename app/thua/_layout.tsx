import { Redirect, Stack, useSegments } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';
import { HeaderCloseButton } from '../../src/components/HeaderCloseButton';

export default function ThuaLayout() {
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
        headerLeft: () => <HeaderCloseButton fallbackHref="/den-thua" />,
      }}
    >
      {/* Chọn / tạo nông hộ nằm ngay ở bước 1 của wizard tạo thửa — không tách
          màn picker riêng, đỡ một lần điều hướng khi đang đứng ngoài thửa. */}
      <Stack.Screen name="tao-thua" options={{ title: 'Tạo thửa đất' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết thửa' }} />
      <Stack.Screen name="nhat-ky" options={{ title: 'Nhật ký canh tác' }} />
    </Stack>
  );
}
