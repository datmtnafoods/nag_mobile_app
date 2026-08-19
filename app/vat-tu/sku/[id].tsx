import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  addMa,
  getVatTu,
  listLoai,
  removeMa,
  updateSku,
} from '../../../src/api/erp/catalog-supplies';
import { getMoves, listKho } from '../../../src/api/erp/warehouse';
import { apiErrorMessage } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { SkuThumbnail } from '../../../src/features/vat-tu/components/SkuThumbnail';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { MaChip } from '../../../src/features/vat-tu/components/MaChip';
import { KhoTonChip } from '../../../src/features/vat-tu/components/KhoTonChip';
import { TheKhoRow } from '../../../src/features/vat-tu/components/TheKhoRow';
import { formatVND, formatQty } from '../../../src/features/vat-tu/format';
import type { MaKieu, VatTu } from '../../../src/features/vat-tu/types';
import { useCurrentUser } from '../../../src/auth/store';
import { canManageCatalog, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { MAX_ANH_PER_SKU } from '../../../src/features/vat-tu/anh';

const MA_KIEU_OPTIONS: MaKieu[] = ['qr', 'barcode', 'datamatrix', 'khac'];

export default function SkuDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const user = useCurrentUser();
  const perms = permsForVatTu(user?.roles);
  const canManage = canManageCatalog(perms);
  const qc = useQueryClient();

  const [tab, setTab] = useState<'info' | 'desc'>('info');
  const [showAddMa, setShowAddMa] = useState(false);
  const [addMaValue, setAddMaValue] = useState('');
  const [addMaKieu, setAddMaKieu] = useState<MaKieu>('qr');
  const [addMaErr, setAddMaErr] = useState<string | null>(null);

  const skuQuery = useQuery({
    queryKey: ['vat-tu', 'one', id],
    queryFn: () => getVatTu(id),
    enabled: !!id,
  });
  const loaiQuery = useQuery({
    queryKey: ['vat-tu', 'loai'],
    queryFn: () => listLoai(),
    staleTime: 60_000,
  });
  const khoQuery = useQuery({
    queryKey: ['kho', 'list'],
    queryFn: () => listKho(),
    staleTime: 5 * 60_000,
  });
  const movesQuery = useQuery({
    queryKey: ['moves', { vatTuId: id }],
    queryFn: () => getMoves({ vatTuId: id }),
    enabled: !!id,
  });

  const skuMutation = useMutation({
    mutationFn: (patch: Partial<VatTu>) =>
      updateSku(id, {
        ten: patch.ten,
        loaiId: patch.loaiId,
        donViCoBan: patch.donViCoBan,
        donViLon: patch.donViLon,
        heSoQuyDoi: patch.heSoQuyDoi,
        moTa: patch.moTa,
        anh: patch.anh,
        giaBan: patch.giaBan,
        tonMin: patch.tonMin,
        tonMax: patch.tonMax,
        trangThai: patch.trangThai,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['vat-tu', 'one', id], data);
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const addMaMutation = useMutation({
    mutationFn: (input: { ma: string; kieu: MaKieu }) =>
      addMa(id, { ma: input.ma, kieu: input.kieu, nguon: 'tu_gan' }),
    onSuccess: (data) => {
      qc.setQueryData(['vat-tu', 'one', id], data);
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
      setShowAddMa(false);
      setAddMaValue('');
      setAddMaKieu('qr');
      setAddMaErr(null);
    },
    onError: (err) => setAddMaErr(apiErrorMessage(err)),
  });

  const removeMaMutation = useMutation({
    mutationFn: (ma: string) => removeMa(id, ma),
    onSuccess: (data) => {
      qc.setQueryData(['vat-tu', 'one', id], data);
      qc.invalidateQueries({ queryKey: ['vat-tu', 'list'] });
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const sku = skuQuery.data;
  const hasMoves = (movesQuery.data ?? []).length > 0;
  const loaiTen = useMemo(() => {
    const l = (loaiQuery.data ?? []).find((x) => x.id === sku?.loaiId);
    return l?.ten ?? sku?.loaiId ?? '';
  }, [loaiQuery.data, sku]);

  const perKhoStock = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movesQuery.data ?? []) {
      map.set(m.khoId, (map.get(m.khoId) ?? 0) + (m.huong === 'in' ? m.soLuong : -m.soLuong));
    }
    return map;
  }, [movesQuery.data]);

  const runningTotals = useMemo(() => {
    if (!movesQuery.data) return {};
    const sorted = [...movesQuery.data].sort((a, b) => a.taoLuc.localeCompare(b.taoLuc));
    const perKho: Record<string, number> = {};
    const result: Record<string, number> = {};
    for (const m of sorted) {
      perKho[m.khoId] = (perKho[m.khoId] ?? 0) + (m.huong === 'in' ? m.soLuong : -m.soLuong);
      result[m.id] = perKho[m.khoId]!;
    }
    return result;
  }, [movesQuery.data]);

  if (skuQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft items-center justify-center" edges={['bottom']}>
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (skuQuery.isError || !sku) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft items-center justify-center px-6" edges={['bottom']}>
        <Ionicons name="alert-circle-outline" size={48} color="#dd1c2e" />
        <Text className="text-body text-ink mt-3 text-center">
          {skuQuery.isError ? apiErrorMessage(skuQuery.error) : 'Không tìm thấy vật tư'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View className="rounded-card bg-white border border-border p-4">
          <View className="flex-row items-start">
            <View className="mr-3">
              <SkuThumbnail uri={sku.anh?.[0]} size={72} />
            </View>
            <View className="flex-1">
              <Text className="text-h2 text-ink">{sku.ten}</Text>
              <Text className="text-caption text-ink-muted font-mono mt-0.5">{sku.id}</Text>
              <Text className="text-caption text-ink-muted mt-1">
                {loaiTen} · {sku.donViCoBan}
                {sku.donViLon && sku.heSoQuyDoi
                  ? ` (1 ${sku.donViLon} = ${sku.heSoQuyDoi} ${sku.donViCoBan})`
                  : ''}
              </Text>
              {sku.giaBan ? (
                <Text className="text-body text-primary font-semibold mt-2">
                  {formatVND(sku.giaBan)}/{sku.donViCoBan}
                </Text>
              ) : null}
              {sku.trangThai === 'ngung' ? (
                <View className="self-start rounded-input bg-neutral-200 px-2 py-0.5 mt-2">
                  <Text className="text-small text-neutral-700">Ngừng KD</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white rounded-input border border-border mt-4 p-1">
          <Pressable
            onPress={() => setTab('info')}
            className={`flex-1 rounded-input py-2 items-center ${
              tab === 'info' ? 'bg-primary' : ''
            }`}
          >
            <Text
              className={`text-body font-semibold ${
                tab === 'info' ? 'text-white' : 'text-ink'
              }`}
            >
              Thông tin
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('desc')}
            className={`flex-1 rounded-input py-2 items-center ${
              tab === 'desc' ? 'bg-primary' : ''
            }`}
          >
            <Text
              className={`text-body font-semibold ${
                tab === 'desc' ? 'text-white' : 'text-ink'
              }`}
            >
              Mô tả
            </Text>
          </Pressable>
        </View>

        {tab === 'info' ? (
          <View className="mt-4">
            {/* Ảnh */}
            <View className="rounded-card bg-white border border-border p-4 mb-4">
              <Text className="text-caption text-ink-muted mb-2">
                Ảnh SKU ({sku.anh?.length ?? 0}/{MAX_ANH_PER_SKU})
              </Text>
              {canManage ? (
                <ImagePickerRow
                  images={sku.anh ?? []}
                  onChange={(next) => skuMutation.mutate({ anh: next })}
                  maxCount={MAX_ANH_PER_SKU}
                  showRepresentativeBadge
                />
              ) : (sku.anh?.length ?? 0) > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {(sku.anh ?? []).map((uri, i) => (
                    <SkuThumbnail key={i} uri={uri} size={70} />
                  ))}
                </View>
              ) : (
                <Text className="text-caption text-ink-muted">Chưa có ảnh</Text>
              )}
            </View>

            {/* Mã QR / barcode */}
            <View className="rounded-card bg-white border border-border p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-caption text-ink-muted">Mã QR / barcode</Text>
                {canManage ? (
                  <Pressable
                    onPress={() => setShowAddMa(true)}
                    className="flex-row items-center"
                    hitSlop={4}
                  >
                    <Ionicons name="add-circle" size={16} color="#dd1c2e" />
                    <Text className="text-caption text-primary font-semibold ml-1">Thêm mã</Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row flex-wrap">
                {sku.ma.map((m) => (
                  <MaChip
                    key={m.ma}
                    ma={m}
                    onRemove={
                      canManage && m.nguon !== 'he_thong'
                        ? () =>
                            Alert.alert('Xoá mã', `Xoá mã ${m.ma}?`, [
                              { text: 'Huỷ', style: 'cancel' },
                              {
                                text: 'Xoá',
                                style: 'destructive',
                                onPress: () => removeMaMutation.mutate(m.ma),
                              },
                            ])
                        : undefined
                    }
                  />
                ))}
              </View>
            </View>

            {/* Tồn theo kho */}
            <View className="rounded-card bg-white border border-border p-4 mb-4">
              <Text className="text-caption text-ink-muted mb-2">Tồn theo kho</Text>
              {(khoQuery.data ?? []).length ? (
                <View className="flex-row flex-wrap">
                  {(khoQuery.data ?? []).map((k) => (
                    <KhoTonChip
                      key={k.id}
                      khoTen={k.ten}
                      soLuong={perKhoStock.get(k.id) ?? 0}
                      donViCoBan={sku.donViCoBan}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-caption text-ink-muted">—</Text>
              )}
            </View>

            {/* Info form / read-only */}
            <View className="rounded-card bg-white border border-border p-4 mb-4">
              <Text className="text-caption text-ink-muted mb-2">Thông số</Text>
              <InfoRow label="Đơn vị cơ bản" value={sku.donViCoBan} />
              <InfoRow label="Đơn vị lớn" value={sku.donViLon ?? '—'} />
              <InfoRow
                label="Hệ số quy đổi"
                value={sku.heSoQuyDoi ? `${sku.heSoQuyDoi}` : '—'}
              />
              <InfoRow label="Giá bán" value={sku.giaBan ? formatVND(sku.giaBan) : '—'} />
              <InfoRow
                label="Định mức tồn"
                value={
                  sku.tonMin != null || sku.tonMax != null
                    ? `${sku.tonMin != null ? `min ${formatQty(sku.tonMin, sku.donViCoBan)}` : ''}${sku.tonMin != null && sku.tonMax != null ? ' · ' : ''}${sku.tonMax != null ? `max ${formatQty(sku.tonMax, sku.donViCoBan)}` : ''}`
                    : '—'
                }
              />
              {hasMoves ? (
                <Text className="text-small text-amber-800 mt-2">
                  Đơn vị của SỔ KHO — đã có {movesQuery.data?.length} dòng sổ thì không đổi được.
                </Text>
              ) : null}
            </View>

            {/* Thẻ kho */}
            <View className="rounded-card bg-white border border-border p-4">
              <Text className="text-caption text-ink-muted mb-2">
                Thẻ kho ({movesQuery.data?.length ?? 0} dòng gần nhất)
              </Text>
              {(movesQuery.data ?? []).slice(0, 20).map((m) => (
                <TheKhoRow
                  key={m.id}
                  move={m}
                  donViCoBan={sku.donViCoBan}
                  runningTotal={runningTotals[m.id]}
                />
              ))}
              {!(movesQuery.data ?? []).length ? (
                <Text className="text-caption text-ink-muted">Chưa có dòng sổ nào.</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View className="rounded-card bg-white border border-border p-4 mt-4">
            <Text className="text-caption text-ink-muted mb-2">Mô tả tự do</Text>
            {canManage ? (
              <Input
                multiline
                numberOfLines={12}
                placeholder="Hoạt chất / thời gian cách ly / số đăng ký / tiêu chuẩn xuất vườn..."
                value={sku.moTa ?? ''}
                onChangeText={(v) => skuMutation.mutate({ moTa: v })}
              />
            ) : (
              <Text className="text-body text-ink">
                {sku.moTa ?? 'Chưa có mô tả.'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal thêm mã QR */}
      <Modal
        visible={showAddMa}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMa(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="bg-white rounded-t-frame p-4 pb-6">
            <View className="items-center mb-2">
              <View className="h-1 w-12 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-h2 text-ink mb-3">Thêm mã QR / barcode</Text>
            <Input
              label="Mã"
              placeholder="Nhập mã hoặc quét"
              value={addMaValue}
              onChangeText={setAddMaValue}
              autoCapitalize="none"
            />
            <Text className="text-caption text-ink-muted mb-1">Kiểu</Text>
            <View className="flex-row flex-wrap mb-3">
              {MA_KIEU_OPTIONS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setAddMaKieu(k)}
                  className={`rounded-input mr-2 mb-1 px-3 py-1 border ${
                    addMaKieu === k
                      ? 'bg-primary border-primary'
                      : 'bg-white border-border'
                  }`}
                >
                  <Text
                    className={`text-caption font-semibold ${
                      addMaKieu === k ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {k.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            {addMaErr ? (
              <Text className="text-small text-red-600 mb-2">{addMaErr}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Pressable
                  onPress={() => setShowAddMa(false)}
                  className="h-button rounded-card border border-border items-center justify-center"
                >
                  <Text className="text-ink font-semibold">Huỷ</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Button
                  label="Lưu"
                  loading={addMaMutation.isPending}
                  disabled={!addMaValue.trim()}
                  onPress={() =>
                    addMaMutation.mutate({ ma: addMaValue.trim(), kieu: addMaKieu })
                  }
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-body text-ink-muted">{label}</Text>
      <Text className="text-body text-ink text-right flex-1 ml-3">{value}</Text>
    </View>
  );
}
