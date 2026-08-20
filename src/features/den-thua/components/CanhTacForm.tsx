import { View } from 'react-native';
import { Input } from '../../../components/Input';
import type { ChiTietCanhTac } from '../types';

/** Chi tiết mặc định cho 1 lần chăm sóc / canh tác. */
export const CANH_TAC_MAC_DINH: ChiTietCanhTac = {};

type Props = { value: ChiTietCanhTac; onChange: (v: ChiTietCanhTac) => void };

export function CanhTacForm({ value, onChange }: Props) {
  return (
    <View>
      <Input
        label="Thời tiết"
        placeholder="VD: nắng nhẹ, khô ráo"
        value={value.thoiTiet ?? ''}
        onChangeText={(t) => onChange({ ...value, thoiTiet: t || undefined })}
      />
      <Input
        label="Ghi chú"
        placeholder="Dụng cụ đã dùng, lưu ý…"
        multiline
        value={value.ghiChu ?? ''}
        onChangeText={(t) => onChange({ ...value, ghiChu: t || undefined })}
      />
    </View>
  );
}
