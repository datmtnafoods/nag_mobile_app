import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Snackbar "Đã ẩn — Hoàn tác" dùng cho vuốt-ẩn ở Trang chủ. Provider treo ở
 * root; call-site dùng `useUndoSnackbar().show(msg, onUndo)`. Auto-đóng sau
 * `duration` (mặc định 5s). Gọi `show` lần 2 khi đang mở lần 1 → thay ngay,
 * không xếp hàng (đúng ý user "vuốt liên tục vẫn thấy hoàn tác gần nhất").
 */

type UndoPayload = {
  id: number;
  message: string;
  onUndo: () => void;
  duration: number;
};

type Ctx = {
  show: (message: string, onUndo: () => void, duration?: number) => void;
};

const UndoSnackbarContext = createContext<Ctx | null>(null);

export function useUndoSnackbar(): Ctx {
  const ctx = useContext(UndoSnackbarContext);
  if (!ctx) throw new Error('useUndoSnackbar phải nằm trong <UndoSnackbarProvider>');
  return ctx;
}

export function UndoSnackbarProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<UndoPayload | null>(null);
  const nextIdRef = useRef(0);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, onUndo: () => void, duration = 5000) => {
    nextIdRef.current += 1;
    setPayload({ id: nextIdRef.current, message, onUndo, duration });
  }, []);

  // Auto-dismiss theo id — mỗi lần đổi payload là reset đồng hồ.
  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => {
      setPayload((cur) => (cur && cur.id === payload.id ? null : cur));
    }, payload.duration);
    return () => clearTimeout(t);
  }, [payload]);

  const ctx = useMemo(() => ({ show }), [show]);

  return (
    <UndoSnackbarContext.Provider value={ctx}>
      {children}
      {payload ? (
        <Animated.View
          key={payload.id}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(160)}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: insets.bottom + 72,
          }}
        >
          <View
            className="flex-row items-center rounded-card-lg px-4 py-3"
            style={{ backgroundColor: 'rgba(17,24,39,0.94)' }}
          >
            <Text className="text-body text-white flex-1 pr-3" numberOfLines={2}>
              {payload.message}
            </Text>
            <Pressable
              onPress={() => {
                payload.onUndo();
                setPayload((cur) => (cur && cur.id === payload.id ? null : cur));
              }}
              accessibilityRole="button"
              accessibilityLabel="Hoàn tác"
              hitSlop={8}
              className="min-h-[44px] justify-center px-2 active:opacity-70"
            >
              <Text className="text-body font-bold" style={{ color: '#fbbf24' }}>
                Hoàn tác
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </UndoSnackbarContext.Provider>
  );
}
