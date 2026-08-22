import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, MAU } from '../../../theme/tokens';
import { ACCENT_LOAI, MOC_TOI_THIEU } from '../giai-doan';
import type { LichCayTrong, MocLich } from '../types';

/** Bộ mốc + chu kỳ được chọn từ 1 mẫu, để màn gọi tự dựng lịch / prefill editor. */
export type MauLich = {
  mocDau: MocLich[];
  chuKy?: LichCayTrong['chuKy'];
  soLuaToiDa?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Các lịch cây đã có — nguồn để "sao chép". */
  dsLich: LichCayTrong[];
  /** Bỏ lịch của chính cây đang sửa khỏi danh sách sao chép. */
  excludeId?: string;
  onChon: (mau: MauLich) => void;
  /** "Tự dựng chi tiết" — điều hướng sang editor đầy đủ (chỉ màn chi tiết thửa cần). */
  onTuDung?: () => void;
  /** Đang lưu (tạo nhanh) — khoá thao tác + hiện spinner. */
  dangLuu?: boolean;
};

/**
 * Bottom-sheet chọn mẫu lịch canh tác — dùng chung 2 lối vào:
 *  - Màn chi tiết thửa: tạo nhanh (chọn mẫu → lưu liền, không rời màn).
 *  - Màn editor lịch cây: prefill danh sách mốc từ mẫu.
 *
 * Mẫu = sao chép cấu trúc mốc từ lịch cây đã có (không bịa), hoặc "bắt đầu tối
 * thiểu" (1 mốc Kích hoạt). Cây khác nhau vẫn dùng chung khung giai đoạn nên
 * clone làm điểm khởi đầu rất nhanh — KTV chỉnh lại tên/tháng cho đúng cây.
 */
export function MauLichSheet({ visible, onClose, dsLich, excludeId, onChon, onTuDung, dangLuu }: Props) {
  const mauClone = dsLich.filter((l) => l.id !== excludeId && l.mocDau.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={dangLuu ? undefined : onClose}>
        <Pressable className="bg-white rounded-t-frame p-4" onPress={() => {}}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-h2 text-ink font-semibold">Chọn mẫu lịch</Text>
            <Pressable
              onPress={onClose}
              disabled={dangLuu}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={24} color={MAU.inkMuted} />
            </Pressable>
          </View>

          {dangLuu ? (
            <View className="items-center py-10">
              <ActivityIndicator color={MAU.primary} />
              <Text className="text-caption text-ink-muted mt-2">Đang tạo lịch…</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {mauClone.length > 0 ? (
                <>
                  <Text className="text-caption text-ink-muted uppercase mb-1">
                    Sao chép từ lịch có sẵn
                  </Text>
                  {mauClone.map((l) => {
                    const a = ACCENT[ACCENT_LOAI[l.mocDau[0].loai]];
                    return (
                      <Pressable
                        key={l.id}
                        onPress={() =>
                          onChon({
                            mocDau: l.mocDau.map((m) => ({ ...m })),
                            chuKy: l.chuKy,
                            soLuaToiDa: l.soLuaToiDa,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Dùng mẫu ${l.nhan}`}
                        className="min-h-[44px] flex-row items-center rounded-input border border-border px-3 py-2 mb-2 active:opacity-70"
                      >
                        <View
                          className={`h-8 w-8 rounded-full items-center justify-center mr-3 ${a.bg} ${a.border} border`}
                        >
                          <Ionicons name="leaf-outline" size={18} color={a.icon} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-body text-ink font-semibold" numberOfLines={1}>
                            {l.nhan}
                          </Text>
                          <Text className="text-small text-ink-muted">
                            {l.mocDau.length} mốc{l.chuKy ? ` · lặp ${l.soLuaToiDa ?? 1} lứa` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={MAU.inkSoft} />
                      </Pressable>
                    );
                  })}
                </>
              ) : null}

              <Text className="text-caption text-ink-muted uppercase mb-1 mt-1">
                {mauClone.length > 0 ? 'Hoặc' : 'Bắt đầu'}
              </Text>
              <Pressable
                onPress={() => onChon({ mocDau: MOC_TOI_THIEU.map((m) => ({ ...m })) })}
                accessibilityRole="button"
                accessibilityLabel="Bắt đầu tối thiểu"
                className="min-h-[44px] flex-row items-center rounded-input border border-border px-3 py-2 mb-2 active:opacity-70"
              >
                <View className="h-8 w-8 rounded-full items-center justify-center mr-3 bg-neutral-100">
                  <Ionicons name="add" size={18} color={MAU.inkMuted} />
                </View>
                <View className="flex-1">
                  <Text className="text-body text-ink font-semibold">Bắt đầu tối thiểu</Text>
                  <Text className="text-small text-ink-muted">1 mốc Kích hoạt — tự khai tiếp</Text>
                </View>
              </Pressable>

              {onTuDung ? (
                <Pressable
                  onPress={onTuDung}
                  accessibilityRole="button"
                  accessibilityLabel="Tự dựng chi tiết"
                  className="min-h-[44px] flex-row items-center justify-center mt-1 active:opacity-70"
                >
                  <Text className="text-body text-primary font-semibold">Tự dựng chi tiết →</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
