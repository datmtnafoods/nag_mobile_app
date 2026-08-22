import { StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useIsAuthenticated, usePermissions } from '../../src/auth/store';
import { permsForInbox } from '../../src/features/inbox/perms';
import { listHoiThoai } from '../../src/api/erp/inbox';
import { MAU } from '../../src/theme/tokens';

export default function TabsLayout() {
  const isAuth = useIsAuthenticated();
  const permissions = usePermissions();
  const canViewInbox = permsForInbox(permissions ?? []).canView;

  // Badge tổng tin chưa đọc. Dùng CHUNG queryKey với màn inbox → đọc tin xong,
  // màn inbox invalidate là badge tự cập nhật. inbox.ts luôn mock nên poll rẻ;
  // xem lại refetchInterval khi có backend thật (Phase 3 WebSocket).
  // Hook đặt TRƯỚC early-return để không vi phạm rules of hooks.
  const inboxQuery = useQuery({
    queryKey: ['inbox', 'hoi-thoai'],
    queryFn: () => listHoiThoai(),
    enabled: isAuth && canViewInbox,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const tongChuaDoc = (inboxQuery.data ?? []).reduce((s, h) => s + h.chuaDoc, 0);
  const badge = tongChuaDoc > 0 ? (tongChuaDoc > 99 ? '99+' : tongChuaDoc) : undefined;

  if (!isAuth) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: MAU.primary,
        tabBarInactiveTintColor: MAU.inkMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: MAU.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: MAU.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kho"
        // Route giữ tên 'kho' (không đổi thành 'ban-hang') để không vỡ các fallback
        // '/kho' đã tồn tại: order/_layout, vat-tu/index redirect, index màn này.
        options={{
          title: 'Bán hàng',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vung-trong"
        options={{
          title: 'Vùng trồng',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Tin nhắn',
          tabBarBadge: badge,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* Ẩn khỏi tab bar — giữ route để deeplink/redirect vẫn chạy.
          den-thua + nong-ho vào từ hub Vùng trồng; nong-ho/[id] còn nhận push từ
          vat-tu/ban-hang/[id]; den-thua là fallback của stack app/thua. */}
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="den-thua" options={{ href: null }} />
      <Tabs.Screen name="nong-ho" options={{ href: null }} />
    </Tabs>
  );
}
