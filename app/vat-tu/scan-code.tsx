import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Linking, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { resolveByCode } from '../../src/api/erp/catalog-supplies';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { formatVND } from '../../src/features/vat-tu/format';
import { Button } from '../../src/components/Button';

const ZOOM_LEVELS = [0, 0.2, 0.4] as const;

type ScannedInfo = { ten: string; gia?: number };
type ScanError = { message: string; canPair: boolean; ma: string };

export default function ScanCode() {
  const { returnTo, mode } = useLocalSearchParams<{ returnTo?: string; mode?: string }>();
  const target = typeof returnTo === 'string' ? returnTo : '/vat-tu';
  // Chế độ quầy: quét nhiều món liên tục, không đóng camera sau mỗi lần.
  const lienTuc = mode === 'lien_tuc';

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);
  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLine = useReceiptDraftStore((s) => s.addLine);
  const lineCount = useReceiptDraftStore((s) => s.lines.length);

  const [lastScanned, setLastScanned] = useState<ScannedInfo | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);

  const clearTimers = useCallback(() => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    unlockTimerRef.current = null;
    toastTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isFocused) {
      scanLockRef.current = false;
      setTorch(false);
      clearTimers();
    }
  }, [isFocused, clearTimers]);

  // Cleanup timer khi unmount — tránh set state sau khi màn đã đóng.
  useEffect(() => () => clearTimers(), [clearTimers]);

  const unlockLater = useCallback((ms: number) => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      scanLockRef.current = false;
    }, ms);
  }, []);

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (!isFocused) return;
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      const ma = data.trim();
      resolveByCode(ma)
        .then((sku) => {
          addLine({
            vatTuId: sku.id,
            tenSku: sku.ten,
            donViCoBan: sku.donViCoBan,
            donViLon: sku.donViLon,
            heSoQuyDoi: sku.heSoQuyDoi,
            soLuong: 1,
            donVi: 'co_ban',
            donGia: sku.giaBan,
          });
          if (lienTuc) {
            // Quầy: giữ camera, phản hồi rung + toast rồi mở khoá cho món kế.
            Vibration.vibrate(60);
            setScanError(null);
            setLastScanned({ ten: sku.ten, gia: sku.giaBan });
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setLastScanned(null), 1800);
            unlockLater(1500);
            return;
          }
          // Chế độ đơn: pop về màn gọi (giữ instance new-receipt gốc).
          if (router.canGoBack()) router.back();
          else router.replace(target as never);
        })
        .catch((err: Error & { code?: string }) => {
          const isNotFound = err.code === 'ma_not_found';
          if (lienTuc) {
            // Không Alert chặn — hiện banner + tự mở khoá để quét tiếp.
            Vibration.vibrate(200);
            setLastScanned(null);
            setScanError({
              message: isNotFound
                ? 'Mã chưa gán vật tư nào'
                : err.message || 'Không đọc được mã',
              canPair: isNotFound,
              ma,
            });
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setScanError(null), 2600);
            unlockLater(1500);
            return;
          }
          const unlock = () => unlockLater(800);
          Alert.alert(
            isNotFound ? 'Mã chưa gán vật tư' : 'Không đọc được mã',
            isNotFound
              ? `Mã "${ma.slice(0, 60)}" chưa gắn với vật tư nào trong hệ thống.`
              : err.message,
            [
              { text: 'Thử lại', onPress: unlock },
              {
                text: 'Nhập tay',
                onPress: () => router.replace('/vat-tu/sku-picker' as never),
              },
              { text: 'Đóng', style: 'cancel', onPress: () => router.back() },
            ],
            // onDismiss: Android tap-ngoài không gọi onPress → mở khoá để không kẹt.
            { cancelable: false, onDismiss: unlock },
          );
        });
    },
    [isFocused, addLine, target, lienTuc, unlockLater],
  );

  const closeScanner = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/vat-tu' as never);
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
      ? 'Ứng dụng cần quyền camera để quét mã vật tư.'
      : 'Bạn đã từ chối quyền camera. Vào Cài đặt để bật lại.';
    const onPress = canAsk ? () => void requestPermission() : () => void Linking.openSettings();
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="camera-outline" size={72} color="#dd1c2e" />
          <Text className="text-h2 text-ink mt-4">Cần quyền camera</Text>
          <Text className="text-body text-ink-muted mt-2 text-center">{helper}</Text>
        </View>
        <View className="px-6 pb-4 gap-y-2">
          <Button label={label} onPress={onPress} />
          <Button label="Quay lại" variant="secondary" onPress={closeScanner} />
        </View>
      </SafeAreaView>
    );
  }

  const zoomLabel = ZOOM_LEVELS[zoomIdx] === 0 ? '1×' : ZOOM_LEVELS[zoomIdx] === 0.2 ? '~1.5×' : '~2×';

  return (
    <View className="flex-1 bg-black">
      {isFocused ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          autofocus="on"
          zoom={ZOOM_LEVELS[zoomIdx]}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'datamatrix'],
          }}
          onBarcodeScanned={handleScan}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1 items-center justify-center">
              <View
                className="border-4 rounded-frame"
                style={{ width: 260, height: 260, borderColor: '#dd1c2e' }}
              />
              <Text className="text-white mt-6 text-body text-center px-8">
                {lienTuc ? 'Đưa từng mã vật tư vào khung — quét liên tục' : 'Đưa mã vật tư vào khung để quét'}
              </Text>

              {/* Phản hồi trong chế độ quầy */}
              {lienTuc && lastScanned ? (
                <View className="mt-4 rounded-frame bg-green-600/90 px-4 py-3 flex-row items-center max-w-[90%]">
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text className="text-white ml-2 font-semibold flex-shrink" numberOfLines={1}>
                    + {lastScanned.ten}
                    {lastScanned.gia != null ? ` · ${formatVND(lastScanned.gia)}` : ''}
                  </Text>
                </View>
              ) : null}
              {lienTuc && scanError ? (
                <View className="mt-4 rounded-frame bg-red-600/90 px-4 py-3 max-w-[90%]">
                  <View className="flex-row items-center">
                    <Ionicons name="alert-circle" size={20} color="#fff" />
                    <Text className="text-white ml-2 font-semibold flex-shrink" numberOfLines={2}>
                      {scanError.message}
                    </Text>
                  </View>
                  {scanError.canPair ? (
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/vat-tu/sku-picker?pairMa=${encodeURIComponent(scanError.ma)}` as never,
                        )
                      }
                      className="mt-2 min-h-[44px] justify-center"
                      accessibilityRole="button"
                      accessibilityLabel="Gắn mã cho vật tư"
                    >
                      <Text className="text-white underline font-semibold">Gắn mã cho vật tư →</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View className="flex-row justify-center gap-3 pb-2 flex-wrap px-2">
              <Pressable
                onPress={() => setTorch((t) => !t)}
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={torch ? 'Tắt đèn pin' : 'Bật đèn pin'}
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
                <Text className="text-white ml-2">Zoom {zoomLabel}</Text>
              </Pressable>
              <Pressable
                onPress={closeScanner}
                className="rounded-frame bg-white/20 px-4 py-3 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={lienTuc ? `Xong, ${lineCount} món` : 'Đóng máy quét'}
              >
                <Ionicons name={lienTuc ? 'checkmark-done' : 'close'} size={18} color="#fff" />
                <Text className="text-white ml-2 font-semibold">
                  {lienTuc ? `Xong (${lineCount} món)` : 'Đóng'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}
