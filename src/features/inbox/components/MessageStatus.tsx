import { Text, Pressable } from 'react-native';

type Props = {
  /** 'dang_gui' | 'loi' — chỉ có ở tin optimistic chưa/không gửi được. */
  trangThai?: 'dang_gui' | 'loi';
  /** Đối phương đã xem (heuristic mock). */
  daXem?: boolean;
  onRetry?: () => void;
};

/** Trạng thái dưới bong bóng của MÌNH: Đang gửi / Gửi lại (tap) / Đã xem / Đã gửi. */
export function MessageStatus({ trangThai, daXem, onRetry }: Props) {
  if (trangThai === 'dang_gui') {
    return <Text className="text-small text-ink-soft ml-1">· Đang gửi…</Text>;
  }
  if (trangThai === 'loi') {
    return (
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Gửi lại tin nhắn"
      >
        <Text className="text-small text-primary font-semibold ml-1">· Lỗi — Gửi lại</Text>
      </Pressable>
    );
  }
  if (daXem) {
    return <Text className="text-small text-ink-soft ml-1">· Đã xem</Text>;
  }
  return <Text className="text-small text-ink-soft ml-1">· Đã gửi</Text>;
}
