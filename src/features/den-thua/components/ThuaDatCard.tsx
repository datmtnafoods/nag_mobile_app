import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThuaDatKemHo } from '../types';
import { formatDate } from '../../vat-tu/format';

const STATUS_META = {
  pending: { nhan: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { nhan: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { nhan: 'Bị từ chối', bg: 'bg-red-50', text: 'text-red-700' },
} as const;

type Props = {
  thua: ThuaDatKemHo;
  /** Khoảng cách tới điểm đang đứng (m) — chỉ có ở nhóm "gần đây". */
  khoangCachM?: number;
  onPress?: () => void;
};

export function ThuaDatCard({ thua, khoangCachM, onPress }: Props) {
  const meta = STATUS_META[thua.status];
  const Container: React.ElementType = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      className="rounded-card bg-white border border-border p-4 mb-3 active:bg-bg-soft"
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-body text-ink font-semibold">
            {thua.tenHo ?? 'Chưa gán nông hộ'}
          </Text>
          <Text className="text-caption text-ink-muted font-mono mt-0.5">{thua.id}</Text>
        </View>
        <View className="items-end">
          <View className={`rounded-input px-2 py-1 ${meta.bg}`}>
            <Text className={`text-small font-semibold ${meta.text}`}>{meta.nhan}</Text>
          </View>
          {/* Badge cảnh báo thửa mồ côi — nhắc KTV gán hộ sau. Xuất hiện dưới
              chip status, không phá layout list. */}
          {!thua.partyId ? (
            <View className="rounded-input px-2 py-1 bg-red-50 border border-red-200 mt-1 flex-row items-center">
              <Ionicons name="warning-outline" size={12} color="#b91c1c" />
              <Text className="text-small font-semibold text-red-700 ml-1">Chưa gán hộ</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center flex-wrap">
        {thua.cropName ? (
          <View className="flex-row items-center mr-3">
            <Ionicons name="leaf-outline" size={14} color="#166534" />
            <Text className="text-caption text-ink ml-1">{thua.cropName}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center mr-3">
          <Ionicons name="resize-outline" size={14} color="#6b7280" />
          <Text className="text-caption text-ink-muted ml-1">
            {thua.areaHa.toLocaleString('vi-VN')} ha
          </Text>
        </View>
        {thua.dienThoaiHo ? (
          <View className="flex-row items-center">
            <Ionicons name="call-outline" size={14} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-1">{thua.dienThoaiHo}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-border">
        <Text className="text-small text-ink-muted">Lập {formatDate(thua.createdAt)}</Text>
        {khoangCachM !== undefined ? (
          <Text className="text-small text-amber-800 font-semibold">
            Cách đây ~{khoangCachM} m
          </Text>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        ) : null}
      </View>
    </Container>
  );
}
