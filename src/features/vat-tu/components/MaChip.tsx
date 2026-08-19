import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VatTuMa } from '../types';
import { formatMaKieuLabel, formatMaNguonLabel } from '../format';

type Props = {
  ma: VatTuMa;
  onRemove?: () => void;
};

const KIEU_ICON: Record<VatTuMa['kieu'], keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  qr: 'qr-code-outline',
  barcode: 'barcode-outline',
  datamatrix: 'grid-outline',
  khac: 'pricetag-outline',
};

const NGUON_TONE: Record<VatTuMa['nguon'], { bg: string; text: string }> = {
  nha_sx: { bg: 'bg-blue-50', text: 'text-blue-800' },
  tu_gan: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
  he_thong: { bg: 'bg-primary-50', text: 'text-primary-700' },
};

export function MaChip({ ma, onRemove }: Props) {
  const tone = NGUON_TONE[ma.nguon];
  const canRemove = onRemove && ma.nguon !== 'he_thong';
  return (
    <View
      className={`flex-row items-center rounded-input px-2 py-1 mb-1 mr-1 ${tone.bg}`}
    >
      <Ionicons
        name={KIEU_ICON[ma.kieu]}
        size={14}
        color="#374151"
        style={{ marginRight: 4 }}
      />
      <Text className={`text-small font-semibold ${tone.text}`} numberOfLines={1}>
        {ma.ma}
      </Text>
      <Text className={`text-small ${tone.text} ml-1`}>
        · {formatMaKieuLabel(ma.kieu)} · {formatMaNguonLabel(ma.nguon)}
      </Text>
      {canRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="ml-2"
          accessibilityRole="button"
          accessibilityLabel={`Xoá mã ${ma.ma}`}
        >
          <Ionicons name="close-circle" size={16} color="#6b7280" />
        </Pressable>
      ) : null}
    </View>
  );
}
