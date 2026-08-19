import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ViTri, ViTriState } from '../types';

type Props = {
  state: ViTriState;
  viTri: ViTri | null;
  loi?: string | null;
  canAskAgain?: boolean;
  onRetry: () => void;
};

function formatDoChinhXac(m?: number): string {
  if (!Number.isFinite(m)) return '';
  const v = Math.round(m as number);
  return ` · ±${v} m`;
}

/**
 * Dòng trạng thái định vị trong wizard lập phiếu.
 * Toạ độ là TUỲ CHỌN — badge này chỉ báo tin, không bao giờ chặn submit.
 */
export function ViTriBadge({ state, viTri, loi, canAskAgain = true, onRetry }: Props) {
  const isDenied = state === 'tu-choi';
  const needsSettings = isDenied && !canAskAgain;

  const tone =
    state === 'co'
      ? { bg: 'bg-green-100', text: 'text-green-800', icon: 'location' as const, color: '#166534' }
      : state === 'dang-lay'
        ? { bg: 'bg-neutral-100', text: 'text-neutral-700', icon: 'location-outline' as const, color: '#6b7280' }
        : { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'location-outline' as const, color: '#92400e' };

  return (
    <View>
      <View className="flex-row items-center">
        <View className={`flex-1 flex-row items-center rounded-input px-3 py-2 ${tone.bg}`}>
          {state === 'dang-lay' ? (
            <ActivityIndicator size="small" color="#6b7280" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name={tone.icon} size={16} color={tone.color} style={{ marginRight: 8 }} />
          )}
          <Text className={`text-caption font-semibold ${tone.text}`} numberOfLines={1}>
            {state === 'dang-lay'
              ? 'Đang định vị…'
              : state === 'co' && viTri
                ? `Đã định vị${formatDoChinhXac(viTri.doChinhXac)}`
                : 'Chưa có vị trí'}
          </Text>
        </View>

        {state !== 'dang-lay' && state !== 'co' ? (
          <Pressable
            onPress={needsSettings ? () => void Linking.openSettings() : onRetry}
            accessibilityRole="button"
            accessibilityLabel={needsSettings ? 'Mở Cài đặt' : 'Thử định vị lại'}
            className="ml-2 h-11 px-3 rounded-input border border-border bg-white items-center justify-center"
          >
            <Text className="text-caption text-ink font-semibold">
              {needsSettings ? 'Mở Cài đặt' : 'Thử lại'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {state === 'co' && viTri ? (
        <Text className="text-small text-ink-muted mt-1 font-mono">
          {viTri.lat.toFixed(5)}, {viTri.lng.toFixed(5)}
        </Text>
      ) : null}

      <Text className="text-small text-ink-muted mt-1">
        {isDenied
          ? 'Chưa cấp quyền vị trí — phiếu vẫn lưu được bình thường.'
          : state === 'loi' && loi
            ? loi
            : 'Toạ độ đính kèm phiếu để đối chiếu khi cần. Không bắt buộc.'}
      </Text>
    </View>
  );
}
