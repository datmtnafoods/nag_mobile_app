import { View, Text, Pressable } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import type { ChiTietBonPhan } from '../types';

/** Chi tiết mặc định cho 1 lần bón phân. */
export const BON_PHAN_MAC_DINH: ChiTietBonPhan = { tenPhan: '', luong: 0, donVi: 'kg' };

const LOAI_PHAN = ['Hữu cơ', 'Vô cơ', 'Vi sinh', 'Phân bón lá'];

type Props = { value: ChiTietBonPhan; onChange: (v: ChiTietBonPhan) => void };

export function BonPhanForm({ value, onChange }: Props) {
  const luong = useNumericInput(value.luong ?? 0, (n) => onChange({ ...value, luong: n }), {
    min: 0,
    maxDecimals: 2,
  });

  return (
    <View>
      <Input
        label="Tên phân bón *"
        placeholder="VD: NPK 16-16-8+TE"
        value={value.tenPhan}
        onChangeText={(t) => onChange({ ...value, tenPhan: t })}
      />

      <Text className="text-caption text-ink-muted mb-1">Loại phân</Text>
      <View className="flex-row flex-wrap mb-2">
        {LOAI_PHAN.map((lp) => {
          const active = value.loaiPhan === lp;
          return (
            <Pressable
              key={lp}
              onPress={() => onChange({ ...value, loaiPhan: active ? undefined : lp })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-9 px-3 rounded-full items-center justify-center border mr-2 mb-2 ${
                active ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
            >
              <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                {lp}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <Input
            label="Lượng dùng *"
            keyboardType="numeric"
            value={luong.value}
            onChangeText={luong.onChangeText}
            onBlur={luong.onBlur}
          />
        </View>
        <View style={{ width: 110 }}>
          <Input
            label="Đơn vị"
            placeholder="kg"
            value={value.donVi}
            onChangeText={(t) => onChange({ ...value, donVi: t })}
          />
        </View>
      </View>

      <Input
        label="Cách bón"
        placeholder="VD: bón rãnh quanh gốc"
        value={value.cachBon ?? ''}
        onChangeText={(t) => onChange({ ...value, cachBon: t || undefined })}
      />
      <Input
        label="Ghi chú"
        placeholder="Nguồn gốc, số lô SX…"
        multiline
        value={value.ghiChu ?? ''}
        onChangeText={(t) => onChange({ ...value, ghiChu: t || undefined })}
      />
    </View>
  );
}
