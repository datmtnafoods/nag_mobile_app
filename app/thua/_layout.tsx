import { Redirect, Stack, useSegments } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';
import { HeaderCloseButton } from '../../src/components/HeaderCloseButton';
import { SwipeToHome } from '../../src/components/SwipeToHome';

export default function ThuaLayout() {
  const isAuth = useIsAuthenticated();
  const segments = useSegments();
  if (!isAuth) {
    const path = '/' + segments.join('/');
    return <Redirect href={`/(auth)/login?next=${encodeURIComponent(path)}` as never} />;
  }

  return (
    <SwipeToHome>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#ffffff' },
        // Dùng SwipeToHome thay iOS swipe-back mặc định (các full-screen modal
        // ve-ranh/quanh-ban/quet-cccd tự override lại `gestureEnabled: false`).
        gestureEnabled: false,
        headerLeft: () => <HeaderCloseButton fallbackHref="/den-thua" />,
      }}
    >
      {/* Chọn / tạo nông hộ nằm ngay ở bước 1 của wizard tạo thửa — không tách
          màn picker riêng, đỡ một lần điều hướng khi đang đứng ngoài thửa. */}
      <Stack.Screen name="tao-thua" options={{ title: 'Tạo thửa đất' }} />
      {/* Màn vẽ ranh chiếm trọn màn — không header, không vuốt-đóng nhầm khi kéo đỉnh. */}
      <Stack.Screen
        name="ve-ranh"
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      {/* "Thửa quanh bạn" từ Vùng trồng — bản đồ full-screen zoom về GPS, không
          header/toggle, chỉ nút back nổi. */}
      <Stack.Screen
        name="quanh-ban"
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      {/* Quét QR mặt sau CCCD — full-screen, không vuốt-đóng nhầm khi đang ngắm mã. */}
      <Stack.Screen
        name="quet-cccd"
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết thửa' }} />
      <Stack.Screen name="sua/[id]" options={{ title: 'Sửa thông tin thửa' }} />
      <Stack.Screen name="nhat-ky" options={{ title: 'Nhật ký canh tác' }} />
      <Stack.Screen name="lich-cay/[cayId]" options={{ title: 'Lịch canh tác cây' }} />
    </Stack>
    </SwipeToHome>
  );
}
