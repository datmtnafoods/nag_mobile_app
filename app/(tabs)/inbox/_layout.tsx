import { Stack } from 'expo-router';
import { MAU } from '../../../src/theme/tokens';

// Nhóm tab đã chặn đăng nhập ở `app/(tabs)/_layout.tsx` nên đây không cần guard.
export default function InboxLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: MAU.white },
        headerTintColor: MAU.ink,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: MAU.white },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tin nhắn' }} />
      <Stack.Screen name="[id]" options={{ title: 'Trò chuyện' }} />
    </Stack>
  );
}
