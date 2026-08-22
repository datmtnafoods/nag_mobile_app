import { useRef, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ICON, MAU } from '../theme/tokens';

/**
 * Vuốt phải→trái trên row → lộ nút action bên phải (iOS Mail/WhatsApp pattern).
 * Vuốt chậm giữ ngón tay → lộ dần; thả tay: qua ngưỡng thì open, dưới thì snap về.
 *
 * KHÔNG xung đột với `SwipeToHome` (iteration 8): SwipeToHome bắt vuốt trái→phải
 * từ mép trái màn; SwipeToAction bắt vuốt phải→trái trên chính view row → hai
 * hướng ngược nhau, RNGH tự negotiate.
 *
 * `overshootRight={false}`: chặn kéo quá đà; giữ vùng nhìn thấy = tổng width
 * actions (mỗi action 80px). Tap action → tự đóng gesture.
 *
 * Không cần bọc `GestureHandlerRootView` — đã có ở app root (RNGH tự inject).
 */

export type SwipeAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Class NativeWind cho nền: 'bg-red-600' (xoá/huỷ), 'bg-neutral-600' (ẩn), 'bg-blue-600' (thao tác trung tính). */
  bg: string;
  onPress: () => void;
};

export function SwipeToAction({
  children,
  actions,
}: {
  children: ReactNode;
  /** 1-2 actions. Nhiều hơn: cân nhắc menu thay vì swipe. */
  actions: SwipeAction[];
}) {
  const swipeRef = useRef<SwipeableMethods>(null);

  const renderRight = () => (
    <View className="flex-row">
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => {
            swipeRef.current?.close();
            // Chạy sau khi close (delay nhỏ để user thấy row snap về trước khi
            // mở Alert/CancelSheet nếu action mở modal).
            setTimeout(a.onPress, 100);
          }}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          className={`w-20 items-center justify-center ${a.bg} active:opacity-80`}
        >
          <Ionicons name={a.icon} size={ICON.vua} color={MAU.white} />
          <Text className="text-small text-white font-semibold mt-1">{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRight}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
