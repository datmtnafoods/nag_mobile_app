import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoaiNhatKy } from '../types';

export const LOAI_NHAT_KY_META: Record<
  LoaiNhatKy,
  { nhan: string; icon: keyof typeof Ionicons.glyphMap; mau: string }
> = {
  canh_tac: { nhan: 'Chăm sóc / canh tác', icon: 'construct-outline', mau: '#166534' },
  bon_phan: { nhan: 'Bón phân', icon: 'nutrition-outline', mau: '#92400e' },
  phun_thuoc: { nhan: 'Phun thuốc BVTV', icon: 'flask-outline', mau: '#1e40af' },
  thu_hoach: { nhan: 'Thu hoạch / sản lượng', icon: 'basket-outline', mau: '#dd1c2e' },
  tinh_trang_cay: { nhan: 'Tình trạng cây / sâu bệnh', icon: 'bug-outline', mau: '#166534' },
};

const THU_TU: LoaiNhatKy[] = [
  'canh_tac',
  'bon_phan',
  'phun_thuoc',
  'thu_hoach',
  'tinh_trang_cay',
];

type Props = {
  value: LoaiNhatKy | null;
  onChange: (v: LoaiNhatKy) => void;
  /** Loại gợi ý cho giai đoạn hiện tại — hiện nhóm trên, tách khỏi "Loại khác". */
  goiY?: LoaiNhatKy[];
};

export function LoaiNhatKyChips({ value, onChange, goiY }: Props) {
  const goiYSet = new Set(goiY ?? []);
  // Giữ thứ tự chuẩn trong mỗi nhóm để layout ổn định.
  const nhomGoiY = THU_TU.filter((l) => goiYSet.has(l));
  const nhomKhac = THU_TU.filter((l) => !goiYSet.has(l));

  const renderChip = (loai: LoaiNhatKy) => {
    const meta = LOAI_NHAT_KY_META[loai];
    const active = value === loai;
    return (
      <View key={loai} className="w-1/2 px-1 mb-2">
        <Pressable
          onPress={() => onChange(loai)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          className={`rounded-card border p-3 active:opacity-80 ${
            active ? 'bg-primary border-primary' : 'bg-white border-border'
          }`}
          style={{ minHeight: 76 }}
        >
          <Ionicons name={meta.icon} size={22} color={active ? '#fff' : meta.mau} />
          <Text
            className={`text-caption font-semibold mt-2 ${active ? 'text-white' : 'text-ink'}`}
          >
            {meta.nhan}
          </Text>
        </Pressable>
      </View>
    );
  };

  // Không có gợi ý (cây chưa có hồ sơ giai đoạn) → 1 lưới phẳng, mọi loại ngang nhau.
  if (nhomGoiY.length === 0) {
    return <View className="flex-row flex-wrap -mx-1">{THU_TU.map(renderChip)}</View>;
  }

  return (
    <View>
      <Text className="text-small text-ink-muted mb-1">Gợi ý cho giai đoạn này</Text>
      <View className="flex-row flex-wrap -mx-1 mb-2">{nhomGoiY.map(renderChip)}</View>
      {nhomKhac.length ? (
        <>
          <Text className="text-small text-ink-muted mb-1">Loại khác</Text>
          <View className="flex-row flex-wrap -mx-1">{nhomKhac.map(renderChip)}</View>
        </>
      ) : null}
    </View>
  );
}
