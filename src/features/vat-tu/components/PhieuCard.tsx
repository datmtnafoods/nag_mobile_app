import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PhieuHeader } from '../types';
import {
  formatDate,
  formatQty,
  formatVND,
  RECEIPT_KIND_META,
  RECEIPT_STATUS_META,
  statusLabelForKind,
} from '../format';
import { KindBadge } from './KindBadge';

/** Border-left tone theo status + kind. */
function borderForPhieu(phieu: PhieuHeader): string {
  if (phieu.trangThai === 'ke_hoach') return 'border-amber-500';
  if (phieu.trangThai === 'huy') return 'border-red-400';
  return RECEIPT_KIND_META[phieu.kind].border;
}

/** Có "Sắp đến" khi phiếu tạm nhập có expectedOn ≤ 3 ngày. */
function upcomingExpected(phieu: PhieuHeader): boolean {
  if (phieu.kind !== 'nhap' || phieu.trangThai !== 'ke_hoach' || !phieu.expectedOn) return false;
  const d = new Date(phieu.expectedOn);
  if (Number.isNaN(d.getTime())) return false;
  const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff <= 3;
}

export function PhieuCard({ phieu, onPress }: { phieu: PhieuHeader; onPress: () => void }) {
  const kindMeta = RECEIPT_KIND_META[phieu.kind];
  const statusMeta = RECEIPT_STATUS_META[phieu.trangThai];
  const statusLabel = statusLabelForKind(phieu.trangThai, phieu.kind);
  const borderTone = borderForPhieu(phieu);
  const isUpcoming = upcomingExpected(phieu);
  const showAmount = phieu.kind !== 'kiem_ke';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${kindMeta.label} ${phieu.id}, ${statusLabel}`}
      accessibilityHint="Nhấn để xem chi tiết phiếu"
      className={`rounded-card bg-white border border-border border-l-4 ${borderTone} p-4 mb-3 active:bg-bg-soft`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-body text-ink font-semibold">{phieu.id}</Text>
          <Text className="text-caption text-ink-muted mt-0.5">
            {formatDate(phieu.taoLuc)}
            {phieu.partnerTen ? ` · ${phieu.partnerTen}` : ''}
          </Text>
        </View>
        <View className="items-end gap-y-1">
          <KindBadge kind={phieu.kind} small />
          <View className={`rounded-input px-2 py-0.5 ${statusMeta.bg}`}>
            <Text className={`text-small font-semibold ${statusMeta.text}`}>{statusLabel}</Text>
          </View>
          {isUpcoming ? (
            <View className="rounded-input bg-amber-100 border border-amber-300 px-2 py-0.5">
              <Text className="text-small text-amber-900 font-semibold">Sắp đến</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center mt-1">
        <Ionicons name="business-outline" size={14} color="#6b7280" />
        <Text className="text-caption text-ink-muted ml-1" numberOfLines={1}>
          {phieu.khoTen ?? phieu.khoId}
        </Text>
        {phieu.kind === 'nhap' && phieu.expectedOn ? (
          <>
            <Text className="text-caption text-ink-muted mx-1">·</Text>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-caption text-ink-muted ml-1">
              Dự kiến: {formatDate(phieu.expectedOn)}
            </Text>
          </>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
        <Text className="text-caption text-ink-muted">
          {phieu.kind === 'kiem_ke'
            ? `${phieu.dongKiem?.length ?? 0} dòng đếm`
            : `Tổng: ${formatQty(phieu.tongSoLuong)}`}
        </Text>
        {showAmount ? (
          <Text
            className={`text-body text-ink font-semibold ${
              phieu.trangThai === 'huy' ? 'line-through opacity-60' : ''
            }`}
          >
            {formatVND(phieu.tongTien)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
