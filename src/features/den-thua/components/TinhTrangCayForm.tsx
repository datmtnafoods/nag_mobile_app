import { View, Text, Pressable } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import type { ChiTietTinhTrangCay } from '../types';

/**
 * Sub-form quan sát tình trạng cây / sâu bệnh có cấu trúc.
 *
 * Trước đây loại `tinh_trang_cay` không có `ChiTiet*` type nào — chỉ ghi qua ô
 * moTa tự do, làm sâu bệnh không tổng hợp/lọc được. Cấu trúc ở đây bám VietGAP:
 * đối tượng · mức độ · bộ phận bị hại · tỉ lệ ước lượng.
 */
export const TINH_TRANG_CAY_MAC_DINH: ChiTietTinhTrangCay = {
  doiTuong: '',
  mucDo: 'nhe',
};

const MUC_DO: Array<{
  id: ChiTietTinhTrangCay['mucDo'];
  nhan: string;
  bg: string;
  border: string;
  chu: string;
  bgActive: string;
  chuActive: string;
}> = [
  {
    id: 'nhe',
    nhan: 'Nhẹ',
    bg: 'bg-green-50',
    border: 'border-green-200',
    chu: 'text-green-800',
    bgActive: 'bg-green-600',
    chuActive: 'text-white',
  },
  {
    id: 'vua',
    nhan: 'Vừa',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    chu: 'text-amber-800',
    bgActive: 'bg-amber-600',
    chuActive: 'text-white',
  },
  {
    id: 'nang',
    nhan: 'Nặng',
    bg: 'bg-red-50',
    border: 'border-red-200',
    chu: 'text-red-800',
    bgActive: 'bg-red-600',
    chuActive: 'text-white',
  },
];

const BO_PHAN = ['Lá', 'Thân', 'Cành', 'Hoa', 'Quả', 'Rễ', 'Gốc'];

type Props = { value: ChiTietTinhTrangCay; onChange: (v: ChiTietTinhTrangCay) => void };

export function TinhTrangCayForm({ value, onChange }: Props) {
  const tiLe = useNumericInput(
    value.tiLeUocLuong ?? 0,
    (n) => {
      // Clamp max 100 tại đây vì `useNumericInput` không có option `max`.
      const clamped = Math.min(100, Math.max(0, n));
      onChange({ ...value, tiLeUocLuong: clamped > 0 ? clamped : undefined });
    },
    { min: 0, maxDecimals: 0 },
  );
  const boPhanChon = new Set(value.boPhan ?? []);
  const toggleBoPhan = (bp: string) => {
    const next = new Set(boPhanChon);
    if (next.has(bp)) next.delete(bp);
    else next.add(bp);
    const arr = BO_PHAN.filter((b) => next.has(b)); // giữ thứ tự chuẩn
    onChange({ ...value, boPhan: arr.length ? arr : undefined });
  };

  return (
    <View>
      <Input
        label="Đối tượng (dịch hại / bệnh) *"
        placeholder="VD: Bọ trĩ, Nấm Phytophthora, Vàng lá…"
        value={value.doiTuong}
        onChangeText={(t) => onChange({ ...value, doiTuong: t })}
      />

      <Text className="text-caption text-ink-muted mb-1">Mức độ *</Text>
      <View className="flex-row mb-3">
        {MUC_DO.map((m) => {
          const active = value.mucDo === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => onChange({ ...value, mucDo: m.id })}
              accessibilityRole="button"
              accessibilityLabel={`Mức độ ${m.nhan}`}
              accessibilityState={{ selected: active }}
              className={`flex-1 h-11 rounded-input items-center justify-center border mr-2 last:mr-0 ${
                active ? `${m.bgActive} border-transparent` : `${m.bg} ${m.border}`
              }`}
            >
              <Text
                className={`text-body font-semibold ${active ? m.chuActive : m.chu}`}
              >
                {m.nhan}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-caption text-ink-muted mb-1">Bộ phận bị hại</Text>
      <View className="flex-row flex-wrap mb-3">
        {BO_PHAN.map((bp) => {
          const active = boPhanChon.has(bp);
          return (
            <Pressable
              key={bp}
              onPress={() => toggleBoPhan(bp)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-9 px-3 rounded-full items-center justify-center border mr-2 mb-2 ${
                active ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
            >
              <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                {bp}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <Input
            label="Tỉ lệ ước lượng"
            placeholder="0"
            keyboardType="numeric"
            value={tiLe.value}
            onChangeText={tiLe.onChangeText}
            onBlur={tiLe.onBlur}
          />
        </View>
        <View style={{ width: 80 }} className="items-start justify-end pb-2">
          <Text className="text-body text-ink-muted">%</Text>
        </View>
      </View>

      <Input
        label="Ghi chú"
        placeholder="Vị trí trong thửa, điều kiện thời tiết, đề xuất xử lý…"
        multiline
        value={value.ghiChu ?? ''}
        onChangeText={(t) => onChange({ ...value, ghiChu: t || undefined })}
      />
    </View>
  );
}
