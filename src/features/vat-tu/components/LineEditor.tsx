import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DraftLine } from '../types';
import { formatQtyWithUnit } from '../unit-convert';
import { formatVND } from '../format';

type Props = {
  line: DraftLine;
  onEdit: () => void;
  onRemove: () => void;
  warning?: string | null;
};

export function LineEditor({ line, onEdit, onRemove, warning }: Props) {
  const { primary, caption } = formatQtyWithUnit(line.soLuong, line.donVi, {
    donViCoBan: line.donViCoBan,
    donViLon: line.donViLon,
    heSoQuyDoi: line.heSoQuyDoi,
  });
  const amount = line.donGia ? line.donGia * (caption ? line.soLuong * (line.heSoQuyDoi ?? 1) : line.soLuong) : 0;

  return (
    <View className="py-3 border-b border-border">
      <View className="flex-row items-start">
        <View className="h-10 w-10 rounded-input bg-primary-50 items-center justify-center mr-3">
          <Ionicons name="cube" size={20} color="#dd1c2e" />
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
        <View className="flex-row items-center">
          <Pressable onPress={onEdit} hitSlop={8} className="p-2" accessibilityLabel="Sửa dòng">
            <Ionicons name="create-outline" size={20} color="#6b7280" />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8} className="p-2" accessibilityLabel="Xoá dòng">
            <Ionicons name="trash-outline" size={20} color="#b91c1c" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
