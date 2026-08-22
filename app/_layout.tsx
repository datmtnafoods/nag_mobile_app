import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/query';
import { useAuthStore } from '../src/auth/store';
import { wireApiAuth } from '../src/auth/wire';
import { wireOfflineSync } from '../src/api/erp/party-sync';
import { wireKhoSync } from '../src/api/erp/kho-sync';
import { UndoSnackbarProvider } from '../src/components/UndoSnackbar';
import { NearbyPlotToastProvider } from '../src/components/NearbyPlotToast';
import { OfflineTopBanner } from '../src/components/OfflineBanner';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    wireApiAuth();
    wireOfflineSync();
    wireKhoSync();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <UndoSnackbarProvider>
           <NearbyPlotToastProvider>
            <StatusBar style="dark" />
            {/* Dải offline chiếm chỗ, đẩy cả Stack (gồm header native) xuống. */}
            <OfflineTopBanner>
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
                <Stack.Screen name="order" />
                <Stack.Screen name="vat-tu" />
                <Stack.Screen name="thua" />
              </Stack>
            </OfflineTopBanner>
           </NearbyPlotToastProvider>
          </UndoSnackbarProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
