import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CAY_XEN_GOI_Y, chuanHoaCay, themCayXen } from '../cay-trong';

type Props = {
  label?: string;
  giaTri: string[];
  onChange: (list: string[]) => void;
  /** Cây chính — loại khỏi gợi ý và chặn add. */
  loaiTru?: string;
};

const NGUONG_CAY_NHIEU = 4;

/**
 * Chọn nhiều cây xen canh.
 *
 * Tick chip từ `CAY_XEN_GOI_Y`, gõ tay cây ngoài gợi ý (Enter hoặc nút Thêm),
 * bỏ chọn bằng nút X trên chip "Đã chọn". Dedupe qua `themCayXen`. Cây chính
 * (prop `loaiTru`) bị loại khỏi gợi ý và không add được — hiện hint đỏ khi user
 * gõ trùng.
 *
 * Component tách riêng khỏi `ChonCayTrong` (đơn tuyển) — cây chính vẫn dùng
 * ChonCayTrong; đây chỉ cho ô cây xen.
 */
export function ChonNhieuCayXen({ label, giaTri, onChange, loaiTru }: Props) {
  const [input, setInput] = useState('');
  const trungCayChinh =
    Boolean(loaiTru && input.trim()) && chuanHoaCay(input) === chuanHoaCay(loaiTru!);

  // Chip gợi ý: loại cây chính khỏi list nền (so trùng lowercase).
  const boLoai = new Set<string>();
  if (loaiTru?.trim()) boLoai.add(chuanHoaCay(loaiTru));
  const nen = CAY_XEN_GOI_Y.filter((t) => !boLoai.has(chuanHoaCay(t)));

  const daChonKey = new Set(giaTri.map(chuanHoaCay));
  const toggle = (ten: string) => {
    const k = chuanHoaCay(ten);
    if (daChonKey.has(k)) {
      onChange(giaTri.filter((x) => chuanHoaCay(x) !== k));
    } else {
      onChange(themCayXen(giaTri, ten, loaiTru));
    }
  };

  const themTay = () => {
    const t = input.trim();
    if (!t || trungCayChinh) return;
    const next = themCayXen(giaTri, t, loaiTru);
    onChange(next);
    // Chỉ clear input nếu thực sự đã thêm (tránh user gõ trùng cây đã chọn thì mất chữ).
    if (next.length !== giaTri.length) setInput('');
  };

  return (
    <View>
      {label ? <Text className="text-caption text-ink-muted mb-1">{label}</Text> : null}

      {/* Hàng "Đã chọn (N)" */}
      {giaTri.length > 0 ? (
        <View className="mb-2">
          <Text className="text-small text-ink-muted mb-1">Đã chọn ({giaTri.length})</Text>
          <View className="flex-row flex-wrap">
            {giaTri.map((ten) => (
              <View
                key={chuanHoaCay(ten)}
                className="flex-row items-center rounded-input px-2 py-1 mr-2 mb-1 bg-neutral-100"
              >
                <Text className="text-small text-ink font-semibold" numberOfLines={1}>
                  {ten}
                </Text>
                <Pressable
                  onPress={() => onChange(giaTri.filter((x) => chuanHoaCay(x) !== chuanHoaCay(ten)))}
                  hitSlop={8}
                  className="ml-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ cây xen ${ten}`}
                >
                  <Ionicons name="close-circle" size={16} color="#6b7280" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Chip gợi ý */}
      <Text className="text-small text-ink-muted mb-1">Gợi ý — chạm để chọn/bỏ</Text>
      <View className="flex-row flex-wrap mb-2">
        {nen.map((ten) => {
          const active = daChonKey.has(chuanHoaCay(ten));
          return (
            <Pressable
              key={ten}
              onPress={() => toggle(ten)}
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

      {/* Ô thêm cây khác — TextInput trần để bố trí nút "Thêm" cạnh phải cùng chiều cao. */}
      <View className="flex-row items-center mb-1">
        <View
          className={`flex-1 flex-row items-center h-input rounded-input border bg-white px-3 ${
            trungCayChinh ? 'border-red-500' : 'border-border'
          }`}
        >
          <Ionicons name="add-circle-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-body text-ink"
            // Xem chuỗi fix ở Input.tsx — cần đủ 4 điểm để chữ không bị viền cắt.
            style={{
              paddingVertical: 0,
              includeFontPadding: false,
              lineHeight: 20,
              textAlignVertical: 'center',
            }}
            placeholder="Thêm cây khác…"
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={themTay}
            // Giữ focus để thêm nhiều cây liên tục — không lộn xộn keyboard.
            blurOnSubmit={false}
            returnKeyType="done"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={themTay}
          disabled={!input.trim() || trungCayChinh}
          accessibilityRole="button"
          accessibilityLabel="Thêm cây xen"
          className={`h-input px-4 rounded-input ml-2 items-center justify-center ${
            !input.trim() || trungCayChinh ? 'bg-neutral-100' : 'bg-primary-50'
          }`}
        >
          <Text
            className={`font-semibold ${
              !input.trim() || trungCayChinh ? 'text-ink-muted' : 'text-primary'
            }`}
          >
            Thêm
          </Text>
        </Pressable>
      </View>

      {trungCayChinh ? (
        <Text className="text-small text-red-600 mb-1">
          "{input.trim()}" trùng cây trồng chính — chọn cây khác.
        </Text>
      ) : null}
      {giaTri.length > NGUONG_CAY_NHIEU ? (
        <Text className="text-small text-amber-700">
          Đang có {giaTri.length} cây xen — nhiều hơn thường lệ, kiểm tra lại xem có nhầm không.
        </Text>
      ) : null}
    </View>
  );
}
