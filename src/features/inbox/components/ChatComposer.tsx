import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAU } from '../../../theme/tokens';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
};

/**
 * Ô soạn tin + nút gửi. Giữ TextInput trần (KHÔNG dùng `<Input>` — Input gắn
 * label/mb-3/minHeight cho form, không hợp composer hug đáy có nút gửi inline).
 * Nút gửi chỉ disable khi rỗng (cho gõ-gửi liên tiếp; mỗi tin optimistic riêng).
 */
export function ChatComposer({ value, onChangeText, onSend }: Props) {
  const empty = !value.trim();
  return (
    <View className="flex-row items-end px-3 py-2 border-t border-border bg-bg">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Nhập tin nhắn..."
        placeholderTextColor={MAU.inkSoft}
        multiline
        className="flex-1 max-h-24 rounded-input border border-border px-3 text-body text-ink bg-white"
        // Chuỗi fix "chữ bị viền cắt" trên Android (nguồn: Input.tsx):
        //  paddingVertical:0 + includeFontPadding:false + textAlignVertical.
        style={{ paddingVertical: 10, includeFontPadding: false, textAlignVertical: 'center' }}
      />
      <Pressable
        onPress={onSend}
        disabled={empty}
        className={`ml-2 h-11 w-11 rounded-full items-center justify-center ${
          empty ? 'bg-neutral-300' : 'bg-primary'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Gửi tin nhắn"
      >
        <Ionicons name="send" size={18} color={MAU.white} />
      </Pressable>
    </View>
  );
}
