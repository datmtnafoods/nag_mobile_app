import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function TaoNongHo() {
  const qc = useQueryClient();
  // Mặc định mở nhánh "Hộ mới"; vẫn cho chọn hộ đã có (giaiQuyetHo xử lý cả hai).
  const [kq, setKq] = useState<KetQuaChonHo>({ loai: 'moi', ten: '', sdt: '', diaChi: '' });

  const luu = useMutation({
    mutationFn: () => giaiQuyetHo(kq, {}),
    onSuccess: (partyId) => {
      qc.invalidateQueries({ queryKey: ['nong-ho-list'] });
      qc.invalidateQueries({ queryKey: ['parties'] });
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
          <ChonNongHo giaTri={kq} onChange={setKq} />
        </ScrollView>
        <View className="px-4 pb-4 pt-2 border-t border-border bg-bg">
          <Button
            label="Lưu nông hộ"
            loading={luu.isPending}
            disabled={!hoHopLe(kq) || luu.isPending}
            onPress={() => luu.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
