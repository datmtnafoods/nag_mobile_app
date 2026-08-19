import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listSeedProducts } from '../../../api/erp/catalog';
import { Input } from '../../../components/Input';

type Props = {
  label?: string;
  giaTri: string;
  onChange: (ten: string) => void;
  placeholder?: string;
};

/**
 * Chọn cây trồng: chip từ danh mục giống có sẵn HOẶC gõ thêm cây mới.
 *
 * `cropName` ở backend là TEXT tự do nên nguồn sự thật chỉ là một chuỗi — chip
 * chỉ là lối điền nhanh, gõ tay vẫn nhận. `nhanDangCayTrong` so khớp mềm theo từ
 * khoá nên tên lấy từ danh mục ("Chanh leo tím") vẫn ra đúng lịch canh tác.
 */
export function ChonCayTrong({ label, giaTri, onChange, placeholder }: Props) {
  const sanPhamQuery = useQuery({
    queryKey: ['seed-products'],
    queryFn: () => listSeedProducts({}),
    staleTime: 5 * 60_000,
  });

  // Tên cây duy nhất từ danh mục giống (một giống = một tên).
  const tenCay = Array.from(new Set((sanPhamQuery.data ?? []).map((p) => p.name)));
  const daChon = giaTri.trim();

  return (
    <View>
      {label ? <Text className="text-caption text-ink-muted mb-1">{label}</Text> : null}
      {tenCay.length > 0 ? (
        <View className="flex-row flex-wrap mb-1">
          {tenCay.map((ten) => {
            const active = daChon === ten;
            return (
              <Pressable
                key={ten}
                onPress={() => onChange(active ? '' : ten)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`h-9 px-3 rounded-full items-center justify-center border mr-2 mb-2 ${
                  active ? 'bg-primary border-primary' : 'bg-white border-border'
                }`}
              >
                <Text
                  className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
                >
                  {ten}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Input
        placeholder={placeholder ?? 'Chọn ở trên hoặc gõ cây khác…'}
        leftIcon="leaf-outline"
        value={giaTri}
        onChangeText={onChange}
      />
    </View>
  );
}
