import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { taoKhoTam } from './warehouse';
import { apiErrorStatus, laLoiMang } from '../client';
import { queryClient } from '../query';
import { useKhoTamQueueStore } from '../../stores/kho-tam-queue';

/**
 * Đồng bộ các kho tạm (xe) khai offline (xem `stores/kho-tam-queue.ts`).
 *
 * Gọi `flushKhoQueue()` khi có mạng lại / app foreground. Map tempId→id thật giữ
 * ở RAM để phiếu chuyển/bán tham chiếu kho tạm remap được khi sync (follow-up:
 * hiện chặn bằng guardrail `dongBoTam` ở màn tạo phiếu). Mất map khi reload là
 * chấp nhận được (kho đã lên BE, listKho fetch lại có id thật).
 */
const tempToReal = new Map<string, string>();
let dangFlush = false;

/** id thật của một kho tạm đã sync từ tempId (undefined nếu chưa sync). */
export function idThatCuaKhoTam(tempId: string): string | undefined {
  return tempToReal.get(tempId);
}

export async function flushKhoQueue(): Promise<void> {
  if (dangFlush) return;
  const pending = useKhoTamQueueStore.getState().pending;
  if (pending.length === 0) return;

  dangFlush = true;
  let coThayDoi = false;
  try {
    for (const p of pending) {
      try {
        const kho = await taoKhoTam({
          ten: p.ten,
          loaiXe: p.loaiXe,
          custodianUserId: p.custodianUserId,
          custodianName: p.custodianName,
        });
        tempToReal.set(p.tempId, kho.id);
        useKhoTamQueueStore.getState().remove(p.tempId);
        coThayDoi = true;
      } catch (err) {
        const status = apiErrorStatus(err);
        // Còn offline, HOẶC backend chưa có route `POST /kho` (404 / 50x), HOẶC lỗi
        // không rõ status → GIỮ lại, dừng, thử lần sau. KHÔNG drop như party làm với
        // lỗi nghiệp vụ: tới khi BE ship route thì mọi lần thử đều 404, drop sẽ mất
        // kho tạm KTV đã tạo.
        if (laLoiMang(err) || status === undefined || status === 404 || status >= 500) break;
        // Lỗi nghiệp vụ chắc chắn (400 sai dữ liệu, 409 trùng tên xe) → dọn khỏi
        // queue để không kẹt (gửi lại cũng hỏng).
        useKhoTamQueueStore.getState().remove(p.tempId);
        coThayDoi = true;
        if (status !== 409) {
          console.warn('[kho-sync] bỏ kho tạm vì lỗi nghiệp vụ:', status);
        }
      }
    }
    if (coThayDoi) {
      queryClient.invalidateQueries({ queryKey: ['kho', 'list'] });
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
export function wireKhoSync() {
  if (daWire) return;
  daWire = true;

  onlineManager.subscribe((online) => {
    if (online) void flushKhoQueue();
  });

  AppState.addEventListener('change', (s) => {
    if (s === 'active' && onlineManager.isOnline()) void flushKhoQueue();
  });
}
