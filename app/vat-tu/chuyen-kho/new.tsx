import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { createKeHoach } from '../../../src/api/erp/phieu-chuyen';
import { taoKhoTam } from '../../../src/api/erp/warehouse';
import { apiErrorMessage, laLoiMang } from '../../../src/api/client';
import { usePermissions, useAuthStore } from '../../../src/auth/store';
import { canLapPhieuChuyen, permsForVatTu } from '../../../src/features/vat-tu/perms';
import { formatQty } from '../../../src/features/vat-tu/format';
import { useKhoList } from '../../../src/features/vat-tu/useKhoList';
import { KhoTamQuickCreateModal } from '../../../src/features/vat-tu/components/KhoTamQuickCreateModal';
import { useKhoTamQueueStore } from '../../../src/stores/kho-tam-queue';
import { useIsOnline } from '../../../src/hooks/useIsOnline';
import { usePhieuChuyenDraftStore } from '../../../src/stores/phieu-chuyen-draft';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { LineEditor } from '../../../src/features/vat-tu/components/LineEditor';
import { ImagePickerRow } from '../../../src/features/vat-tu/components/ImagePickerRow';
import { WizardSection } from '../../../src/features/vat-tu/components/WizardSection';
import { MAX_ANH_PHIEU } from '../../../src/features/vat-tu/anh';
import { ViTriBadge } from '../../../src/features/location/components/ViTriBadge';
import { useDeviceLocation } from '../../../src/hooks/useDeviceLocation';
import type { LoaiXe } from '../../../src/features/vat-tu/types';
import { KhoIcon } from '../../../src/features/vat-tu/components/KhoIcon';

