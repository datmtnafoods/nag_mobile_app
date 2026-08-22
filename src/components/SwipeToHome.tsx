import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';

/**
 * Cử chỉ vuốt phải từ MÉP TRÁI màn → về Trang chủ. Dùng ở root các Stack ngoài
 * (tabs): `vat-tu/`, `thua/`, `order/`. Trong tab không dùng (đã có tab bar).
 *
 * Vì sao edge-swipe (start ≤ 30px), không phải bất kỳ điểm nào:
 *   - Trong màn có ScrollView ngang (chip filter, danh sách vật tư picker) → vuốt
 *     ngang giữa màn phải nhường cho scroll ngang, không cướp lên trên.
 *   - Chỉ nắm gesture khi bắt đầu từ sát mép trái → không xung đột với thao tác
 *     kéo bên trong nội dung.
 *
 * Ngưỡng: translationX > 100 && velocityX > 300 — vuốt dứt khoát, không nhầm
 * với tap hay kéo nhẹ.
 *
 * `router.replace('/')` (không push) để không chồng thêm entry stack — Trang chủ
 * là điểm neo, quay ra rồi vào tiếp phải lại từ đầu.
 *
 * KHÔNG áp cho: màn full-screen modal camera/map (ve-ranh, quanh-ban, quet-cccd,
 * scan-code, sku/pair-code) — đã `gestureEnabled: false` từ trước để chống vuốt
 * nhầm khi đang ngắm mã / vẽ ranh. Vì màn modal đè lên trên toàn màn và không
 * cho gesture xuyên xuống, `SwipeToHome` ở dưới sẽ không nhận được gesture.
 */
export function SwipeToHome({ children }: { children: ReactNode }) {
  const startX = useRef(0);
  const gesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX(20)
    .failOffsetY([-15, 15])
    .onBegin((e) => {
      startX.current = e.absoluteX;
    })
    .onEnd((e) => {
      if (startX.current <= 30 && e.translationX > 100 && e.velocityX > 300) {
        router.replace('/' as never);
      }
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={gesture}>
      <View className="flex-1">{children}</View>
    </GestureDetector>
  );
}
