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
   * hoàn toàn. Màn "đến thửa" phải truyền `Location.Accuracy.High`.
   */
  accuracy?: Location.Accuracy;
  /**
   * Tuổi tối đa (ms) của toạ độ cache được phép hiện NGAY để không bắt user chờ
   * GPS lạnh. Cache chỉ dùng hiển thị nhanh + tra địa chỉ; số đo tươi về sẽ đè
   * lên. Đặt 0 để tắt (đo tươi hẳn như trước).
   */
  lastKnownMaxAgeMs?: number;
  /**
   * Sai số tối đa (m) của cache được phép hiện. Bỏ trống = nhận mọi cache.
   * Đặt (vd 200) ở màn "đến thửa" để KHÔNG nháy một fix wifi sai số cả km rồi
   * reverse-geocode ra xã lệch — cache quá thô thì thà chờ đo tươi.
   */
  lastKnownRequiredAccuracyM?: number;
};

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_LAST_KNOWN_MAX_AGE = 120_000;

/** Chuẩn hoá số đo Expo → ViTri nghiệp vụ. */
function mapToViTri(pos: Location.LocationObject): ViTri {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    doChinhXac: pos.coords.accuracy ?? undefined,
    ghiLuc: new Date(pos.timestamp).toISOString(),
  };
}

/**
 * Đo vị trí thiết bị. Toạ độ là TUỲ CHỌN trong nghiệp vụ nên hook này theo
 * "Pattern B im lặng" giống `features/vat-tu/anh.ts`: thiếu quyền thì trả null,
 * KHÔNG gate màn hình, KHÔNG Alert — người gọi tự quyết hiển thị.
 */
export function useDeviceLocation({
  auto = false,
  timeoutMs = DEFAULT_TIMEOUT,
  accuracy = Location.Accuracy.Balanced,
  lastKnownMaxAgeMs = DEFAULT_LAST_KNOWN_MAX_AGE,
  lastKnownRequiredAccuracyM,
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

    // Khai báo ngoài try để nhánh catch cũng thấy (giữ cache đã hiện khi lỗi).
    let cacheViTri: ViTri | null = null;
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

      // Hiện NGAY toạ độ cache (nếu còn tươi) để user không đứng chờ GPS lạnh.
      // Cache có thể sai số lớn → chỉ để hiển thị/tra địa chỉ; số đo tươi ở dưới
      // sẽ đè lên. Guard độ-chính-xác phía màn dò thửa tự chặn query trên cache.
      if (lastKnownMaxAgeMs > 0) {
        const cached = await Location.getLastKnownPositionAsync({
          maxAge: lastKnownMaxAgeMs,
          requiredAccuracy: lastKnownRequiredAccuracyM,
        });
        if (cached) {
          cacheViTri = mapToViTri(cached);
          if (mountedRef.current) {
            setViTri(cacheViTri);
            setState('co');
          }
        }
      }

      // getCurrentPositionAsync không có timeout riêng — tự đua với đồng hồ để
      // không treo wizard khi ở trong kho kín không bắt được vệ tinh.
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);

      if (!pos) {
        // Đo tươi timeout: nếu đã hiện cache thì GIỮ nguyên (toạ độ hơi cũ còn
        // hơn nháy sang màn lỗi). Chỉ báo lỗi khi hoàn toàn không có gì.
        if (cacheViTri) return cacheViTri;
        if (mountedRef.current) {
          setState('loi');
          setLoi('Quá lâu không bắt được tín hiệu. Thử ra chỗ thoáng rồi bấm lại.');
        }
        return null;
      }

      const next = mapToViTri(pos);
      if (mountedRef.current) {
        setViTri(next);
        setState('co');
      }
      return next;
    } catch (err) {
      // Lỗi khi đang đo tươi nhưng đã có cache → không xoá cache đã hiện.
      if (cacheViTri) return cacheViTri;
      if (mountedRef.current) {
        setState('loi');
        setLoi(err instanceof Error ? err.message : 'Không lấy được vị trí');
      }
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [timeoutMs, accuracy, lastKnownMaxAgeMs, lastKnownRequiredAccuracyM]);

  useEffect(() => {
    if (!auto) return;
    void layViTri();
    // Chạy đúng 1 lần lúc mount — layViTri ổn định theo timeoutMs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { state, viTri, loi, canAskAgain, layViTri };
}
