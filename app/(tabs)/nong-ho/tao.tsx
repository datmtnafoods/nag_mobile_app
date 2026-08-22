import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChonNongHo,
  giaiQuyetHo,
  hoHopLe,
  type KetQuaChonHo,
} from '../../../src/features/den-thua/components/ChonNongHo';
import { Button } from '../../../src/components/Button';
import { apiErrorMessage } from '../../../src/api/client';
import { useIsOnline } from '../../../src/hooks/useIsOnline';

export default function TaoNongHo() {
  const qc = useQueryClient();
  const online = useIsOnline();
  // ÉP 'moi' — màn này là "Tạo nông hộ", tab "Hộ đã có" vô nghĩa (chọn xong bấm
  // "Lưu" không update gì). Tra hộ đã có thì dùng search ở tab liệt kê.
  const [kq, setKq] = useState<KetQuaChonHo>({ loai: 'moi', ten: '', sdt: '', diaChi: '' });

  const luu = useMutation({
    // Cho phép khai nhanh offline (lưu tạm tên + SĐT, sync sau). Truyền `online`
    // (cùng nguồn với banner) để offline thì xếp hàng NGAY, nút không xoay chờ.
    mutationFn: () => giaiQuyetHo(kq, { choPhepOffline: true, online }),
    onSuccess: (partyId) => {
      qc.invalidateQueries({ queryKey: ['nong-ho-list'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
      // Khai offline trả tempId 'LOCAL-…' — chưa có hồ sơ thật để mở chi tiết.
      if (partyId?.startsWith('LOCAL-')) {
        Alert.alert('Đã lưu tạm', 'Nông hộ sẽ tự đồng bộ khi có mạng trở lại.');
        router.back();
        return;
      }
      if (partyId) router.replace(`/nong-ho/${partyId}` as never);
      else router.back();
    },
    onError: (err) => Alert.alert('Chưa lưu được', apiErrorMessage(err)),
  });

  return (
    <SafeAreaView className="flex-1 bg-bg-soft" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {!online ? (
            <View className="flex-row items-start rounded-input bg-amber-100 border border-amber-300 px-3 py-2 mb-3">
              <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
              <Text className="text-small text-amber-800 ml-2 flex-1">
                Đang offline — chỉ lưu tạm <Text className="font-semibold">tên và SĐT</Text>. CCCD,
                địa chỉ bổ sung sau khi có mạng.
              </Text>
            </View>
          ) : null}
          <ChonNongHo giaTri={kq} onChange={setKq} chiTaoMoi />
        </ScrollView>
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label={online ? 'Lưu nông hộ' : 'Lưu tạm (offline)'}
            loading={luu.isPending}
            disabled={!hoHopLe(kq) || luu.isPending}
            onPress={() => luu.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
