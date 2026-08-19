import { create } from 'zustand';
import type { CccdData } from '../utils/cccd';

/**
 * Bàn giao dữ liệu CCCD từ màn quét full-screen (`app/thua/quet-cccd.tsx`) NGƯỢC
 * về form nông hộ (`ChonNongHo`) đang mount bên dưới — cùng cơ chế với
 * `ranh-draft` (màn full-screen ghi, màn dưới đọc). Router params chỉ chảy xuôi
 * tới màn mới nên không dùng được ở đây.
 *
 * KHÔNG persist: số CCCD là dữ liệu cá nhân nhạy cảm (NĐ 13/2023) — chỉ sống
 * trong RAM đúng một lần điền rồi `xoa()`, không ghi AsyncStorage, không nhét
 * vào URL.
 */
type CccdDraftState = {
  data: CccdData | null;
  datCccd: (d: CccdData) => void;
  xoa: () => void;
};

export const useCccdDraftStore = create<CccdDraftState>((set) => ({
  data: null,
  datCccd: (data) => set({ data }),
  xoa: () => set({ data: null }),
}));
