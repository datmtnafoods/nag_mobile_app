import { forwardRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  secure?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, secure, leftIcon, className: _className, multiline, ...rest },
  ref,
) {
  const [hidden, setHidden] = useState(!!secure);
  const invalid = Boolean(error);
  const isMultiline = Boolean(multiline);

  return (
    <View className="mb-3">
      {label ? <Text className="text-caption text-ink-muted mb-1">{label}</Text> : null}
      <View
        className={`flex-row rounded-input border px-3 bg-white ${
          isMultiline ? 'py-2 items-start' : 'h-input items-center'
        } ${invalid ? 'border-red-500' : 'border-border'}`}
        style={isMultiline ? { minHeight: 96 } : undefined}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color="#9ca3af"
            style={{ marginRight: 8, marginTop: isMultiline ? 4 : 0 }}
          />
        ) : null}
        <TextInput
          ref={ref}
          className="flex-1 text-body text-ink"
          // Ép padding=0 + tắt padding font Android — nếu không, TextInput mặc định
          // đắp thêm ~6-10px trên/dưới → trong khung `h-input=44` với `lineHeight=24`
          // thì text bị viền cắt trên/dưới (đặc biệt Android). Multiline dùng py-2 ở
          // wrapper nên vẫn giữ khoảng thở, không đè.
          style={
            isMultiline
              ? { padding: 0, includeFontPadding: false }
              : { paddingVertical: 0, includeFontPadding: false }
          }
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          multiline={isMultiline}
          textAlignVertical={isMultiline ? 'top' : 'auto'}
          {...rest}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          autoCapitalize={secure ? 'none' : rest.autoCapitalize}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="#6b7280" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-small text-red-600 mt-1">{error}</Text> : null}
    </View>
  );
});
