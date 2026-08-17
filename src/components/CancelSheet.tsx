import { useEffect, useState } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Pressable,
} from 'react-native';
import { Button } from './Button';
import { Input } from './Input';

type Props = {
  visible: boolean;
  title: string;
  helperText?: string;
  placeholder?: string;
  errorMessage?: string | null;
  submitting?: boolean;
  minReasonLength?: number;
  submitLabel?: string;
  dismissLabel?: string;
  onDismiss: () => void;
  onSubmit: (reason: string) => void;
};

/**
 * Bottom sheet nhập lý do (huỷ đơn / huỷ phiếu / ...).
 * Reason state internal — reset khi visible false.
 */
export function CancelSheet({
  visible,
  title,
  helperText = 'Vui lòng nhập lý do trước khi tiếp tục.',
  placeholder = 'Ví dụ: Khách đổi ý',
  errorMessage,
  submitting = false,
  minReasonLength = 3,
  submitLabel = 'Xác nhận',
  dismissLabel = 'Huỷ bỏ',
  onDismiss,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  const disabled = submitting || reason.trim().length < minReasonLength;

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="bg-white rounded-t-frame p-4 pb-6">
          <View className="items-center mb-2">
            <View className="h-1 w-12 bg-neutral-300 rounded-full" />
          </View>
          <Text className="text-h2 text-ink mb-2">{title}</Text>
          <Text className="text-caption text-ink-muted mb-3">{helperText}</Text>
          <Input
            label="Lý do"
            placeholder={placeholder}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            autoFocus={visible}
          />
          {errorMessage ? (
            <Text className="text-small text-red-600 mb-2">{errorMessage}</Text>
          ) : null}
          <View className="flex-row gap-2 mt-2">
            <View className="flex-1">
              <Pressable
                onPress={onDismiss}
                className="h-button rounded-card border border-border items-center justify-center"
              >
                <Text className="text-ink font-semibold">{dismissLabel}</Text>
              </Pressable>
            </View>
            <View className="flex-1">
              <Button
                label={submitLabel}
                loading={submitting}
                disabled={disabled}
                onPress={() => onSubmit(reason.trim())}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