export default function NewChuyenKho() {
  const permissions = usePermissions();
  const perms = permsForVatTu(permissions);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const qc = useQueryClient();

  const {
    khoNguonId,
    khoDichId,
    lines,
    ghiChu,
    anh,
    setKhoNguon,
    setKhoDich,
    swapKho,
    setGhiChu,
    setAnh,
    setViTri,
    removeLine,
    reset,
    totalBaseQuantity,
    toCreateBody,
  } = usePhieuChuyenDraftStore();

  const {
    state: viTriState,
    viTri: viTriDo,
    loi: viTriLoi,
    canAskAgain: viTriCanAsk,
    layViTri,
  } = useDeviceLocation({ auto: true });

  useEffect(() => {
    if (viTriDo) setViTri(viTriDo);
  }, [viTriDo, setViTri]);

  const { khos, isPending: khoPending } = useKhoList();
  const online = useIsOnline();
  const [khoModal, setKhoModal] = useState(false);

  // Nới phạm vi (trung chuyển): NGUỒN + ĐÍCH đều mở cho MỌI kho (tổng/trạm/xe).
  // Kho xe/tạm được làm nguồn để chuyển tiếp hàng sang kho khác (hàng đang trên
  // xe = in-transit, chưa giao tới kho khác); đích không còn bó "xe của tôi".
  // Ràng buộc nguồn ≠ đích giữ ở `trungKho` + `toCreateBody` + DB CHECK.
  const khoNguonList = khos;
  const khoDichList = khos;

  const khoNguon = khos.find((k) => k.id === khoNguonId);
  const khoDich = khos.find((k) => k.id === khoDichId);

  // Tạo kho tạm (xe) ngay tại chỗ — "thử-rồi-lùi" như `giaiQuyetHo`: online thì
  // POST thẳng lấy id thật; mất mạng thì xếp hàng đợi (tempId) sync sau.
  const taoKho = useMutation({
    mutationFn: async ({ ten, loaiXe }: { ten: string; loaiXe: LoaiXe }): Promise<string> => {
      if (!userId) throw new Error('Chưa đăng nhập.');
      const custodianName = user?.name;
      if (online === false) {
        return useKhoTamQueueStore
          .getState()
          .enqueue({ ten, loaiXe, custodianUserId: userId, custodianName });
      }
      try {
        const kho = await taoKhoTam({ ten, loaiXe, custodianUserId: userId, custodianName });
        return kho.id;
      } catch (err) {
        if (laLoiMang(err)) {
          return useKhoTamQueueStore
            .getState()
            .enqueue({ ten, loaiXe, custodianUserId: userId, custodianName });
        }
        throw err;
      }
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['kho', 'list'] });
      setKhoDich(id);
      setKhoModal(false);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const body = toCreateBody();
      if (!body) throw new Error('Phiếu chưa đủ thông tin');
      return createKeHoach(body);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['phieu-chuyen'] });
      reset();
      router.replace(`/vat-tu/chuyen-kho/${result.id}` as never);
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  // Nguồn HOẶC đích là kho tạm CHƯA đồng bộ (id 'LOCAL-KHO-…') → chặn lập lệnh:
  // id tạm sẽ vỡ ở backend dù ở vế nào. Chờ `flushKhoQueue` chốt lên BE (cần mạng).
  const khoTam = Boolean(khoNguon?.dongBoTam) || Boolean(khoDich?.dongBoTam);
  const canSubmit =
    Boolean(khoNguonId) &&
    Boolean(khoDichId) &&
    khoNguonId !== khoDichId &&
    lines.length > 0 &&
    !khoTam;

  if (!canLapPhieuChuyen(perms)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6">
        <Ionicons name="lock-closed-outline" size={48} color="#dd1c2e" />
        <Text className="text-h2 text-ink mt-3">Không có quyền</Text>
        <Text className="text-body text-ink-muted text-center mt-2">
          Bạn không có quyền lập lệnh chuyển kho (cần <Text className="font-mono">kho:chuyen</Text>).
        </Text>
      </SafeAreaView>
    );
  }

  const trungKho = Boolean(khoNguonId && khoDichId && khoNguonId === khoDichId);

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Lập lệnh chuyển',
          headerRight: () =>
            lines.length > 0 || khoNguonId || khoDichId ? (
              <Pressable
                onPress={() =>
                  Alert.alert('Xoá nội dung đang soạn?', 'Toàn bộ kho + dòng hàng sẽ bị xoá.', [
                    { text: 'Không', style: 'cancel' },
                    { text: 'Xoá', style: 'destructive', onPress: () => reset() },
                  ])
                }
                hitSlop={8}
                style={{ paddingHorizontal: 4 }}
              >
                <Text className="text-primary font-semibold">Xoá</Text>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <WizardSection
            title="1 · Kho nguồn → Kho đích"
            right={
              khoNguonId && khoDichId ? (
                <Pressable
                  onPress={swapKho}
                  hitSlop={8}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Đảo kho nguồn và kho đích"
                >
                  <Ionicons name="swap-horizontal" size={18} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">Đảo</Text>
                </Pressable>
              ) : null
            }
          >
            {khoPending ? (
              <ActivityIndicator color="#dd1c2e" />
            ) : (
              <>
                <Text className="text-caption text-ink-muted mb-1">Nguồn</Text>
                <View className="flex-row flex-wrap">
                  {khoNguonList.map((k) => {
                    const active = khoNguonId === k.id;
                    const xeNguoiKhac = k.loai === 'xe' && k.custodianUserId !== userId;
                    return (
                      <Pressable
                        key={k.id}
                        onPress={() => setKhoNguon(active ? undefined : k.id)}
                        className={`h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border ${
                          active ? 'bg-primary border-primary' : 'bg-white border-border'
                        }`}
                      >
                        <KhoIcon kho={k} active={active} />
                        <Text
                          className={`text-caption font-semibold ${
                            active ? 'text-white' : 'text-ink'
                          }`}
                        >
                          {k.ten}
                          {xeNguoiKhac ? ' *' : ''}
                        </Text>
                        {k.dongBoTam ? (
                          <View className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100">
                            <Text className="text-[10px] text-amber-800 font-semibold">
                              chưa đồng bộ
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="text-caption text-ink-muted mt-2 mb-1">Đích</Text>
                <View className="flex-row flex-wrap">
                  {khoDichList.map((k) => {
                    const active = khoDichId === k.id;
                    const xeNguoiKhac = k.loai === 'xe' && k.custodianUserId !== userId;
                    return (
                      <Pressable
                        key={k.id}
                        onPress={() => setKhoDich(active ? undefined : k.id)}
                        className={`h-10 mr-2 mb-2 px-3 rounded-input flex-row items-center border ${
                          active ? 'bg-primary border-primary' : 'bg-white border-border'
                        }`}
                      >
                        <KhoIcon kho={k} active={active} />
                        <Text
                          className={`text-caption font-semibold ${
                            active ? 'text-white' : 'text-ink'
                          }`}
                        >
                          {k.ten}
                          {xeNguoiKhac ? ' *' : ''}
                        </Text>
                        {k.dongBoTam ? (
                          <View className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100">
                            <Text className="text-[10px] text-amber-800 font-semibold">
                              chưa đồng bộ
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => setKhoModal(true)}
                  className="h-10 self-start px-3 mb-1 rounded-input flex-row items-center border border-dashed border-primary bg-primary/5"
                  accessibilityRole="button"
                  accessibilityLabel="Tạo kho tạm trên xe"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#dd1c2e" />
                  <Text className="text-caption text-primary ml-1 font-semibold">
                    Tạo kho tạm (xe)
                  </Text>
                </Pressable>
                <Text className="text-[11px] text-ink-soft mt-0.5">* = xe của người khác</Text>
                {khoTam ? (
                  <Text className="text-caption text-amber-700 mt-1">
                    Kho tạm chưa đồng bộ — cần mạng để chốt lên hệ thống trước khi lập lệnh.
                  </Text>
                ) : null}
                {trungKho ? (
                  <Text className="text-caption text-red-700 mt-1">
                    Kho nguồn và đích phải khác nhau.
                  </Text>
                ) : null}
              </>
            )}
          </WizardSection>

          <WizardSection
            title="2 · Dòng hàng"
            bleed
            right={
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/vat-tu/sku-picker',
                    // khoId nguồn → picker hiện tồn tại kho xuất.
                    params: { addToChuyen: '1', ...(khoNguonId ? { khoId: khoNguonId } : {}) },
                  } as never)
                }
                hitSlop={8}
                className="flex-row items-center"
              >
                <Ionicons name="add-circle" size={20} color="#dd1c2e" />
                <Text className="text-caption text-primary ml-1 font-semibold">Thêm</Text>
              </Pressable>
            }
          >
            {lines.length === 0 ? (
              <View className="py-6 items-center">
                <Ionicons name="cube-outline" size={36} color="#d1d5db" />
                <Text className="text-caption text-ink-muted mt-2">Chưa có dòng hàng</Text>
              </View>
            ) : (
              lines.map((line, idx) => (
                <LineEditor
                  key={`${line.vatTuId}-${line.lo ?? ''}-${idx}`}
                  line={line}
                  tone="neutral"
                  onRemove={() =>
                    Alert.alert('Xoá dòng?', line.tenSku, [
                      { text: 'Huỷ', style: 'cancel' },
                      { text: 'Xoá', style: 'destructive', onPress: () => removeLine(idx) },
                    ])
                  }
                />
              ))
            )}
          </WizardSection>

          <WizardSection title="3 · Ảnh bằng chứng + vị trí">
            <ImagePickerRow images={anh} onChange={setAnh} maxCount={MAX_ANH_PHIEU} />
            <View className="mt-3 pt-3 border-t border-border">
              <ViTriBadge
                state={viTriState}
                viTri={viTriDo}
                loi={viTriLoi}
                canAskAgain={viTriCanAsk}
                onRetry={() => void layViTri()}
              />
            </View>
          </WizardSection>

          <WizardSection title="4 · Ghi chú">
            <Input
              placeholder="Ghi chú thêm..."
              multiline
              numberOfLines={3}
              value={ghiChu ?? ''}
              onChangeText={(v) => setGhiChu(v || undefined)}
            />
          </WizardSection>

          <View className="rounded-card p-4 bg-blue-600">
            <View className="flex-row items-center justify-between">
              <Text className="text-white/80 text-caption">Tổng số lượng (đơn vị cơ bản)</Text>
              <Text className="text-white text-body font-semibold">
                {formatQty(totalBaseQuantity())}
              </Text>
            </View>
            {khoNguon && khoDich ? (
              <View className="flex-row items-center mt-3 pt-3 border-t border-white/20">
                <Text className="text-white/80 text-caption">{khoNguon.ten}</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginHorizontal: 8 }} />
                <Text className="text-white text-caption font-semibold flex-1">{khoDich.ten}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Lập lệnh (chưa xuất kho)"
            disabled={!canSubmit || submit.isPending}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
          <Text className="text-caption text-ink-muted mt-2 text-center">
            Bước tiếp: bấm "Xác nhận xuất" ở màn chi tiết để hàng đi khỏi kho nguồn.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <KhoTamQuickCreateModal
        visible={khoModal}
        submitting={taoKho.isPending}
        onDismiss={() => setKhoModal(false)}
        onSubmit={(input) => taoKho.mutate(input)}
      />
    </SafeAreaView>
  );
}
