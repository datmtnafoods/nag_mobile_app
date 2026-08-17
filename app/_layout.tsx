import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/query';
import { useAuthStore } from '../src/auth/store';
import { wireApiAuth } from '../src/auth/wire';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    wireApiAuth();
    void useAuthStore.getState().hydrate();
    setReady(true);
  }, []);

  if (!ready || !hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#dd1c2e" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="activation"
            options={{
              headerShown: true,
              title: 'Kích hoạt tem',
              headerStyle: { backgroundColor: '#ffffff' },
              headerTintColor: '#111827',
              headerTitleStyle: { fontWeight: '600' },
              presentation: 'modal',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
