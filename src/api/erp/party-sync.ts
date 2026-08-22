import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { createParty } from './parties';
import { apiErrorStatus, laLoiMang } from '../client';
import { queryClient } from '../query';
import { usePartyQueueStore } from '../../stores/party-queue';

/**
 * Đồng bộ các nông hộ khai offline (xem `stores/party-queue.ts`).
 *
 * Gọi `flushPartyQueue()` khi có mạng lại / app foreground / sau đăng nhập. Chỉ
 * gửi tên + SĐT (kind=household) — đúng phần đã lưu ở queue. Map tempId→id thật
 * giữ ở RAM để nơi khác (nếu cần) đối chiếu; mất khi reload là chấp nhận được.
 */
const tempToReal = new Map<string, string>();
let dangFlush = false;

/** id thật của một hộ đã sync từ tempId (undefined nếu chưa sync). */
export function idThatCuaHoTam(tempId: string): string | undefined {
  return tempToReal.get(tempId);
}

export async function flushPartyQueue(): Promise<void> {
  if (dangFlush) return;
  const pending = usePartyQueueStore.getState().pending;
  if (pending.length === 0) return;

  dangFlush = true;
  let coThayDoi = false;
  try {
    for (const p of pending) {
      try {
        const ho = await createParty({ name: p.name, phone: p.phone, kind: 'household' });
        tempToReal.set(p.tempId, ho.id);
        usePartyQueueStore.getState().remove(p.tempId);
        coThayDoi = true;
      } catch (err) {
        // Vẫn offline → dừng, GIỮ phần còn lại để thử lần sau.
        if (laLoiMang(err)) break;
        // Trùng SĐT/CCCD (409) → hộ đã tồn tại trên hệ; coi như xong, dọn khỏi
        // queue để không kẹt. Lỗi nghiệp vụ khác cũng dọn (gửi lại cũng hỏng) —
        // dữ liệu offline chỉ có tên+SĐT nên rủi ro mất mát thấp.
        usePartyQueueStore.getState().remove(p.tempId);
        coThayDoi = true;
        if (apiErrorStatus(err) !== 409) {
          console.warn('[party-sync] bỏ hộ offline vì lỗi nghiệp vụ:', apiErrorStatus(err));
        }
      }
    }
    if (coThayDoi) {
      queryClient.invalidateQueries({ queryKey: ['nong-ho-list'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    }
  } finally {
    dangFlush = false;
  }
}

let daWire = false;

/**
 * Đăng ký các mốc tự flush. Gọi MỘT lần lúc khởi động app (app/_layout.tsx).
 * - Có mạng lại (onlineManager, đã nối NetInfo ở `api/query.ts`).
 * - App quay lại foreground.
 */
export function wireOfflineSync() {
  if (daWire) return;
  daWire = true;

  onlineManager.subscribe((online) => {
    if (online) void flushPartyQueue();
  });

  AppState.addEventListener('change', (s) => {
    if (s === 'active' && onlineManager.isOnline()) void flushPartyQueue();
  });
}
