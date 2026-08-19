import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPlot } from '../../src/api/erp/growing-areas';
import { listMocDaXacNhan, xacNhanMoc, huyXacNhanMoc } from '../../src/api/erp/canh-tac';
import { listNhatKy } from '../../src/api/erp/nhat-ky';
import { apiErrorMessage } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DateField } from '../../src/components/DateField';
import { ErrorState } from '../../src/components/ErrorState';
import { TimelineCanhTac } from '../../src/features/den-thua/components/TimelineCanhTac';
import { LOAI_NHAT_KY_META } from '../../src/features/den-thua/components/LoaiNhatKyChips';
import {
  chiSoMocHienTai,
  lechNgay,
  nhanDangCayTrong,
  tinhMocCanhTac,
} from '../../src/features/den-thua/lich-canh-tac';
import type { MocCanhTac } from '../../src/features/den-thua/types';
import { formatDate, formatDateTime } from '../../src/features/vat-tu/format';

const STATUS_META = {
  pending: { nhan: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-800' },
  approved: { nhan: 'Đã duyệt', bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { nhan: 'Bị từ chối', bg: 'bg-red-50', text: 'text-red-700' },
} as const;

function isoNgay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ChiTietThua() {
  const params = useLocalSearchParams<{ id?: string }>();
  const plotId = typeof params.id === 'string' ? params.id : '';
  const qc = useQueryClient();

  const [mocDangMo, setMocDangMo] = useState<MocCanhTac | null>(null);
  const [ngayNhap, setNgayNhap] = useState<string | undefined>();
  const [ghiChuNhap, setGhiChuNhap] = useState('');

  const thuaQuery = useQuery({
    queryKey: ['thua', plotId],
    queryFn: () => getPlot(plotId),
    enabled: Boolean(plotId),
  });
  const xacNhanQuery = useQuery({
    queryKey: ['moc-canh-tac', plotId],
    queryFn: () => listMocDaXacNhan(plotId),
    enabled: Boolean(plotId),
  });
  const nhatKyQuery = useQuery({
    queryKey: ['nhat-ky', plotId],
    queryFn: () => listNhatKy({ plotId }),
    enabled: Boolean(plotId),
  });

  const thua = thuaQuery.data;
  const lich = useMemo(() => nhanDangCayTrong(thua?.cropName), [thua?.cropName]);

  /** Mốc theo lịch, gắn ngày thực tế KTV đã xác nhận. */
  const mocs = useMemo<MocCanhTac[]>(() => {
    if (!thua?.ngayGoc || !lich) return [];
    const daXacNhan = new Map((xacNhanQuery.data ?? []).map((m) => [m.mocId, m]));
    return tinhMocCanhTac(thua.ngayGoc, lich).map((m) => {
      const xn = daXacNhan.get(m.id);
      return xn ? { ...m, ngayThucTe: xn.ngayThucTe, ghiChu: xn.ghiChu } : m;
    });
  }, [thua?.ngayGoc, lich, xacNhanQuery.data]);

  const idxHienTai = useMemo(() => chiSoMocHienTai(mocs), [mocs]);

  const luuMoc = useMutation({
    mutationFn: () => {
      if (!mocDangMo || !ngayNhap) throw new Error('Chọn ngày thực tế.');
      return xacNhanMoc({
        plotId,
        mocId: mocDangMo.id,
        ngayThucTe: new Date(ngayNhap).toISOString(),
        ghiChu: ghiChuNhap,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moc-canh-tac', plotId] });
      dongSheet();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  const boMoc = useMutation({
    mutationFn: () => huyXacNhanMoc(plotId, mocDangMo!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moc-canh-tac', plotId] });
      dongSheet();
    },
    onError: (err) => Alert.alert('Lỗi', apiErrorMessage(err)),
  });

  const moSheet = (m: MocCanhTac) => {
    setMocDangMo(m);
    setNgayNhap(isoNgay(m.ngayThucTe ?? m.ngayDuKien));
    setGhiChuNhap(m.ghiChu ?? '');
  };
  const dongSheet = () => {
    setMocDangMo(null);
    setNgayNhap(undefined);
    setGhiChuNhap('');
  };

  if (thuaQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (thuaQuery.isError || !thua) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
        <ErrorState
          message={thuaQuery.error ? apiErrorMessage(thuaQuery.error) : 'Không tìm thấy thửa đất'}
          onRetry={() => void thuaQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[thua.status];
  const mocTuongLai = mocDangMo ? new Date(mocDangMo.ngayDuKien) > new Date() : false;
  const lechXem = mocDangMo && ngayNhap ? lechNgay(mocDangMo.ngayDuKien, ngayNhap) : null;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: thua.tenHo ?? 'Thửa đất' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Thông tin thửa */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 pr-2">
              <Text className="text-h2 text-ink">{thua.tenHo ?? 'Chưa rõ nông hộ'}</Text>
              <Text className="text-caption text-ink-muted font-mono mt-0.5">{thua.id}</Text>
            </View>
            <View className={`rounded-input px-2 py-1 ${meta.bg}`}>
              <Text className={`text-small font-semibold ${meta.text}`}>{meta.nhan}</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap mt-1">
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
          {thua.ngayGoc ? (
            <Text className="text-small text-ink-muted mt-2">
              Bắt đầu trồng: {formatDate(thua.ngayGoc)}
            </Text>
          ) : null}
        </View>

        {/* Timeline canh tác */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted uppercase mb-2">Lịch canh tác</Text>
          {!lich ? (
            <Text className="text-caption text-ink-muted">
              Chưa có lịch canh tác cho cây {thua.cropName ? `"${thua.cropName}"` : 'này'}. Vẫn
              ghi nhật ký bình thường được.
            </Text>
          ) : !thua.ngayGoc ? (
            <Text className="text-caption text-amber-800">
              Thửa chưa có ngày bắt đầu trồng nên chưa dựng được lịch.
            </Text>
          ) : (
            <>
              <TimelineCanhTac mocs={mocs} hienTai={idxHienTai} onPressMoc={moSheet} />
              <Text className="text-small text-ink-muted mt-2">
                Chạm vào mốc để xác nhận đã xảy ra.
              </Text>
            </>
          )}
        </View>

        {/* Nhật ký */}
        <View className="rounded-card bg-white border border-border p-4 mb-4">
          <Text className="text-caption text-ink-muted uppercase mb-2">
            Nhật ký gần đây ({nhatKyQuery.data?.length ?? 0})
          </Text>
          {(nhatKyQuery.data ?? []).length === 0 ? (
            <Text className="text-caption text-ink-muted">Chưa có ghi chép nào.</Text>
          ) : (
            (nhatKyQuery.data ?? []).slice(0, 5).map((n) => {
              const lm = LOAI_NHAT_KY_META[n.loai];
              return (
                <View key={n.id} className="py-2 border-b border-border">
                  <View className="flex-row items-center">
                    <Ionicons name={lm.icon} size={14} color={lm.mau} />
                    <Text className="text-caption text-ink font-semibold ml-1 flex-1">
                      {lm.nhan}
                    </Text>
                    <Text className="text-small text-ink-muted">{formatDateTime(n.taoLuc)}</Text>
                  </View>
                  {n.moTa ? (
                    <Text className="text-small text-ink-muted mt-1">{n.moTa}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <Button
          label="Ghi nhật ký canh tác"
          onPress={() =>
            router.push(
              `/thua/nhat-ky?plotId=${thua.id}&partyId=${thua.partyId}&tenHo=${encodeURIComponent(thua.tenHo ?? '')}` as never,
            )
          }
        />
      </ScrollView>

      {/* Sheet xác nhận mốc */}
      <Modal
        visible={mocDangMo != null}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={dongSheet}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="bg-white rounded-t-frame p-4 pb-6">
            <View className="items-center mb-2">
              <View className="h-1 w-12 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-h2 text-ink">{mocDangMo?.nhan}</Text>
            <Text className="text-caption text-ink-muted mt-1 mb-3">
              Dự kiến {mocDangMo ? formatDate(mocDangMo.ngayDuKien) : ''}
            </Text>

            {mocTuongLai ? (
              <View className="rounded-input bg-neutral-100 p-3 mb-3">
                <Text className="text-caption text-ink-muted">
                  Mốc này chưa tới hạn nên chưa xác nhận được. Quay lại khi đã làm xong.
                </Text>
              </View>
            ) : (
              <>
                <DateField
                  label="Thực tế xảy ra ngày"
                  value={ngayNhap}
                  onChange={setNgayNhap}
                  maximumDate={new Date()}
                />
                {lechXem != null && lechXem !== 0 ? (
                  <Text
                    className={`text-small -mt-2 mb-2 ${
                      lechXem > 0 ? 'text-amber-800' : 'text-green-700'
                    }`}
                  >
                    {lechXem > 0
                      ? `Muộn ${lechXem} ngày so với lịch`
                      : `Sớm ${-lechXem} ngày so với lịch`}
                  </Text>
                ) : null}
                <Input
                  label="Ghi chú"
                  placeholder="Ví dụ: mưa kéo dài nên thu muộn"
                  multiline
                  numberOfLines={3}
                  value={ghiChuNhap}
                  onChangeText={setGhiChuNhap}
                />
              </>
            )}

            <View className="flex-row gap-2 mt-1">
              <View className="flex-1">
                <Button label="Đóng" variant="secondary" onPress={dongSheet} />
              </View>
              {!mocTuongLai ? (
                <View className="flex-1">
                  <Button
                    label={mocDangMo?.ngayThucTe ? 'Cập nhật' : 'Xác nhận'}
                    loading={luuMoc.isPending}
                    disabled={!ngayNhap || luuMoc.isPending}
                    onPress={() => luuMoc.mutate()}
                  />
                </View>
              ) : null}
            </View>

            {mocDangMo?.ngayThucTe ? (
              <Pressable
                onPress={() => boMoc.mutate()}
                className="mt-3 items-center py-2"
                accessibilityRole="button"
              >
                <Text className="text-caption text-red-700">Bỏ xác nhận mốc này</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
