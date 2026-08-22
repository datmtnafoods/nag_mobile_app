import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/Input';
import { useDeviceLocation } from '../../../hooks/useDeviceLocation';
import { ghepDiaChi, reverseGeocode } from '../../../api/erp/geocode';
import { apiErrorMessage, laLoiMang } from '../../../api/client';

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
};

/**
 * Ô địa chỉ + nút định vị. Bấm nút → lấy GPS → reverse-geocode → điền xã/tỉnh.
 * Số nhà/đường KHÔNG tự điền được (BE dùng polygon địa giới, `detail` luôn rỗng)
 * nên ô vẫn để user gõ tiếp — đây là hành vi đúng, không phải thiếu sót.
 */
export function DiaChiField({
  label = 'Địa chỉ',
  placeholder = 'Số nhà, đường, xã, tỉnh',
  value,
  onChangeText,
}: Props) {
  const { state, canAskAgain, layViTri } = useDeviceLocation();
  const [dangTra, setDangTra] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const busy = dangTra || state === 'dang-lay';

  const onDinhVi = async () => {
    setLoi(null);
    setHint(null);
    const vt = await layViTri();
    if (!vt) {
      setLoi(
        state === 'tu-choi' && !canAskAgain
          ? 'Chưa cấp quyền vị trí. Vào Cài đặt để bật, hoặc gõ địa chỉ tay.'
          : 'Không lấy được vị trí — gõ địa chỉ tay giúp nhé.',
      );
      return;
    }
    setDangTra(true);
    try {
      const dc = await reverseGeocode(vt.lat, vt.lng);
      const chuoi = ghepDiaChi(dc);
      if (!chuoi) {
        setLoi('Không tra được địa chỉ từ toạ độ này.');
        return;
      }
      onChangeText(chuoi);
      setHint(
        dc.nguon === 'mock'
          ? 'Đã điền xã/tỉnh (ước lượng — chưa nối máy chủ). Bổ sung số nhà nếu có.'
          : 'Đã điền xã/tỉnh — bổ sung số nhà, đường nếu có.',
      );
    } catch (err) {
      // Mất mạng cho ra "Network Error" khô khan — nói người dùng gõ tay giúp.
      setLoi(
        laLoiMang(err)
          ? 'Đang offline — chưa tra được địa chỉ. Gõ tay giúp nhé.'
          : apiErrorMessage(err),
      );
    } finally {
      setDangTra(false);
    }
  };

  const needsSettings = state === 'tu-choi' && !canAskAgain;

  return (
    <View>
      <View className="flex-row items-start">
        <View className="flex-1">
          <Input
            label={label}
            placeholder={placeholder}
            value={value}
            onChangeText={(v) => {
              onChangeText(v);
              if (hint) setHint(null);
            }}
          />
        </View>
        <Pressable
          onPress={needsSettings ? () => void Linking.openSettings() : onDinhVi}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={needsSettings ? 'Mở Cài đặt vị trí' : 'Định vị để điền địa chỉ'}
          className={`ml-2 h-input w-11 rounded-input border items-center justify-center ${
            busy ? 'bg-neutral-100 border-border' : 'bg-primary-50 border-primary/30'
          }`}
          style={{ marginTop: 22 }}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <Ionicons
              name={needsSettings ? 'settings-outline' : 'locate-outline'}
              size={20}
              color="#dd1c2e"
            />
          )}
        </Pressable>
      </View>

      {hint ? <Text className="text-small text-green-700 -mt-2 mb-2">{hint}</Text> : null}
      {loi ? <Text className="text-small text-amber-800 -mt-2 mb-2">{loi}</Text> : null}
    </View>
  );
}
