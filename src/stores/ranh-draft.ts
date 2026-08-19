import { create } from 'zustand';
import type { Ring } from '../features/den-thua/geo';

/**
 * Bàn giao ranh giữa màn vẽ full-screen (`app/thua/ve-ranh.tsx`) và wizard tạo
 * thửa (`app/thua/tao-thua.tsx`). KHÔNG persist — chỉ sống trong một lần tạo
 * thửa; nhét mảng toạ độ vào query params thì bẩn và giới hạn độ dài URL.
 */
type RanhDraftState = {
  ring: Ring;
  datRing: (ring: Ring) => void;
  xoa: () => void;
};

export const useRanhDraftStore = create<RanhDraftState>((set) => ({
  ring: [],
  datRing: (ring) => set({ ring }),
  xoa: () => set({ ring: [] }),
}));
