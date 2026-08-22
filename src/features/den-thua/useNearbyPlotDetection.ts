import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';
import { usePermissions } from '../../auth/store';
import { timThuaTheoToaDo } from '../../api/erp/growing-areas';
import { useNearbyPlotToast } from '../../components/NearbyPlotToast';
import { permsDenThua } from './perms';
import { gpsDuChinhXac } from './gps';

/**
 * Dò thửa quanh vị trí GPS rồi bật popup nhắc ở Trang chủ. Đo GPS 1 LẦN mỗi lần
 * mount / `reDetect()` (không watch liên tục — nhẹ pin, đúng khuôn app). Popup
 * chỉ bật khi TẬP THỬA phát hiện đổi (di chuyển sang cụm khác), cùng chỗ cũ
 * không nhắc lại.
 *
 * ⚠️ Nợ backend: real mode lọc thửa theo người tạo (xem `growing-areas.ts` doc
 * `timThuaTheoToaDo`) → KTV đứng trên thửa người khác vẽ có thể không được nhắc.
 * Không vá client; chờ endpoint tra-toạ-độ bỏ ownership.
 */
export function useNearbyPlotDetection(): { reDetect: () => void } {
  const permissions = usePermissions();
  const perms = permsDenThua(permissions);
  const toast = useNearbyPlotToast();

  const { viTri, layViTri } = useDeviceLocation({
    auto: true,
    accuracy: Location.Accuracy.High,
    timeoutMs: 15000,
    // Cùng lý do den-thua: cache quá thô thì chờ đo tươi, khỏi dò trượt cụm.
    lastKnownRequiredAccuracyM: 200,
  });

  const duChinhXac = gpsDuChinhXac(viTri);

  const doQuery = useQuery({
    // Cùng queryKey với den-thua.tsx / quanh-ban để share cache react-query.
    queryKey: ['do-thua', viTri?.lat, viTri?.lng],
    queryFn: () => timThuaTheoToaDo(viTri!.lat, viTri!.lng),
    enabled: perms.xemThua && duChinhXac,
    staleTime: 15_000,
    // Vẫn dò khi offline để rơi vào cache thửa (point-in-polygon client-side).
    networkMode: 'offlineFirst',
  });

  // Chống nhắc lại: signature = tập id thửa (trúng + gần). Đổi cụm → nhắc lại;
  // cùng chỗ → im. Rời hết thửa → reset để lần tới có thửa sẽ nhắc.
  const lastSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (!doQuery.isSuccess || !doQuery.data) return;
    const { trung, ganDo } = doQuery.data;
    if (trung.length === 0 && ganDo.length === 0) {
      lastSigRef.current = null;
      return;
    }
    const sig = [...trung.map((t) => t.id), ...ganDo.map((g) => g.id)].sort().join('|');
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    // Thửa chính: đang đứng trên (trung[0]) ưu tiên; nếu chỉ ở gần thì thửa gần
    // nhất (ganDo đã sort tăng dần khoảng cách).
    const dungTren = trung.length > 0;
    const chinh = dungTren ? trung[0] : ganDo[0];
    if (!chinh) return;
    toast.show({
      thua: chinh,
      khoangCachM: dungTren ? undefined : ganDo[0]!.khoangCachM,
      soThuaKhac: trung.length + ganDo.length - 1,
      dangDungTren: dungTren,
    });
  }, [doQuery.isSuccess, doQuery.data, toast]);

  return { reDetect: layViTri };
}
