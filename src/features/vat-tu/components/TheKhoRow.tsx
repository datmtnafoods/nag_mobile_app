import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { KhoMove } from '../types';
import { CHUNG_TU_LOAI_LABELS, formatDate, formatQty, formatVND } from '../format';

type Props = {
  move: KhoMove;
  donViCoBan: string;
  /** Tồn cộng dồn tính đến move này (nếu FE tính sẵn). */
  runningTotal?: number;
  onPressChungTu?: () => void;
};

/** 1 dòng thẻ kho — đấu ±, chungTuLoai icon, ngày, running tồn. */
export function TheKhoRow({ move, donViCoBan, runningTotal, onPressChungTu }: Props) {
  const isIn = move.huong === 'in';
  const sign = isIn ? '+' : '−';
  const tone = isIn ? { text: 'text-green-700', bg: 'bg-green-100' } : { text: 'text-red-700', bg: 'bg-red-50' };
  const icon = isIn ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';
  const chungTuLabel = CHUNG_TU_LOAI_LABELS[move.chungTuLoai] ?? move.chungTuLoai;

  return (
    <View className="flex-row items-center py-2 border-b border-border">
      <View className={`w-9 h-9 rounded-input ${tone.bg} items-center justify-center mr-3`}>
        <Ionicons name={icon} size={18} color={isIn ? '#166534' : '#b91c1c'} />
      </View>
      <View className="flex-1">
        <Text className="text-body text-ink font-semibold">
          <Text className={tone.text}>
            {sign}
            {formatQty(move.soLuong, donViCoBan)}
          </Text>
        </Text>
        <View className="flex-row items-center flex-wrap">
          <Text className="text-caption text-ink-muted">{chungTuLabel}</Text>
          <Text className="text-caption text-ink-muted mx-1">·</Text>
          {onPressChungTu ? (
            <Pressable onPress={onPressChungTu} hitSlop={4}>
              <Text className="text-caption text-primary font-semibold">{move.chungTuId}</Text>
            </Pressable>
          ) : (
            <Text className="text-caption text-ink-muted">{move.chungTuId}</Text>
          )}
          <Text className="text-caption text-ink-muted mx-1">·</Text>
          <Text className="text-caption text-ink-muted">{formatDate(move.taoLuc)}</Text>
        </View>
        {move.lo || move.donGia ? (
          <Text className="text-small text-ink-muted mt-0.5">
            {move.lo ? `Lô: ${move.lo}` : ''}
            {move.lo && move.donGia ? ' · ' : ''}
            {move.donGia ? `Giá: ${formatVND(move.donGia)}` : ''}
          </Text>
        ) : null}
      </View>
      {runningTotal !== undefined ? (
        <View className="items-end">
          <Text className="text-small text-ink-muted">Tồn cuối</Text>
          <Text className="text-caption text-ink font-semibold">
            {formatQty(runningTotal, donViCoBan)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
