import { useState } from 'react';
import { Modal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DiaChiField } from '../../location/components/DiaChiField';
import type { NhaCungCap } from '../types';

type Props = {
  visible: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onDismiss: () => void;
  onSubmit: (input: Omit<NhaCungCap, 'id'>) => void;
};

/** Bottom-sheet form thêm nhanh NCC (ten required, còn lại optional). */
export function NccQuickCreateModal({
  visible,
  submitting,
  errorMessage,
  onDismiss,
  onSubmit,
}: Props) {
  const [ten, setTen] = useState('');
  const [dienThoai, setDienThoai] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [maSoThue, setMaSoThue] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  const reset = () => {
    setTen('');
    setDienThoai('');
    setDiaChi('');
    setMaSoThue('');
    setLocalErr(null);
  };

  const handleSubmit = () => {
    if (!ten.trim()) {
      setLocalErr('Nhập tên nhà cung cấp.');
      return;
    }
    setLocalErr(null);
    onSubmit({
      ten: ten.trim(),
      dienThoai: dienThoai.trim() || undefined,
      diaChi: diaChi.trim() || undefined,
      maSoThue: maSoThue.trim() || undefined,
    });
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/40"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-t-frame p-4 pb-6">
            <View className="items-center mb-2">
              <View className="h-1 w-12 bg-neutral-300 rounded-full" />
            </View>
            <Text className="text-h2 text-ink mb-3">Thêm nhà cung cấp</Text>
            <Input
              label="Tên NCC *"
              placeholder="Ví dụ: NCC Nông Nghiệp Miền Nam"
              value={ten}
              onChangeText={setTen}
            />
            <Input
              label="Điện thoại"
              placeholder="02839123456"
              keyboardType="phone-pad"
              value={dienThoai}
              onChangeText={setDienThoai}
            />
            <DiaChiField
              placeholder="Số 12 Nguyễn Văn Cừ, Q.5, TP HCM"
              value={diaChi}
              onChangeText={setDiaChi}
            />
            <Input
              label="Mã số thuế"
              placeholder="0301234567"
              value={maSoThue}
              onChangeText={setMaSoThue}
            />
            {localErr || errorMessage ? (
              <Text className="text-small text-red-600 mb-2">
                {localErr ?? errorMessage}
              </Text>
            ) : null}
            <View className="flex-row gap-2 mt-2">
              <View className="flex-1">
                <Pressable
                  onPress={handleDismiss}
                  className="h-button rounded-card border border-border items-center justify-center"
                >
                  <Text className="text-ink font-semibold">Huỷ</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Button label="Lưu NCC" loading={submitting} onPress={handleSubmit} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
