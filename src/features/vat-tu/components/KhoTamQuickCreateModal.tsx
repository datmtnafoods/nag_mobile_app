import { useState } from 'react';
import { Modal, View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { LoaiXe } from '../types';

type Props = {
  visible: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onDismiss: () => void;
  onSubmit: (input: { ten: string; loaiXe: LoaiXe }) => void;
};

const LOAI_XE_OPTIONS: { value: LoaiXe; label: string; icon: 'motorbike' | 'truck' }[] = [
  { value: 'xe_may', label: 'Xe máy', icon: 'motorbike' },
  { value: 'xe_tai', label: 'Xe tải', icon: 'truck' },
];

/**
 * Bottom-sheet tạo NHANH kho tạm (kho xe). Chỉ nhập TÊN — `loai:'xe'` + custodian
 * (chính KTV) do tầng API set. Mirror `NccQuickCreateModal`.
 */
export function KhoTamQuickCreateModal({
  visible,
  submitting,
  errorMessage,
  onDismiss,
  onSubmit,
}: Props) {
  const [ten, setTen] = useState('');
  const [loaiXe, setLoaiXe] = useState<LoaiXe>('xe_may');
  const [localErr, setLocalErr] = useState<string | null>(null);

  const reset = () => {
    setTen('');
    setLoaiXe('xe_may');
    setLocalErr(null);
  };

  const handleSubmit = () => {
    if (ten.trim().length < 2) {
      setLocalErr('Nhập tên kho tạm (tối thiểu 2 ký tự).');
      return;
    }
    setLocalErr(null);
    onSubmit({ ten: ten.trim(), loaiXe });
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
            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons
                name={loaiXe === 'xe_tai' ? 'truck' : 'motorbike'}
                size={22}
                color="#dd1c2e"
                style={{ marginRight: 6 }}
              />
              <Text className="text-h2 text-ink">Tạo kho tạm (xe)</Text>
            </View>
            <Text className="text-small text-ink-muted mb-3">
              Kho tạm là hàng trên xe của bạn (chưa giao tới kho khác). Bạn là người
              phụ trách; hệ thống đồng bộ lên máy chủ khi có mạng.
            </Text>
            <Text className="text-caption text-ink-muted mb-1">Loại xe</Text>
            <View className="flex-row gap-2 mb-3">
              {LOAI_XE_OPTIONS.map((opt) => {
                const active = loaiXe === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setLoaiXe(opt.value)}
                    className={`flex-1 min-h-[44px] rounded-input flex-row items-center justify-center border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: active }}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={18}
                      color={active ? '#fff' : '#6b7280'}
                      style={{ marginRight: 6 }}
                    />
                    <Text className={`font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input
              label="Tên kho tạm *"
              placeholder="VD: Xe tải 51C-123.45"
              value={ten}
              onChangeText={setTen}
              autoFocus
            />
            {localErr || errorMessage ? (
              <Text className="text-small text-red-600 mb-2">{localErr ?? errorMessage}</Text>
            ) : null}
            <View className="flex-row gap-2 mt-2">
              <View className="flex-1">
                <Pressable
                  onPress={handleDismiss}
                  className="h-button rounded-card border border-border items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Huỷ tạo kho tạm"
                >
                  <Text className="text-ink font-semibold">Huỷ</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Button label="Lưu kho tạm" loading={submitting} onPress={handleSubmit} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
