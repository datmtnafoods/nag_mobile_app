import { View } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import type { ChiTietThuHoach } from '../types';

/** Chi tiết mặc định cho 1 lần thu hoạch. */
export const THU_HOACH_MAC_DINH: ChiTietThuHoach = {};

type Props = { value: ChiTietThuHoach; onChange: (v: ChiTietThuHoach) => void };

export function ThuHoachForm({ value, onChange }: Props) {
  const sanLuong = useNumericInput(
    value.sanLuong ?? 0,
    (n) => onChange({ ...value, sanLuong: n }),
    { min: 0, maxDecimals: 1 },
  );
  const khoiLuongBan = useNumericInput(
    value.khoiLuongBan ?? 0,
    (n) => onChange({ ...value, khoiLuongBan: n || undefined }),
    { min: 0, maxDecimals: 1 },
  );

  return (
    <View>
      <View className="flex-row">
        <View className="flex-1 mr-2">
          <Input
            label="Sản lượng thu (kg) *"
            keyboardType="numeric"
            value={sanLuong.value}
            onChangeText={sanLuong.onChangeText}
            onBlur={sanLuong.onBlur}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Khối lượng bán (kg)"
            keyboardType="numeric"
            value={khoiLuongBan.value}
            onChangeText={khoiLuongBan.onChangeText}
            onBlur={khoiLuongBan.onBlur}
          />
        </View>
      </View>

      <Input
        label="Loại / phân hạng quả"
        placeholder="VD: loại 1, xuất khẩu"
        value={value.phanHang ?? ''}
        onChangeText={(t) => onChange({ ...value, phanHang: t || undefined })}
      />
      <Input
        label="Mã lô truy xuất"
        placeholder="VD: CL-01-100626"
        autoCapitalize="characters"
        value={value.maTruyXuat ?? ''}
        onChangeText={(t) => onChange({ ...value, maTruyXuat: t || undefined })}
      />
      <Input
        label="Ghi chú"
        placeholder="Nơi bán, khách hàng…"
        multiline
        value={value.ghiChu ?? ''}
        onChangeText={(t) => onChange({ ...value, ghiChu: t || undefined })}
      />
    </View>
  );
}
