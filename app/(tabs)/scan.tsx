import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Button } from '../../src/components/Button';
import { parseActivationUrl } from '../../src/utils/deeplink';

export default function ScanTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);

  // Reset scanner state when tab loses focus so we start fresh on return.
  useEffect(() => {
    if (!isFocused) {
      scanLockRef.current = false;
      setTorch(false);
    }
  }, [isFocused]);

  const handleScan = useCallback(({ data }: { data: string }) => {
    if (!isFocused) return;
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const parsed = parseActivationUrl(data);
    if (!parsed) {
      Alert.alert(
        'Mã QR không hợp lệ',
        `Không nhận diện được thông tin kích hoạt.\n\nNội dung quét được:\n${data.slice(0, 200)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // brief delay so user has time to move camera off the invalid code
              setTimeout(() => {
                scanLockRef.current = false;
              }, 800);
            },
          },
        ],
        {
          onDismiss: () => {
            setTimeout(() => {
              scanLockRef.current = false;
            }, 800);
          },
          cancelable: false,
        },
      );
      return;
    }

    router.push({
      pathname: '/activation',
      params: parsed as unknown as Record<string, string>,
    });
    setTimeout(() => {
      scanLockRef.current = false;
    }, 1500);
  }, [isFocused]);

  const closeScanner = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as never);
    }
  }, []);

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-body text-ink-muted">Đang kiểm tra quyền camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    const label = canAsk ? 'Cấp quyền camera' : 'Mở Cài đặt';
    const helper = canAsk
      ? 'Ứng dụng cần quyền truy cập camera để quét tem QR.'
      : 'Bạn đã từ chối quyền camera. Vào Cài đặt để bật lại quyền cho ứng dụng.';
    const onPress = canAsk ? () => void requestPermission() : () => void Linking.openSettings();
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="camera-outline" size={72} color="#dd1c2e" />
          <Text className="text-h2 text-ink mt-4">Cần quyền camera</Text>
          <Text className="text-body text-ink-muted mt-2 text-center">{helper}</Text>
        </View>
        <View className="px-6 pb-4">
          <Button label={label} onPress={onPress} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {isFocused ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1 items-center justify-center">
              <View
                className="border-4 rounded-frame"
                style={{ width: 260, height: 260, borderColor: '#dd1c2e' }}
              />
              <Text className="text-white mt-6 text-body">Đưa tem QR vào khung để quét</Text>
            </View>

            <View className="flex-row justify-center gap-4 pb-4">
              <Pressable
                onPress={() => setTorch((t) => !t)}
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
              >
                <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color="#fff" />
                <Text className="text-white ml-2">{torch ? 'Tắt đèn' : 'Bật đèn'}</Text>
              </Pressable>
              <Pressable
                onPress={closeScanner}
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
              >
                <Ionicons name="close" size={18} color="#fff" />
                <Text className="text-white ml-2">Đóng</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <View className="flex-1" />
      )}
    </View>
  );
}
