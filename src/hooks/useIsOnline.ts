import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Trạng thái mạng thật cho UI (banner offline, rẽ nhánh tạo hộ offline).
 *
 * Nguồn duy nhất là NetInfo — KHÔNG tự đoán bằng cách bắt lỗi request. Mặc định
 * `true` (lạc quan) cho tới lần dò đầu tiên để không chớp banner lúc mở app.
 * `isConnected === false` = mất mạng chắc chắn (airplane/không sóng); `null` lúc
 * chưa dò xong coi như còn mạng.
 */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false);
    });
    return unsub;
  }, []);

  return online;
}
