import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { ViTri, ViTriState } from '../features/location/types';

type Options = {
  /** Tự đo một lần khi mount (dùng cho wizard lập phiếu). */
  auto?: boolean;
  /** Bỏ cuộc sau bao lâu (ms). GPS trong nhà có thể treo rất lâu. */
  timeoutMs?: number;
  /**
   * Độ chính xác. `Balanced` (~100 m) đủ cho toạ độ đính phiếu, nhưng KHÔNG đủ
   * để dò thửa đất — thửa vài sào chỉ ~30–60 m cạnh, sai số 100 m là dò trượt
   * hoàn toàn. Màn "đến ruộng" phải truyền `Location.Accuracy.High`.
   */
  accuracy?: Location.Accuracy;
};

const DEFAULT_TIMEOUT = 8000;

/**
 * Đo vị trí thiết bị. Toạ độ là TUỲ CHỌN trong nghiệp vụ nên hook này theo
 * "Pattern B im lặng" giống `features/vat-tu/anh.ts`: thiếu quyền thì trả null,
 * KHÔNG gate màn hình, KHÔNG Alert — người gọi tự quyết hiển thị.
 */
export function useDeviceLocation({
  auto = false,
  timeoutMs = DEFAULT_TIMEOUT,
  accuracy = Location.Accuracy.Balanced,
}: Options = {}) {
  const [state, setState] = useState<ViTriState>('idle');
  const [viTri, setViTri] = useState<ViTri | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  /** Không cho quyền hỏi lại nữa → UI đổi nút thành "Mở Cài đặt". */
  const [canAskAgain, setCanAskAgain] = useState(true);

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const layViTri = useCallback(async (): Promise<ViTri | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    if (mountedRef.current) {
      setState('dang-lay');
      setLoi(null);
    }

    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (mountedRef.current) {
          setCanAskAgain(perm.canAskAgain);
          setState('tu-choi');
        }
        return null;
      }
      if (mountedRef.current) setCanAskAgain(true);

      // getCurrentPositionAsync không có timeout riêng — tự đua với đồng hồ để
      // không treo wizard khi ở trong kho kín không bắt được vệ tinh.
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);

      if (!pos) {
        if (mountedRef.current) {
          setState('loi');
          setLoi('Quá lâu không bắt được tín hiệu. Thử ra chỗ thoáng rồi bấm lại.');
        }
        return null;
      }

      const next: ViTri = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        doChinhXac: pos.coords.accuracy ?? undefined,
        ghiLuc: new Date(pos.timestamp).toISOString(),
      };
      if (mountedRef.current) {
        setViTri(next);
        setState('co');
      }
      return next;
    } catch (err) {
      if (mountedRef.current) {
        setState('loi');
        setLoi(err instanceof Error ? err.message : 'Không lấy được vị trí');
      }
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [timeoutMs, accuracy]);

  useEffect(() => {
    if (!auto) return;
    void layViTri();
    // Chạy đúng 1 lần lúc mount — layViTri ổn định theo timeoutMs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { state, viTri, loi, canAskAgain, layViTri };
}
