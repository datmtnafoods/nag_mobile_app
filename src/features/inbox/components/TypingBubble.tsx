import { View, Text } from 'react-native';

/**
 * Bong bóng "đang soạn tin…" phía đối diện. Mock choreography — hiện sau khi
 * gửi cho tới khi auto-reply mock tới; Phase 3 dùng WebSocket typing event.
 */
export function TypingBubble() {
  return (
    <View className="mb-2 items-start">
      <View className="rounded-card px-3 py-2 bg-white border border-border">
        <Text className="text-ink-muted italic">đang soạn tin…</Text>
      </View>
    </View>
  );
}
