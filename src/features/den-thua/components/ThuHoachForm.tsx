import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import type { ChiTietThuHoach, MocCanhTac } from '../types';

/** Chi tiết mặc định cho 1 lần thu hoạch. */
export const THU_HOACH_MAC_DINH: ChiTietThuHoach = {};

type Props = {
  value: ChiTietThuHoach;
  onChange: (v: ChiTietThuHoach) => void;
  /**
   * Danh sách mốc `loai='thu_hoach'` của thửa — từ `useMocThua`. Cho phép chọn
   * lứa cho nhật ký; auto-chọn mốc có `|ngày nhật ký − ngayDuKien|` nhỏ nhất
   * khi user chưa đụng chip.
   */
  mocThuHoach?: MocCanhTac[];
  /** Ngày làm việc — dùng để auto-chọn lứa gần nhất. */
  ngay?: string;
};

export function ThuHoachForm({ value, onChange, mocThuHoach, ngay }: Props) {
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

  // Chỉ auto-chọn khi user CHƯA đụng vào chip lần nào — không đè lựa chọn tay
  // khi user đổi ngày.
  const userDaChon = useRef(false);
  const luaGoiY = useMemo<string | undefined>(() => {
    if (!mocThuHoach?.length || !ngay) return undefined;
    const t = new Date(ngay).getTime();
    if (Number.isNaN(t)) return undefined;
    let bestId: string | undefined;
    let bestDist = Infinity;
    for (const m of mocThuHoach) {
      const d = Math.abs(new Date(m.ngayDuKien).getTime() - t);
      if (d < bestDist) {
        bestDist = d;
        bestId = m.id;
      }
    }
    return bestId;
  }, [mocThuHoach, ngay]);

  useEffect(() => {
    if (userDaChon.current) return;
    if (!luaGoiY) return;
    if (value.mocId === luaGoiY) return;
    onChange({ ...value, mocId: luaGoiY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luaGoiY]);

  const chonLua = (mocId?: string) => {
    userDaChon.current = true;
    onChange({ ...value, mocId });
  };

  return (
    <View>
      {mocThuHoach && mocThuHoach.length > 0 ? (
        <View className="mb-3">
          <Text className="text-caption text-ink-muted mb-1">Gắn vào lứa (tuỳ chọn)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {mocThuHoach.map((m) => {
              const active = value.mocId === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => chonLua(active ? undefined : m.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`min-h-[44px] px-3 rounded-full items-center justify-center border ${
                    active ? 'bg-primary border-primary' : 'bg-white border-border'
                  }`}
                >
                  <Text
                    className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
                    numberOfLines={1}
                  >
                    {m.lua ? `Lứa ${m.lua}` : m.nhan}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => chonLua(undefined)}
              accessibilityRole="button"
              accessibilityState={{ selected: !value.mocId }}
              className={`min-h-[44px] px-3 rounded-full items-center justify-center border ${
                !value.mocId ? 'bg-neutral-200 border-neutral-300' : 'bg-white border-border'
              }`}
            >
              <Text className="text-caption font-semibold text-ink">Không gắn lứa</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

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
