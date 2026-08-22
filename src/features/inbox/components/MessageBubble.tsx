import { View, Text } from 'react-native';
import type { TinNhan } from '../types';
import { thoiGianTuongDoi } from '../thoiGian';
import { PhieuCardChat } from './PhieuCardChat';
import { MessageStatus } from './MessageStatus';

type Props = {
  tin: TinNhan;
  /** Tin của phía đang đăng nhập (đỏ, căn phải). */
  mine: boolean;
  onOpenPhieu: (phieuId: string) => void;
  /** Trạng thái gửi optimistic (chỉ tin đang gửi / lỗi). */
  trangThai?: 'dang_gui' | 'loi';
  /** Hiện dòng trạng thái (Đã gửi/Đã xem) — chỉ bật ở tin CUỐI của mình. */
  showStatus?: boolean;
  /** Đối phương đã xem (heuristic mock). */
  daXem?: boolean;
  onRetry?: () => void;
};

/** Một bong bóng chat: text (đỏ/trắng theo phía) hoặc card phiếu, kèm thời gian + trạng thái. */
export function MessageBubble({
  tin,
  mine,
  onOpenPhieu,
  trangThai,
  showStatus,
  daXem,
  onRetry,
}: Props) {
  // Chỉ hiện trạng thái ở tin đang gửi/lỗi hoặc tin cuối của mình (tránh nhiễu).
  const hienTrangThai = mine && (trangThai !== undefined || showStatus);
  return (
    <View className={`mb-2 ${mine ? 'items-end' : 'items-start'}`}>
      {tin.loai === 'text' ? (
        <View
          className={`max-w-[80%] rounded-card px-3 py-2 ${
            mine ? 'bg-primary' : 'bg-white border border-border'
          }`}
        >
          <Text className={mine ? 'text-white' : 'text-ink'}>{tin.noiDung}</Text>
        </View>
      ) : (
        <PhieuCardChat tin={tin} onPress={() => (tin.phieuId ? onOpenPhieu(tin.phieuId) : undefined)} />
      )}
      <View className="flex-row items-center mt-0.5">
        <Text className="text-small text-ink-soft">{thoiGianTuongDoi(tin.guiLuc)}</Text>
        {hienTrangThai ? <MessageStatus trangThai={trangThai} daXem={daXem} onRetry={onRetry} /> : null}
      </View>
    </View>
  );
}
