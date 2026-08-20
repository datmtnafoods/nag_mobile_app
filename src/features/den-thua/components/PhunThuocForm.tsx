import { View, Text } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import type { ChiTietPhunThuoc } from '../types';

/** Chi tiết mặc định cho 1 lần phun (cách ly 7 ngày là mức phổ biến). */
export const PHUN_THUOC_MAC_DINH: ChiTietPhunThuoc = {
  dichHai: '',
  tenThuoc: '',
  thoiGianCachLy: 7,
};

type Props = { value: ChiTietPhunThuoc; onChange: (v: ChiTietPhunThuoc) => void };

export function PhunThuocForm({ value, onChange }: Props) {
  const luongNuoc = useNumericInput(
    value.luongNuoc ?? 0,
    (n) => onChange({ ...value, luongNuoc: n || undefined }),
    { min: 0, maxDecimals: 1 },
  );
  const cachLy = useNumericInput(
    value.thoiGianCachLy ?? 0,
    (n) => onChange({ ...value, thoiGianCachLy: n }),
    { min: 0, maxDecimals: 0 },
  );

  return (
    <View>
      <Input
        label="Dịch hại (sâu / bệnh) *"
        placeholder="VD: bọ trĩ, nhện đỏ"
        value={value.dichHai}
        onChangeText={(t) => onChange({ ...value, dichHai: t })}
      />
      <Input
        label="Tên thương mại thuốc *"
        placeholder="VD: Radiant 60SC"
        value={value.tenThuoc}
        onChangeText={(t) => onChange({ ...value, tenThuoc: t })}
      />
      <Input
        label="Hoạt chất"
        placeholder="VD: Spinetoram"
        value={value.hoatChat ?? ''}
        onChangeText={(t) => onChange({ ...value, hoatChat: t || undefined })}
      />
      <Input
        label="Nồng độ / liều lượng (theo nhãn)"
        placeholder="VD: 10 ml / 16 lít"
        value={value.lieuLuong ?? ''}
        onChangeText={(t) => onChange({ ...value, lieuLuong: t || undefined })}
      />

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <Input
            label="Lượng nước (lít)"
            keyboardType="numeric"
            value={luongNuoc.value}
            onChangeText={luongNuoc.onChangeText}
            onBlur={luongNuoc.onBlur}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Cách ly (ngày) *"
            keyboardType="numeric"
            value={cachLy.value}
            onChangeText={cachLy.onChangeText}
            onBlur={cachLy.onBlur}
          />
        </View>
      </View>

      <Text className="text-small text-ink-muted -mt-1 mb-2">
        Ngày an toàn thu hoạch = ngày phun + số ngày cách ly (hệ thống tự tính).
      </Text>

      <Input
        label="Ghi chú"
        placeholder="Thiết bị, thời tiết, kết quả…"
        multiline
        value={value.ghiChu ?? ''}
        onChangeText={(t) => onChange({ ...value, ghiChu: t || undefined })}
      />
    </View>
  );
}
