import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getParty, updateParty } from '../../../../src/api/erp/parties';
import { apiErrorMessage } from '../../../../src/api/client';
import { Button } from '../../../../src/components/Button';
import { Input } from '../../../../src/components/Input';
import { DateField } from '../../../../src/components/DateField';
import { DiaChiField } from '../../../../src/features/location/components/DiaChiField';
import { ErrorState } from '../../../../src/components/ErrorState';
import { GENDER_LABELS } from '../../../../src/features/orders/types';

const PHONE_RE = /^(0[3-9]\d{8}|\+84[3-9]\d{8})$/;

/**
 * Sửa nhanh hồ sơ hộ: tên/SĐT/địa chỉ/CCCD/ngày sinh/giới tính/ghi chú.
 * SĐT: THÊM số mới (không xoá số cũ). Xoá SĐT / đổi ảnh CCCD chưa hỗ trợ ở GĐ này.
 */
export default function SuaNongHo() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const partyId = typeof id === 'string' ? id : '';
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['party', partyId],
    queryFn: () => getParty(partyId),
    enabled: Boolean(partyId),
  });

  const [ten, setTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [namSinh, setNamSinh] = useState<string | undefined>(undefined);
  const [gioiTinh, setGioiTinh] = useState<'nam' | 'nu' | undefined>(undefined);
  const [soCccd, setSoCccd] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [daNap, setDaNap] = useState(false);

  // Nạp giá trị hiện tại vào form 1 lần khi query có data.
  useEffect(() => {
    if (daNap || !q.data) return;
    setTen(q.data.name ?? '');
    setDiaChi(q.data.address ?? '');
    setNamSinh(q.data.dob ?? undefined);
    setGioiTinh(q.data.gender);
    setSoCccd(q.data.cccd ?? '');
    setDaNap(true);
  }, [q.data, daNap]);

  const luu = useMutation({
    mutationFn: () => updateParty(partyId, {
      name: ten.trim(),
      phone: sdt.trim() || undefined,
      address: diaChi,
      note: ghiChu.trim() || undefined,
      dob: namSinh,
      gender: gioiTinh,
      cccd: soCccd.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['party', partyId] });
      qc.invalidateQueries({ queryKey: ['nong-ho-list'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
      router.back();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-bg-soft">
        <ActivityIndicator color="#dd1c2e" />
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-soft">
        <ErrorState
          message={q.error ? apiErrorMessage(q.error) : 'Không tìm thấy nông hộ'}
          onRetry={() => void q.refetch()}
        />
      </SafeAreaView>
    );
  }

  const tenLoi = ten.trim().length > 0 && ten.trim().length < 2;
  const sdtLoi = sdt.trim().length > 0 && !PHONE_RE.test(sdt.trim());
  const cccdLoi = soCccd.trim().length > 0 && !/^\d{12}$/.test(soCccd.trim());
  const hopLe = ten.trim().length >= 2 && !sdtLoi && !cccdLoi;

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Sửa nông hộ' }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-card bg-white border border-border p-4">
            <Input
              label="Họ và tên *"
              value={ten}
              onChangeText={setTen}
              autoCapitalize="words"
              error={tenLoi ? 'Tối thiểu 2 ký tự' : undefined}
            />
            <DateField
              label="Ngày sinh"
              value={namSinh}
              onChange={setNamSinh}
              maximumDate={new Date()}
            />
            <View className="mb-3">
              <Text className="text-caption text-ink-muted mb-1">Giới tính</Text>
              <View className="flex-row">
                {(['nam', 'nu'] as const).map((g, i) => {
                  const active = gioiTinh === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGioiTinh(g)}
                      className={`flex-1 h-11 rounded-input items-center justify-center border ${
                        i > 0 ? 'ml-2' : ''
                      } ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                    >
                      <Text
                        className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}
                      >
                        {GENDER_LABELS[g]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Input
              label="Số CCCD"
              value={soCccd}
              onChangeText={(v) => setSoCccd(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={12}
              placeholder="000000000000"
              error={cccdLoi ? 'Số CCCD phải gồm 12 chữ số' : undefined}
            />
            <Input
              label="Thêm số điện thoại"
              value={sdt}
              onChangeText={setSdt}
              keyboardType="phone-pad"
              placeholder="0912xxxxxx (chỉ thêm — không thay số cũ)"
              error={sdtLoi ? 'Số điện thoại không hợp lệ' : undefined}
            />
            <DiaChiField value={diaChi} onChangeText={setDiaChi} placeholder="Thôn, xã, tỉnh" />
            <Input
              label="Ghi chú"
              multiline
              numberOfLines={3}
              value={ghiChu}
              onChangeText={setGhiChu}
              placeholder="Đặc điểm nhận biết, ghi chú công tác…"
            />
          </View>
        </ScrollView>

        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg flex-row gap-2">
          <View className="flex-1">
            <Button label="Huỷ" variant="secondary" onPress={() => router.back()} />
          </View>
          <View className="flex-1">
            <Button
              label="Lưu"
              loading={luu.isPending}
              disabled={!hopLe || luu.isPending}
              onPress={() => luu.mutate()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
