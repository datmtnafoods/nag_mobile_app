import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../../components/Input';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { FilterChip } from '../../../components/FilterChip';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { listVatTu } from '../../../api/erp/catalog-supplies';
import { listReceipts } from '../../../api/erp/warehouse';
import { apiErrorMessage } from '../../../api/client';
import { SkuRow } from '../../vat-tu/components/SkuRow';
import type { VatTu } from '../../vat-tu/types';
import type { LoaiNhatKy } from '../types';

/**
 * Sheet chọn vật tư (SKU) cho form nhật ký canh tác.
 *
 * TRADE-OFF chủ ý: KHÔNG tái dùng `app/vat-tu/sku-picker.tsx` — màn đó trả kết
 * quả về `receipt-draft.ts` (draft-store bán hàng), tái dùng buộc dựng draft-store
 * mới nhóm A cho form nhật ký + thêm nhánh param mới. Sheet Modal inline giữ
 * state form nguyên vẹn, không handoff, không draft.
 *
 * Logic riêng của form nhật ký (khác sku-picker bán hàng):
 * - Lọc mặc định theo loại nhật ký: `bon_phan` → `loai_phan_bon`,
 *   `phun_thuoc` → `loai_thuoc_bvtv`. FilterChip "Tất cả" để bỏ lọc.
 *   Lưu ý: 2 id loại này là seed mock (`vat-tu.mock.ts:18-22`); real backend có
 *   thể khác id — điểm phải đổi khi nối thật.
 * - Section ghim đầu list: SKU hộ đã mua gần đây (`listReceipts partyId+ban+ghi`),
 *   badge "Đã mua". Guard `p.dongHang` vì real rows PhieuHeader có thể thiếu
 *   snapshot dòng hàng — KHÔNG N+1 gọi `getReceipt` cho từng phiếu.
 */

type Props = {
  visible: boolean;
  loaiNhatKy: LoaiNhatKy | null;
  partyId?: string;
  daChon: string[]; // vatTuId đã chọn — để ẩn/disable trong list
  onChon: (sku: VatTu) => void;
  onDong: () => void;
};

/** Map loại nhật ký → loaiId SKU mặc định. Undefined = không lọc theo loại. */
function loaiIdMacDinh(loai: LoaiNhatKy | null): string | undefined {
  if (loai === 'bon_phan') return 'loai_phan_bon';
  if (loai === 'phun_thuoc') return 'loai_thuoc_bvtv';
  return undefined;
}

export function ChonVatTuSheet({ visible, loaiNhatKy, partyId, daChon, onChon, onDong }: Props) {
  const macDinh = loaiIdMacDinh(loaiNhatKy);
  const [q, setQ] = useState('');
  const [locTheoLoai, setLocTheoLoai] = useState<boolean>(true);
  const qDebounced = useDebouncedValue(q, 300);

  const loaiId = locTheoLoai ? macDinh : undefined;

  const dsQuery = useQuery({
    queryKey: ['vat-tu-picker-nk', { q: qDebounced, loaiId }],
    queryFn: () => listVatTu({ q: qDebounced, loaiId }),
    enabled: visible,
  });

  // Danh sách vatTuId hộ này đã mua gần đây, để sort + badge.
  const daMuaQuery = useQuery({
    queryKey: ['vat-tu-picker-nk-da-mua', partyId],
    // partyId undefined vẫn được — enabled guard bên dưới.
    queryFn: () =>
      listReceipts({
        kind: 'ban',
        partyId,
        status: 'ghi',
        pageSize: 20,
      }),
    enabled: visible && Boolean(partyId),
  });

  const idDaMua = useMemo(() => {
    const set = new Set<string>();
    for (const p of daMuaQuery.data?.data ?? []) {
      // Real rows có thể thiếu `dongHang` (PhieuHeader rút gọn); KHÔNG N+1
      // getReceipt — chấp nhận thiếu section này ở real mode cho tới khi BE
      // trả kèm snapshot dòng hàng ở list.
      if (p.kind !== 'ban' || !Array.isArray(p.dongHang)) continue;
      for (const d of p.dongHang) set.add(d.vatTuId);
    }
    return set;
  }, [daMuaQuery.data]);

  const daChonSet = useMemo(() => new Set(daChon), [daChon]);

  // Sort: SKU đã mua lên trước; giữ thứ tự tương đối trong mỗi nhóm.
  const dsSorted = useMemo(() => {
    const src = dsQuery.data ?? [];
    if (idDaMua.size === 0) return src;
    const daMua: VatTu[] = [];
    const con: VatTu[] = [];
    for (const s of src) (idDaMua.has(s.id) ? daMua : con).push(s);
    return [...daMua, ...con];
  }, [dsQuery.data, idDaMua]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDong}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-bg rounded-t-frame border-t border-border"
            style={{ maxHeight: '85%', minHeight: '60%' }}
          >
            {/* Header */}
            <View className="flex-row items-center px-4 pt-3 pb-2">
              <Text className="text-h2 text-ink font-semibold flex-1">Chọn vật tư</Text>
              <Pressable
                onPress={onDong}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={12}
                className="p-2"
              >
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <View className="px-4 pb-2">
              <Input
                placeholder="Tìm theo tên hoặc mã…"
                value={q}
                onChangeText={setQ}
                autoCorrect={false}
              />
              {macDinh ? (
                <View className="flex-row mt-2" style={{ gap: 8 }}>
                  <FilterChip
                    label={loaiNhatKy === 'phun_thuoc' ? 'Thuốc BVTV' : 'Phân bón'}
                    active={locTheoLoai}
                    onPress={() => setLocTheoLoai(true)}
                  />
                  <FilterChip
                    label="Tất cả"
                    active={!locTheoLoai}
                    onPress={() => setLocTheoLoai(false)}
                  />
                </View>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
            >
              {dsQuery.isLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color="#dd1c2e" />
                </View>
              ) : dsQuery.isError ? (
                <ErrorState
                  message={apiErrorMessage(dsQuery.error)}
                  onRetry={() => dsQuery.refetch()}
                />
              ) : dsSorted.length === 0 ? (
                <EmptyState
                  icon="cube-outline"
                  title="Không thấy vật tư nào"
                  message={
                    locTheoLoai && macDinh
                      ? 'Thử bỏ lọc theo loại hoặc gõ từ khoá khác.'
                      : 'Thử từ khoá khác.'
                  }
                />
              ) : (
                dsSorted.map((sku) => {
                  const daMua = idDaMua.has(sku.id);
                  const daThem = daChonSet.has(sku.id);
                  return (
                    <SkuRow
                      key={sku.id}
                      sku={sku}
                      onPress={daThem ? undefined : () => onChon(sku)}
                      right={
                        daThem ? (
                          <View className="rounded-input bg-neutral-100 px-2 py-0.5 ml-2">
                            <Text className="text-small text-ink-muted">Đã thêm</Text>
                          </View>
                        ) : daMua ? (
                          <View className="rounded-input bg-green-100 px-2 py-0.5 ml-2">
                            <Text className="text-small text-green-800 font-semibold">Đã mua</Text>
                          </View>
                        ) : undefined
                      }
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
