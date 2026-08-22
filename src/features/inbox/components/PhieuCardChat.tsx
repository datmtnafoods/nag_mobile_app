import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TinNhan } from '../types';
import { formatVND, formatDate } from '../../vat-tu/format';
import { ACCENT, ICON, MAU } from '../../../theme/tokens';

type Props = { tin: TinNhan; onPress: () => void };

/**
 * Card đính kèm hoá đơn / nhắc nợ trong chat. Render `phieu` snapshot có cấu
 * trúc (số tiền, ngày, mặt hàng); thiếu snapshot (tin cũ) → fallback `noiDung`.
 */
export function PhieuCardChat({ tin, onPress }: Props) {
  const laNhacNo = tin.loai === 'nhac_no';
  const accent = laNhacNo ? ACCENT['ho-phach'] : ACCENT['xanh-duong'];
  const nhan = laNhacNo ? 'Nhắc nợ' : 'Hoá đơn';
  const p = tin.phieu;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nhan}, mở phiếu ${tin.phieuId ?? ''}`}
      className={`max-w-[85%] rounded-card p-3 border ${accent.bg} ${accent.border}`}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={laNhacNo ? 'alert-circle-outline' : 'receipt-outline'}
          size={ICON.nho}
          color={accent.icon}
        />
        <Text className={`ml-1 font-semibold text-caption ${accent.text}`}>{nhan}</Text>
      </View>

      {p ? (
        <View className="mt-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-caption text-ink font-mono">{p.phieuId}</Text>
            <Text className="text-small text-ink-muted">{formatDate(p.ngay)}</Text>
          </View>
          <View className="flex-row items-baseline mt-1">
            <Text className="text-small text-ink-muted mr-1">
              {laNhacNo && p.conNo != null ? 'Còn nợ' : 'Tổng'}
            </Text>
            <Text
              className={`text-body font-bold ${
                laNhacNo && p.conNo != null ? 'text-primary' : 'text-ink'
              }`}
            >
              {formatVND(laNhacNo && p.conNo != null ? p.conNo : p.soTien)}
            </Text>
          </View>
          <Text className="text-small text-ink-muted mt-0.5" numberOfLines={1}>
            {p.soMatHang} mặt hàng{p.tenHangDau ? ` · ${p.tenHangDau}` : ''}
          </Text>
        </View>
      ) : (
        <Text className="text-caption text-ink mt-1">{tin.noiDung}</Text>
      )}

      {tin.phieuId ? (
        <View className="flex-row items-center mt-1.5">
          <Text className="text-small text-primary font-semibold">Mở phiếu</Text>
          <Ionicons name="chevron-forward" size={ICON.nho} color={MAU.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}
