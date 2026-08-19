import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoaiNhatKy } from '../types';

export const LOAI_NHAT_KY_META: Record<
  LoaiNhatKy,
  { nhan: string; icon: keyof typeof Ionicons.glyphMap; mau: string }
> = {
  ban_vat_tu: { nhan: 'Bán phân bón / vật tư', icon: 'cart-outline', mau: '#92400e' },
  tinh_trang_cay: { nhan: 'Tình trạng cây / sâu bệnh', icon: 'bug-outline', mau: '#166534' },
  tu_van: { nhan: 'Tư vấn kỹ thuật', icon: 'chatbubble-ellipses-outline', mau: '#1e40af' },
  thu_hoach: { nhan: 'Thu hoạch / sản lượng', icon: 'basket-outline', mau: '#dd1c2e' },
};

const THU_TU: LoaiNhatKy[] = ['ban_vat_tu', 'tinh_trang_cay', 'tu_van', 'thu_hoach'];

type Props = {
  value: LoaiNhatKy | null;
  onChange: (v: LoaiNhatKy) => void;
};

export function LoaiNhatKyChips({ value, onChange }: Props) {
  return (
    <View className="flex-row flex-wrap -mx-1">
      {THU_TU.map((loai) => {
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
                className={`text-caption font-semibold mt-2 ${
                  active ? 'text-white' : 'text-ink'
                }`}
              >
                {meta.nhan}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
