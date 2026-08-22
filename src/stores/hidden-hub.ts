import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Danh sách các "hub key" mà user đã vuốt-ẩn khỏi Trang chủ. Ẩn ở đây là cục bộ
 * client (backend không có bản ghi "đã dismiss"). Persist theo user để 2 KTV
 * chung máy không ẩn lẫn cho nhau — đăng ký reset ở `src/auth/wire.ts`.
 *
 * Không dùng TTL. Thay vào đó `gc(alive)` xoá key không còn trong tập candidate
 * hôm nay — Trang chủ gọi mỗi lần build danh sách để tự dọn khi item biến khỏi
 * backend (phiếu được xác nhận, tin đã đọc hết…).
 */
export const HIDDEN_HUB_KEY = 'nag.hidden-hub';

type HiddenHubState = {
  ownerUserId?: string;
  hiddenKeys: string[];

  setOwner: (userId: string | undefined) => void;
  hide: (key: string) => void;
  unhide: (key: string) => void;
  isHidden: (key: string) => boolean;
  gc: (aliveKeys: string[]) => void;
  reset: () => void;
};

export const useHiddenHubStore = create<HiddenHubState>()(
  persist(
    (set, get) => ({
      hiddenKeys: [],

      setOwner: (userId) => set({ ownerUserId: userId }),

      hide: (key) =>
        set((s) => (s.hiddenKeys.includes(key) ? s : { hiddenKeys: [...s.hiddenKeys, key] })),

      unhide: (key) =>
        set((s) => ({ hiddenKeys: s.hiddenKeys.filter((k) => k !== key) })),

      isHidden: (key) => get().hiddenKeys.includes(key),

      gc: (aliveKeys) =>
        set((s) => {
          const alive = new Set(aliveKeys);
          const next = s.hiddenKeys.filter((k) => alive.has(k));
          return next.length === s.hiddenKeys.length ? s : { hiddenKeys: next };
        }),

      reset: () => set({ ownerUserId: undefined, hiddenKeys: [] }),
    }),
    {
      name: HIDDEN_HUB_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        hiddenKeys: state.hiddenKeys,
      }),
    },
  ),
);

/** Đảm bảo hidden list không lẫn giữa các user trên cùng thiết bị. */
export function reconcileHiddenHubForUser(userId: string | undefined) {
  const state = useHiddenHubStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
