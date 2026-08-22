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
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useNumericInput } from '../../../hooks/useNumericInput';
import { formatVND } from '../format';
import type { DraftLine } from '../types';

type Props = {
  visible: boolean;
  line: DraftLine | null;
  /** Giá niêm yết của SKU (nếu có) — hiện nút "Về giá niêm yết". */
  giaNiemYet?: number;
  onDismiss: () => void;
  onSubmit: (donGia: number) => void;
};

/**
 * Bottom sheet sửa đơn giá một dòng hàng (khuôn CancelSheet).
 * Giá tính theo đơn vị cơ bản của SKU.
 */
export function LinePriceSheet({ visible, line, giaNiemYet, onDismiss, onSubmit }: Props) {
  const [gia, setGia] = useState(0);
  const giaInput = useNumericInput(gia, setGia, { maxDecimals: 0 });

  useEffect(() => {
    if (visible && line) setGia(line.donGia ?? giaNiemYet ?? 0);
  }, [visible, line, giaNiemYet]);

  if (!line) return null;

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
            <Text className="text-h2 text-ink mb-1">Sửa đơn giá</Text>
            <Text className="text-caption text-ink-muted mb-3" numberOfLines={1}>
              {line.tenSku}
            </Text>
            <Input
              label={`Đơn giá (đ/${line.donViCoBan})`}
              placeholder="Giá bán"
              keyboardType="decimal-pad"
              value={giaInput.value}
              onChangeText={giaInput.onChangeText}
              onBlur={giaInput.onBlur}
            />
            {giaNiemYet != null && gia !== giaNiemYet ? (
              <Pressable
                onPress={() => setGia(giaNiemYet)}
                hitSlop={8}
                className="min-h-[44px] justify-center"
                accessibilityRole="button"
                accessibilityLabel="Về giá niêm yết"
              >
                <Text className="text-caption text-primary font-semibold">
                  Về giá niêm yết: {formatVND(giaNiemYet)}/{line.donViCoBan}
                </Text>
              </Pressable>
            ) : null}
            <View className="flex-row gap-2 mt-2">
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
                <Button label="Lưu giá" onPress={() => onSubmit(gia)} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
