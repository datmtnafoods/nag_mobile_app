import { View, Text, Pressable } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import { DON_VI_DIEN_TICH, canhOVuong, doiRaM2, type DonViDienTich } from '../geo';

type Props = {
  soLuong: number;
  donVi: DonViDienTich;
  onChange: (v: { soLuong: number; donVi: DonViDienTich }) => void;
};

/**
 * Nhập diện tích + chọn đơn vị, hiện quy đổi m² và kích thước ô vuông sẽ sinh.
 *
 * Nhãn đơn vị ghi RÕ số m² vì "sào" mỗi vùng một khác (Bắc Bộ 360, Trung Bộ 500,
 * Nam Bộ/Tây Nguyên 1.000). Không ghi rõ là mỗi người hiểu một kiểu, diện tích
 * lệch gấp 3 lần.
 */
export function DienTichInput({ soLuong, donVi, onChange }: Props) {
  const numeric = useNumericInput(soLuong, (n) => onChange({ soLuong: n, donVi }), {
    min: 0,
    maxDecimals: 2,
  });

  const m2 = doiRaM2(soLuong, donVi);
  const canh = canhOVuong(m2);

  return (
    <View>
      <View className="flex-row items-start">
        <View className="flex-1 mr-2">
          <Input
            label="Diện tích"
            placeholder="3"
            keyboardType="numeric"
            value={numeric.value}
            onChangeText={numeric.onChangeText}
            onBlur={numeric.onBlur}
          />
        </View>
      </View>

      <Text className="text-caption text-ink-muted mb-1">Đơn vị</Text>
      <View className="flex-row flex-wrap mb-2">
        {DON_VI_DIEN_TICH.map((d) => {
          const active = donVi === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => onChange({ soLuong, donVi: d.id })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`h-11 mr-2 mb-2 px-3 rounded-input items-center justify-center border ${
                active ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
            >
              <Text
                className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
              >
                {d.nhan}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {m2 > 0 ? (
        <View className="rounded-input bg-blue-50 border border-blue-200 p-3">
          <Text className="text-caption text-blue-800">
            ≈ <Text className="font-semibold">{m2.toLocaleString('vi-VN')} m²</Text> ·{' '}
            {(m2 / 10_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ha
          </Text>
          <Text className="text-small text-blue-800 mt-1">
            Ranh sẽ là ô vuông ~{canh} × {canh} m quanh điểm ghim.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
