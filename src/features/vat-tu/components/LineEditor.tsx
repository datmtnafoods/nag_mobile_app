import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DraftLine } from '../types';
import { formatQtyWithUnit } from '../unit-convert';
import { formatVND } from '../format';

type Tone = 'nhap' | 'ban' | 'kiem_ke' | 'neutral';

type Props = {
  line: DraftLine;
  onRemove: () => void;
  warning?: string | null;
  /** Tone icon theo loại chứng từ — nhập green, bán amber, kiểm blue. */
  tone?: Tone;
};

const TONE_STYLES: Record<Tone, { bg: string; color: string }> = {
  nhap: { bg: 'bg-green-100', color: '#166534' },
  ban: { bg: 'bg-amber-100', color: '#92400e' },
  kiem_ke: { bg: 'bg-blue-50', color: '#1e40af' },
  neutral: { bg: 'bg-neutral-100', color: '#6b7280' },
};

export function LineEditor({ line, onRemove, warning, tone = 'neutral' }: Props) {
  const toneStyle = TONE_STYLES[tone];
  const { primary, caption } = formatQtyWithUnit(line.soLuong, line.donVi, {
    donViCoBan: line.donViCoBan,
    donViLon: line.donViLon,
    heSoQuyDoi: line.heSoQuyDoi,
  });
  const amount = line.donGia ? line.donGia * (caption ? line.soLuong * (line.heSoQuyDoi ?? 1) : line.soLuong) : 0;

  return (
    <View className="py-3 border-b border-border">
      <View className="flex-row items-start">
        <View
          className={`h-10 w-10 rounded-input ${toneStyle.bg} items-center justify-center mr-3`}
        >
          <Ionicons name="cube" size={20} color={toneStyle.color} />
        </View>
        <View className="flex-1">
          <Text className="text-body text-ink font-semibold" numberOfLines={1}>
            {line.tenSku}
          </Text>
          <Text className="text-caption text-ink-muted">{primary}</Text>
          {caption ? <Text className="text-small text-ink-muted">{caption}</Text> : null}
          {line.lo || line.hanDung ? (
            <Text className="text-small text-ink-muted mt-0.5">
              {line.lo ? `Lô: ${line.lo}` : ''}
              {line.lo && line.hanDung ? ' · ' : ''}
              {line.hanDung ? `HSD: ${line.hanDung}` : ''}
            </Text>
          ) : null}
          {line.donGia ? (
            <Text className="text-caption text-primary font-semibold mt-1">
              {formatVND(amount)}
            </Text>
          ) : null}
          {warning ? (
            <View className="mt-2 rounded-input bg-amber-50 border border-amber-200 p-2 flex-row items-start">
              <Ionicons
                name="warning-outline"
                size={14}
                color="#92400e"
                style={{ marginTop: 2 }}
              />
              <Text className="text-small text-amber-800 ml-2 flex-1">{warning}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel="Xoá dòng"
        >
          <Ionicons name="trash-outline" size={20} color="#b91c1c" />
        </Pressable>
      </View>
    </View>
  );
}
