import { View, Text, Pressable, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ViTri } from '../types';

/** Mở app bản đồ mặc định của máy tại toạ độ. */
async function moBanDo(viTri: ViTri, nhan: string) {
  const { lat, lng } = viTri;
  const label = encodeURIComponent(nhan);
  const url =
    Platform.OS === 'ios'
      ? `maps://?q=${label}&ll=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  try {
    const ok = await Linking.canOpenURL(url);
    await Linking.openURL(ok ? url : web);
  } catch {
    Alert.alert('Không mở được bản đồ', `${lat}, ${lng}`);
  }
}

/**
 * Dòng "Vị trí lập phiếu" trong màn chi tiết. Chỉ render khi phiếu có toạ độ —
 * phiếu cũ hoặc lập lúc không có GPS thì ẩn hẳn, không hiện "—" gây nhiễu.
 */
export function ViTriRow({ viTri, nhan = 'Nơi lập phiếu' }: { viTri?: ViTri; nhan?: string }) {
  if (!viTri) return null;
  const doChinhXac = Number.isFinite(viTri.doChinhXac)
    ? ` · ±${Math.round(viTri.doChinhXac as number)} m`
    : '';
  // Sai số lớn thì cảnh báo — đừng để người duyệt tin nhầm vào số kém tin cậy.
  const kemTinCay = (viTri.doChinhXac ?? 0) > 100;

  return (
    <View className="flex-row items-center py-1.5">
      <Ionicons name="location-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
      <Text className="text-caption text-ink-muted w-28">Vị trí lập phiếu</Text>
      <View className="flex-1">
        <Pressable
          onPress={() => void moBanDo(viTri, nhan)}
          accessibilityRole="button"
          accessibilityLabel="Mở vị trí trên bản đồ"
          className="py-1"
        >
          <Text className="text-body text-primary font-mono">
            {viTri.lat.toFixed(5)}, {viTri.lng.toFixed(5)}
            <Text className="text-caption text-ink-muted">{doChinhXac}</Text>
          </Text>
        </Pressable>
        {kemTinCay ? (
          <Text className="text-small text-amber-800">
            Sai số lớn — chỉ nên tham khảo.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
