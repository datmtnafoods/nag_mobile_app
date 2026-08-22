import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

/**
 * Nối trạng thái mạng thật (NetInfo) vào react-query. Khi mất mạng, query đang
 * chạy bị "pause"; có mạng lại thì react-query tự refetch — nền cho các màn
 * offline (dò thửa cache, tra địa chỉ) và cho `flushPartyQueue` biết lúc gửi.
 * `isConnected !== false` để mặc định lạc quan lúc chưa có kết quả dò đầu tiên.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);
// Seed trạng thái ngay lúc khởi động: onlineManager mặc định `true` và cold-start
// dễ hụt sự kiện NetInfo đầu → kẹt "online" sai. Đọc một phát cho đúng từ đầu.
void NetInfo.fetch().then((state) => onlineManager.setOnline(state.isConnected !== false));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
