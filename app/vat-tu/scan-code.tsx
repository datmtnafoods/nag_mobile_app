import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { resolveByCode } from '../../src/api/erp/catalog-supplies';
import { useReceiptDraftStore } from '../../src/stores/receipt-draft';
import { Button } from '../../src/components/Button';

export default function ScanCode() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const target = typeof returnTo === 'string' ? returnTo : '/vat-tu/new-receipt';

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);
  const addLine = useReceiptDraftStore((s) => s.addLine);

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
      resolveByCode(data.trim())
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
          // Prefer pop scan-code (giữ instance new-receipt gốc + kindParam).
          if (router.canGoBack()) router.back();
          else router.replace(target as never);
        })
        .catch((err: Error & { code?: string }) => {
          const isNotFound = err.code === 'ma_not_found';
          Alert.alert(
            isNotFound ? 'Mã chưa gán vật tư' : 'Không đọc được mã',
            isNotFound
              ? `Mã "${data.slice(0, 60)}" chưa gắn với vật tư nào trong hệ thống.`
              : err.message,
            [
              {
                text: 'Thử lại',
                onPress: () => {
                  setTimeout(() => {
                    scanLockRef.current = false;
                  }, 800);
                },
              },
              {
                text: 'Nhập tay',
                onPress: () => router.replace('/vat-tu/sku-picker' as never),
              },
              { text: 'Đóng', style: 'cancel', onPress: () => router.back() },
            ],
            { cancelable: false },
          );
        });
    },
    [isFocused, addLine, target],
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

  return (
    <View className="flex-1 bg-black">
      {isFocused ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
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
              <Text className="text-white mt-6 text-body">
                Đưa mã vật tư vào khung để quét
              </Text>
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
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}
