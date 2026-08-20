import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listSeedProducts } from '../../../api/erp/catalog';
import { Input } from '../../../components/Input';
import { CAY_TRONG_GOI_Y } from '../cay-trong';

type Props = {
  label?: string;
  giaTri: string;
  onChange: (ten: string) => void;
  placeholder?: string;
  /** Tên cây loại khỏi gợi ý (so trùng tên chính xác) — vd cây chính khi chọn cây xen. */
  loaiTru?: string[];
  /** Danh sách gợi ý nền. Mặc định cây trồng chính; ô cây xen truyền `CAY_XEN_GOI_Y`. */
  goiY?: string[];
};

const chuanHoa = (s: string) => s.trim().toLowerCase();

/**
 * Chọn cây trồng: chip gợi ý HOẶC gõ thêm cây mới.
 *
 * Chip nền là danh sách cục bộ (`goiY`, mặc định `CAY_TRONG_GOI_Y`) nên LUÔN hiện —
 * kể cả khi backend chưa có danh mục giống hoặc mất mạng. Chỉ ô CÂY CHÍNH (goiY mặc
 * định) mới gộp thêm tên giống từ `listSeedProducts`; ô cây xen dùng danh sách riêng,
 * không gộp (catalog toàn giống cây chính). `cropName`/`cropXen` là TEXT tự do nên gõ
 * tay vẫn nhận.
 */
export function ChonCayTrong({ label, giaTri, onChange, placeholder, loaiTru, goiY }: Props) {
  const laChinh = goiY === undefined;
  const nen = goiY ?? CAY_TRONG_GOI_Y;

  const sanPhamQuery = useQuery({
    queryKey: ['seed-products'],
    queryFn: () => listSeedProducts({}),
    staleTime: 5 * 60_000,
    // Chỉ ô cây chính mới cần danh mục giống. Backend có thể rỗng/lỗi ở real mode —
    // không chặn UI, chỉ dùng danh sách cục bộ. Không retry ồn ào.
    enabled: laChinh,
    retry: false,
  });

  const catalog = laChinh ? (sanPhamQuery.data ?? []).map((p) => p.name) : [];
  // Nền + (catalog nếu là ô chính), khử trùng tên, rồi loại đúng cây đã chọn ở ô kia
  // (so trùng TÊN chính xác — khác giống là khác cây).
  const boLoai = new Set((loaiTru ?? []).map(chuanHoa).filter(Boolean));
  const tenCay = Array.from(new Set([...nen, ...catalog])).filter(
    (ten) => !boLoai.has(chuanHoa(ten)),
  );
  const daChon = giaTri.trim();

  return (
    <View>
      {label ? <Text className="text-caption text-ink-muted mb-1">{label}</Text> : null}

      <Text className="text-small text-ink-muted mb-1">Gợi ý — chạm để chọn</Text>
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

      <Input
        placeholder={placeholder ?? 'Gõ tên cây hoặc chọn gợi ý bên trên'}
        leftIcon="leaf-outline"
        value={giaTri}
        onChangeText={onChange}
      />
    </View>
  );
}
