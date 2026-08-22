import { Redirect, Stack, useSegments } from 'expo-router';
import { useIsAuthenticated } from '../../src/auth/store';
import { HeaderCloseButton } from '../../src/components/HeaderCloseButton';
import { SwipeToHome } from '../../src/components/SwipeToHome';

export default function VatTuLayout() {
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
        // Dùng SwipeToHome (vuốt phải từ mép trái → /) thay iOS swipe-back mặc định.
        // Nút back vẫn có ở header (HeaderCloseButton) cho lối quay lại 1 bước.
        gestureEnabled: false,
        headerLeft: () => <HeaderCloseButton fallbackHref="/" />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Vật tư' }} />

      {/* Danh mục SKU */}
      <Stack.Screen name="danh-muc" options={{ title: 'Danh mục vật tư' }} />
      <Stack.Screen name="sku/[id]" options={{ title: 'Chi tiết SKU' }} />
      <Stack.Screen name="sku/new" options={{ title: 'Tạo vật tư mới' }} />
      <Stack.Screen
        name="sku/pair-code"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />

      {/* Nhập kho */}
      <Stack.Screen name="nhap-kho/index" options={{ title: 'Nhập kho' }} />
      <Stack.Screen name="nhap-kho/new" options={{ title: 'Tạo phiếu nhập' }} />
      <Stack.Screen name="nhap-kho/[id]" options={{ title: 'Chi tiết phiếu nhập' }} />
      <Stack.Screen
        name="nhap-kho/xac-nhan/[id]"
        options={{ title: 'Xác nhận nhận hàng' }}
      />

      {/* Bán hàng */}
      <Stack.Screen name="ban-hang/index" options={{ title: 'Bán hàng' }} />
      <Stack.Screen name="ban-hang/new" options={{ title: 'Tạo phiếu bán' }} />
      <Stack.Screen name="ban-hang/[id]" options={{ title: 'Chi tiết phiếu bán' }} />
      <Stack.Screen
        name="ban-hang/hoa-don/[id]"
        options={{
          title: 'Hoá đơn',
          presentation: 'modal',
          headerLeft: () => <HeaderCloseButton variant="close" fallbackHref="/vat-tu/ban-hang" />,
        }}
      />

      {/* Đổi trả hàng (khach_tra) */}
      <Stack.Screen name="doi-tra/new" options={{ title: 'Đổi trả hàng' }} />
      <Stack.Screen name="doi-tra/[id]" options={{ title: 'Chi tiết phiếu trả' }} />

      {/* Tồn kho */}
      <Stack.Screen name="ton-kho/index" options={{ title: 'Tồn kho' }} />
      <Stack.Screen
        name="ton-kho/so-chi-tiet"
        options={{
          title: 'Sổ chi tiết',
          presentation: 'modal',
          headerLeft: () => <HeaderCloseButton variant="close" fallbackHref="/vat-tu/ton-kho" />,
        }}
      />

      {/* Kiểm kho */}
      <Stack.Screen name="kiem-kho/index" options={{ title: 'Kiểm kho' }} />
      <Stack.Screen name="kiem-kho/new" options={{ title: 'Tạo phiếu kiểm' }} />
      <Stack.Screen name="kiem-kho/[id]" options={{ title: 'Chi tiết phiếu kiểm' }} />

      {/* Chuyển kho / Kho tạm xe — W7 K2 */}
      <Stack.Screen name="chuyen-kho/index" options={{ title: 'Chuyển kho' }} />
      <Stack.Screen name="chuyen-kho/new" options={{ title: 'Lập lệnh chuyển' }} />
      <Stack.Screen name="chuyen-kho/[id]" options={{ title: 'Chi tiết phiếu chuyển' }} />
      <Stack.Screen
        name="chuyen-kho/xac-nhan-nhan/[id]"
        options={{ title: 'Xác nhận nhận' }}
      />

      {/* Modals + camera */}
      <Stack.Screen
        name="sku-picker"
        options={{
          title: 'Chọn vật tư',
          presentation: 'modal',
          headerLeft: () => <HeaderCloseButton variant="close" fallbackHref="/vat-tu" />,
        }}
      />
      <Stack.Screen
        name="ncc-picker"
        options={{
          title: 'Chọn NCC',
          presentation: 'modal',
          headerLeft: () => <HeaderCloseButton variant="close" fallbackHref="/vat-tu" />,
        }}
      />
      <Stack.Screen
        name="partner-picker"
        options={{
          title: 'Chọn khách hàng',
          presentation: 'modal',
          headerLeft: () => <HeaderCloseButton variant="close" fallbackHref="/vat-tu" />,
        }}
      />
      <Stack.Screen
        name="scan-code"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />

    </Stack>
    </SwipeToHome>
  );
}
