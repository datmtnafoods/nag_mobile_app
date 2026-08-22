import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Button } from '../../src/components/Button';
import { parseCccdQr } from '../../src/utils/cccd';
import { useCccdDraftStore } from '../../src/stores/cccd-draft';

/**
 * Quét mã QR mặt sau thẻ CCCD → parse → bàn giao về form nông hộ qua
 * `cccd-draft` rồi `router.back()`. Cùng khung với `app/(tabs)/scan.tsx`.
 */
// 3 mức zoom cho người dùng chọn — QR trên CCCD nhỏ ~1.5cm; camera back mặc định wide
// nên mã trong khung chiếm quá ít pixel để detector khoá. 0.2 là mặc định (tương đương
// ~1.5–2× tuỳ máy), cao hơn khi mã còn nhỏ, 0 nếu autofocus không bám ở zoom cao.
const ZOOM_LEVELS = [0, 0.2, 0.4] as const;

export default function QuetCccd() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(1); // mặc định 0.2
  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);

  // Về khung sạch mỗi khi màn mất focus.
  useEffect(() => {
    if (!isFocused) {
      scanLockRef.current = false;
      setTorch(false);
    }
  }, [isFocused]);

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (!isFocused) return;
      if (scanLockRef.current) return;
      scanLockRef.current = true;

      const parsed = parseCccdQr(data);
      if (!parsed) {
        // Dev-only: prefix chuỗi để chẩn đoán format lạ (thẻ đời mới, biến thể…).
        // KHÔNG log full — chuỗi chứa số CCCD/tên/địa chỉ PII. Chỉ 30 ký tự đầu.
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[cccd-qr] parse fail, prefix:', data.slice(0, 30) + '…');
        }
        // KHÔNG in `data` ra alert — chuỗi QR chứa dữ liệu cá nhân (số CCCD…).
        Alert.alert(
          'Mã QR không hợp lệ',
          'Đưa mã QR ở MẶT SAU thẻ CCCD vào khung.',
          [
            { text: 'Đóng', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Thử lại',
              onPress: () => {
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

      useCccdDraftStore.getState().datCccd(parsed);
      router.back();
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1500);
    },
    [isFocused],
  );

  const closeScanner = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
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
      ? 'Ứng dụng cần quyền camera để quét mã QR trên thẻ CCCD.'
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
          autofocus="on"
          zoom={ZOOM_LEVELS[zoomIdx]}
          // Mở rộng ngoài 'qr' phòng thẻ CCCD lô mới có biến thể. Parser vẫn strict
          // kiểm nội dung nên không tăng false-positive.
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'datamatrix', 'aztec'] }}
          onBarcodeScanned={handleScan}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1 items-center justify-center">
              <View
                className="border-4 rounded-frame"
                style={{ width: 260, height: 260, borderColor: '#dd1c2e' }}
              />
              <Text className="text-white mt-6 text-body text-center px-8">
                Đưa mã QR ở mặt sau thẻ CCCD vào khung để quét
              </Text>
              <Text className="text-white/70 mt-2 text-small text-center px-8">
                Giữ máy cách thẻ 8–15 cm, giữ yên 1–2 giây. Nếu chưa được, bấm Zoom + hoặc bật đèn.
              </Text>
            </View>

            <View className="flex-row justify-center gap-3 pb-4 flex-wrap px-2">
              <Pressable
                onPress={() => setTorch((t) => !t)}
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
              >
                <Ionicons name={torch ? 'flash' : 'flash-off'} size={18} color="#fff" />
                <Text className="text-white ml-2">{torch ? 'Tắt đèn' : 'Bật đèn'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setZoomIdx((i) => (i + 1) % ZOOM_LEVELS.length)}
                accessibilityRole="button"
                accessibilityLabel="Chuyển mức zoom camera"
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text className="text-white ml-2">
                  Zoom {ZOOM_LEVELS[zoomIdx] === 0 ? '1×' : ZOOM_LEVELS[zoomIdx] === 0.2 ? '~1.5×' : '~2×'}
                </Text>
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
