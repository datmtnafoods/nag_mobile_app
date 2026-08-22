import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PARTY_QUEUE_KEY = 'nag.party-queue';

/**
 * Một nông hộ khai NHANH khi offline, chờ đồng bộ.
 *
 * PII: CỐ Ý chỉ có tên + SĐT (trần đã chốt với người dùng). KHÔNG chứa CCCD/DOB/
 * địa chỉ — offline không thu các field nhạy cảm đó; hồ sơ đầy đủ bổ sung sau
 * khi online (màn sửa hộ). `tempId`/`taoLuc` không phải PII.
 */
export type PendingParty = {
  /** Id tạm 'LOCAL-<n>' — dùng ngay ở RAM cho tới khi sync ra id thật. */
  tempId: string;
  name: string;
  phone?: string;
  /** ISO — chỉ để hiển thị/sắp xếp, không nghiệp vụ. */
  taoLuc: string;
};

type PartyQueueState = {
  ownerUserId?: string;
  pending: PendingParty[];
  /** Bộ đếm sinh tempId ổn định (không dùng Date.now/random để id tái lập được). */
  seq: number;

  setOwner: (userId: string | undefined) => void;
  /** Xếp một hộ mới vào hàng đợi. Trả tempId để màn dùng ngay. */
  enqueue: (input: { name: string; phone?: string }) => string;
  remove: (tempId: string) => void;
  reset: () => void;
};

export const usePartyQueueStore = create<PartyQueueState>()(
  persist(
    (set, get) => ({
      pending: [],
      seq: 0,

      setOwner: (userId) => set({ ownerUserId: userId }),

      enqueue: ({ name, phone }) => {
        const seq = get().seq + 1;
        const tempId = `LOCAL-${seq}`;
        const item: PendingParty = {
          tempId,
          name: name.trim(),
          phone: phone?.trim() || undefined,
          taoLuc: new Date().toISOString(),
        };
        set((s) => ({ seq, pending: [...s.pending, item] }));
        return tempId;
      },

      remove: (tempId) =>
        set((s) => ({ pending: s.pending.filter((p) => p.tempId !== tempId) })),

      reset: () => set({ ownerUserId: undefined, pending: [], seq: 0 }),
    }),
    {
      name: PARTY_QUEUE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted) => persisted as Partial<PartyQueueState>,
      // Persist toàn bộ state (tên + SĐT + tempId + seq + owner) — tất cả trong
      // trần PII đã chốt (id + tên + SĐT). KHÔNG có field nhạy cảm nào khác.
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        pending: state.pending,
        seq: state.seq,
      }),
    },
  ),
);

/** Không để hàng đợi hộ của KTV này lẫn sang KTV khác trên cùng máy. */
export function reconcilePartyQueueForUser(userId: string | undefined) {
  const state = usePartyQueueStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
