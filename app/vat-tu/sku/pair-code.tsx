import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMa, resolveByCode } from '../../../src/api/erp/catalog-supplies';
import { apiErrorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';

export default function PairCode() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const scanLockRef = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isFocused) {
      scanLockRef.current = false;
      setTorch(false);
    }
  }, [isFocused]);

  const pairMutation = useMutation({
    mutationFn: ({ skuId, ma }: { skuId: string; ma: string }) =>
      addMa(skuId, { ma, kieu: 'qr', nguon: 'tu_gan' }),
    onSuccess: (sku, vars) => {
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
      qc.setQueryData(['vat-tu', 'one', sku.id], sku);
      Alert.alert('Đã gắn mã', `Mã "${vars.ma}" đã gắn vào ${sku.ten}.`, [
        {
          text: 'Xem SKU',
          onPress: () => router.replace(`/vat-tu/sku/${sku.id}` as never),
        },
        {
          text: 'Quét mã khác',
          onPress: () => {
            setScanned(null);
            scanLockRef.current = false;
          },
        },
      ]);
    },
    onError: (err) => {
      Alert.alert('Lỗi', apiErrorMessage(err));
      setScanned(null);
      scanLockRef.current = false;
    },
  });

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (!isFocused) return;
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      const ma = data.trim();
      setScanned(ma);
      resolveByCode(ma)
        .then((sku) => {
          Alert.alert(
            'Mã đã có SKU',
            `Mã "${ma}" đã gắn cho: ${sku.ten} (${sku.id}).`,
            [
              {
                text: 'Xem SKU',
                onPress: () => router.replace(`/vat-tu/sku/${sku.id}` as never),
              },
              {
                text: 'Quét lại',
                onPress: () => {
                  setScanned(null);
                  scanLockRef.current = false;
                },
              },
              { text: 'Đóng', style: 'cancel', onPress: closeScanner },
            ],
            { cancelable: false },
          );
        })
        .catch((err: Error & { code?: string }) => {
          if (err.code !== 'ma_not_found') {
            Alert.alert('Lỗi', apiErrorMessage(err));
            setScanned(null);
            scanLockRef.current = false;
            return;
          }
          // Mã chưa gắn — điều hướng sang picker chọn SKU.
          router.replace(
            `/vat-tu/sku-picker?pairMa=${encodeURIComponent(ma)}` as never,
          );
        });
    },
    [isFocused],
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
    const onPress = canAsk ? () => void requestPermission() : () => void Linking.openSettings();
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="camera-outline" size={72} color="#dd1c2e" />
          <Text className="text-h2 text-ink mt-4">Cần quyền camera</Text>
          <Text className="text-body text-ink-muted mt-2 text-center">
            Ứng dụng cần quyền camera để quét và gắn mã QR cho SKU.
          </Text>
        </View>
        <View className="px-6 pb-4 gap-y-2">
          <Button label={label} onPress={onPress} />
          <Button label="Quay lại" variant="secondary" onPress={closeScanner} />
        </View>
      </SafeAreaView>
    );
  }

  const busy = pairMutation.isPending;

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
          onBarcodeScanned={busy ? undefined : handleScan}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="pt-4 px-4">
              <View className="bg-white/90 rounded-card p-3">
                <Text className="text-body text-ink font-semibold">Gắn mã QR cho SKU</Text>
                <Text className="text-small text-ink-muted mt-1">
                  Quét mã lạ → chọn SKU → gắn để lần sau nhận diện.
                </Text>
                {scanned ? (
                  <Text className="text-caption text-primary font-semibold mt-2">
                    Vừa quét: {scanned}
                  </Text>
                ) : null}
              </View>
            </View>
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
