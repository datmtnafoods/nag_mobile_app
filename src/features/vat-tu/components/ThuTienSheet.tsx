import { useEffect, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import { formatVND } from '../format';
import type { PhuongThucTT } from '../types';

type Props = {
  visible: boolean;
  /** Số còn nợ — mặc định điền sẵn, cũng là trần cho ô nhập. */
  conNo: number;
  submitting?: boolean;
  errorMessage?: string | null;
  onDismiss: () => void;
  onSubmit: (input: { soTien: number; phuongThuc: PhuongThucTT; ghiChu?: string }) => void;
};

/** Bottom sheet thu thêm tiền cho phiếu bán còn nợ (khuôn CancelSheet). */
export function ThuTienSheet({
  visible,
  conNo,
  submitting = false,
  errorMessage,
  onDismiss,
  onSubmit,
}: Props) {
  const [soTien, setSoTien] = useState(conNo);
  const soTienInput = useNumericInput(soTien, setSoTien, { maxDecimals: 0 });
  const [phuongThuc, setPhuongThuc] = useState<PhuongThucTT>('tien_mat');
  const [ghiChu, setGhiChu] = useState('');

  useEffect(() => {
    if (visible) {
      setSoTien(conNo);
      setPhuongThuc('tien_mat');
      setGhiChu('');
    }
  }, [visible, conNo]);

  const disabled = submitting || !(soTien > 0) || soTien > conNo + 0.5;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onDismiss}
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
            <Text className="text-h2 text-ink mb-1">Thu thêm tiền</Text>
            <Text className="text-caption text-ink-muted mb-3">
              Còn nợ {formatVND(conNo)}
            </Text>

            <Input
              label="Số tiền thu (đ)"
              placeholder="0"
              keyboardType="decimal-pad"
              value={soTienInput.value}
              onChangeText={soTienInput.onChangeText}
              onBlur={soTienInput.onBlur}
            />
            {soTien > conNo + 0.5 ? (
              <Text className="text-small text-red-600 mt-1">Không thu vượt số còn nợ.</Text>
            ) : null}

            <Text className="text-caption text-ink-muted mt-3 mb-1">Phương thức</Text>
            <View className="flex-row gap-2">
              {(['tien_mat', 'chuyen_khoan'] as PhuongThucTT[]).map((pt) => {
                const active = phuongThuc === pt;
                return (
                  <Pressable
                    key={pt}
                    onPress={() => setPhuongThuc(pt)}
                    className={`min-h-[44px] px-3 rounded-input flex-row items-center border ${
                      active ? 'bg-primary border-primary' : 'bg-white border-border'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={pt === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}
                  >
                    <Ionicons
                      name={pt === 'tien_mat' ? 'cash-outline' : 'card-outline'}
                      size={16}
                      color={active ? '#fff' : '#6b7280'}
                      style={{ marginRight: 6 }}
                    />
                    <Text className={`text-caption font-semibold ${active ? 'text-white' : 'text-ink'}`}>
                      {pt === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3">
              <Input
                label="Ghi chú (không bắt buộc)"
                placeholder="Ví dụ: thu nốt tiền thuốc"
                value={ghiChu}
                onChangeText={setGhiChu}
              />
            </View>

            {errorMessage ? (
              <Text className="text-small text-red-600 mt-2">{errorMessage}</Text>
            ) : null}

            <View className="flex-row gap-2 mt-3">
              <View className="flex-1">
                <Pressable
                  onPress={onDismiss}
                  className="h-button rounded-card border border-border items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                >
                  <Text className="text-ink font-semibold">Đóng</Text>
                </Pressable>
              </View>
              <View className="flex-1">
                <Button
                  label="Xác nhận thu"
                  loading={submitting}
                  disabled={disabled}
                  onPress={() =>
                    onSubmit({ soTien, phuongThuc, ghiChu: ghiChu.trim() || undefined })
                  }
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
