import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DraftLine } from '../types';
import { convertToBase, formatQtyWithUnit } from '../unit-convert';
import { formatVND } from '../format';
import { SwipeToAction } from '../../../components/SwipeToAction';

type Tone = 'nhap' | 'ban' | 'kiem_ke' | 'neutral';

type Props = {
  line: DraftLine;
  onRemove: () => void;
  warning?: string | null;
  /** Tone icon theo loại chứng từ — nhập green, bán amber, kiểm blue. */
  tone?: Tone;
  /** Cho sửa đơn giá tại dòng — chỉ luồng bán truyền. */
  onEditGia?: () => void;
};

const TONE_STYLES: Record<Tone, { bg: string; color: string }> = {
  nhap: { bg: 'bg-green-100', color: '#166534' },
  ban: { bg: 'bg-amber-100', color: '#92400e' },
  kiem_ke: { bg: 'bg-blue-50', color: '#1e40af' },
  neutral: { bg: 'bg-neutral-100', color: '#6b7280' },
};

export function LineEditor({ line, onRemove, warning, tone = 'neutral', onEditGia }: Props) {
  const toneStyle = TONE_STYLES[tone];
  const { primary, caption } = formatQtyWithUnit(line.soLuong, line.donVi, {
    donViCoBan: line.donViCoBan,
    donViLon: line.donViLon,
    heSoQuyDoi: line.heSoQuyDoi,
  });
  // Đơn giá luôn tính theo đơn vị cơ bản — quy đổi theo line.donVi, không suy từ caption.
  const amount = line.donGia
    ? line.donGia * convertToBase(line.soLuong, line.donVi, { heSoQuyDoi: line.heSoQuyDoi })
    : 0;

  // Vuốt phải→trái trên dòng → lộ nút Xoá đỏ (thay nút thùng rác inline cũ).
  // Cha (WizardSection `bleed`) KHÔNG padding ngang → nút hidden action 80px
  // bên phải có chỗ lộ ra không bị clip. `bg-white` để phủ hoàn toàn nút Xoá
  // khi row ở trạng thái nghỉ; `px-4` cho content padding riêng (thay padding
  // WizardSection đã bỏ).
  return (
    <SwipeToAction
      actions={[
        { key: 'xoa', label: 'Xoá', icon: 'trash-outline', bg: 'bg-red-600', onPress: onRemove },
      ]}
    >
      <View className="px-4 py-3 border-b border-border bg-white">
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
            {line.donGia || onEditGia ? (
              <Pressable
                onPress={onEditGia}
                disabled={!onEditGia}
                hitSlop={onEditGia ? 10 : undefined}
                className="flex-row items-center mt-1 self-start"
                accessibilityRole={onEditGia ? 'button' : undefined}
                accessibilityLabel={onEditGia ? `Sửa đơn giá ${line.tenSku}` : undefined}
              >
                <Text className="text-caption text-primary font-semibold">
                  {formatVND(amount)}
                  {line.donGia ? (
                    <Text className="text-small text-ink-muted font-normal">
                      {'  '}({formatVND(line.donGia)}/{line.donViCoBan})
                    </Text>
                  ) : null}
                </Text>
                {onEditGia ? (
                  <Ionicons
                    name="pencil-outline"
                    size={14}
                    color="#dd1c2e"
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
              </Pressable>
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
        </View>
      </View>
    </SwipeToAction>
  );
}
