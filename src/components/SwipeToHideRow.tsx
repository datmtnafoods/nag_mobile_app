import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Wrap 1 row (ListRow, PhieuCard…) bằng ReanimatedSwipeable. Vuốt qua ngưỡng
 * `rightThreshold` → tự đóng, animate collapse height về 0, rồi gọi `onHide`.
 *
 * Không sửa RowGroup — clip nội bộ ở Swipeable đủ để action đỏ không tràn góc
 * bo của group ngoài (`containerStyle overflow:'hidden'`). Divider giữa các
 * Swipeable sibling do RowGroup vẽ vẫn hoạt động vì Swipeable là valid element.
 *
 * Cần `<GestureHandlerRootView>` bao ngoài (đặt ở app/_layout.tsx). Không có
 * root view thì gesture im lặng không phản hồi — không có warning trong dev.
 */
export function SwipeToHideRow({
  children,
  onHide,
  actionLabel = 'Ẩn',
}: {
  children: ReactNode;
  onHide: () => void;
  actionLabel?: string;
}) {
  const ref = useRef<SwipeableMethods | null>(null);
  const height = useSharedValue<number | 'auto'>('auto');
  const opacity = useSharedValue(1);
  const [collapsing, setCollapsing] = useState(false);

  const triggerHide = useCallback(() => {
    onHide();
  }, [onHide]);

  const startCollapse = useCallback(
    (measuredHeight: number) => {
      setCollapsing(true);
      height.value = measuredHeight;
      // Yield 1 frame để layout ăn giá trị "cứng" trước khi animate về 0.
      requestAnimationFrame(() => {
        height.value = withTiming(0, { duration: 180 });
        opacity.value = withTiming(0, { duration: 160 }, (finished) => {
          if (finished) runOnJS(triggerHide)();
        });
      });
    },
    [height, opacity, triggerHide],
  );

  const measureRef = useRef<View | null>(null);

  const handleOpen = useCallback(() => {
    // Đóng ngay để action đỏ không kẹt bên phải, rồi collapse.
    ref.current?.close();
    measureRef.current?.measure((_x, _y, _w, h) => {
      startCollapse(h || 56);
    });
  }, [startCollapse]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: collapsing ? (height.value as number) : undefined,
    opacity: opacity.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View ref={measureRef} collapsable={false}>
        <ReanimatedSwipeable
          ref={ref}
          friction={2}
          rightThreshold={72}
          overshootRight={false}
          onSwipeableWillOpen={handleOpen}
          containerStyle={{ overflow: 'hidden' }}
          renderRightActions={() => (
            <View className="flex-row items-center justify-end bg-red-500 pr-5 pl-4">
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text className="text-body font-semibold text-white ml-2">{actionLabel}</Text>
            </View>
          )}
        >
          {children}
        </ReanimatedSwipeable>
      </View>
    </Animated.View>
  );
}
