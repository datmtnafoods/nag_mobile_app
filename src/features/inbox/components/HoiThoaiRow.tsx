import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HoiThoai } from '../types';
import { thoiGianTuongDoi } from '../thoiGian';
import { ACCENT, ICON } from '../../../theme/tokens';

type Props = { hoiThoai: HoiThoai; onPress: () => void };

/** Row danh sách hội thoại: avatar theo loại đối tác + preview tin cuối + thời gian + badge chưa đọc. */
export function HoiThoaiRow({ hoiThoai, onPress }: Props) {
  const accent = hoiThoai.kind === 'htx' ? ACCENT['xanh-la'] : ACCENT['ho-phach'];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trò chuyện với ${hoiThoai.ten}${
        hoiThoai.chuaDoc > 0 ? `, ${hoiThoai.chuaDoc} tin chưa đọc` : ''
      }`}
      className="rounded-card bg-white border border-border p-3 mb-2 flex-row items-center active:bg-bg-soft"
    >
      <View className={`h-11 w-11 rounded-full items-center justify-center mr-3 ${accent.bg}`}>
        <Ionicons
          name={hoiThoai.kind === 'htx' ? 'people' : 'person'}
          size={ICON.vua}
          color={accent.icon}
        />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-body text-ink font-semibold flex-1" numberOfLines={1}>
            {hoiThoai.ten}
          </Text>
          {hoiThoai.tinCuoiLuc ? (
            <Text className="text-small text-ink-soft ml-2">
              {thoiGianTuongDoi(hoiThoai.tinCuoiLuc)}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center justify-between mt-0.5">
          <Text className="text-caption text-ink-muted flex-1" numberOfLines={1}>
            {hoiThoai.tinCuoi ?? 'Chưa có tin nhắn'}
          </Text>
          {hoiThoai.chuaDoc > 0 ? (
            <View className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center">
              <Text className="text-small text-white font-bold">{hoiThoai.chuaDoc}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
