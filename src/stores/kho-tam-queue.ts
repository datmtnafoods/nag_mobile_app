import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoaiXe } from '../features/vat-tu/types';

export const KHO_TAM_QUEUE_KEY = 'nag.kho-tam-queue';

/**
 * Một kho tạm (kho xe) khai NHANH khi offline, chờ đồng bộ lên backend.
 *
 * Nghiệp vụ "tạo kho tạm trên app" (xem `api/erp/warehouse.ts#taoKhoTam`): KTV
 * ngoài vườn tự tạo xe để chuyển/bán, không chờ admin. Khi có mạng lại
 * `api/erp/kho-sync.ts#flushKhoQueue()` đẩy lên BE và map tempId→id thật.
 *
 * KHÔNG chứa PII (chỉ tên kho + custodian id = chính KTV) nên persist toàn bộ —
 * khác `party-queue.ts` phải giới hạn trần PII.
 */
export type PendingKhoTam = {
  /** Id tạm 'LOCAL-KHO-<n>' — dùng ngay ở app cho tới khi sync ra id thật. */
  tempId: string;
  ten: string;
  loaiXe: LoaiXe;
  custodianUserId: string;
  custodianName?: string;
  /** ISO — chỉ để hiển thị/sắp xếp, không nghiệp vụ. */
  taoLuc: string;
};

type KhoTamQueueState = {
  ownerUserId?: string;
  pending: PendingKhoTam[];
  /** Bộ đếm sinh tempId ổn định (không dùng Date.now/random để id tái lập được). */
  seq: number;

  setOwner: (userId: string | undefined) => void;
  /** Xếp một kho tạm vào hàng đợi. Trả tempId để màn dùng/chọn ngay. */
  enqueue: (input: {
    ten: string;
    loaiXe: LoaiXe;
    custodianUserId: string;
    custodianName?: string;
  }) => string;
  remove: (tempId: string) => void;
  reset: () => void;
};

export const useKhoTamQueueStore = create<KhoTamQueueState>()(
  persist(
    (set, get) => ({
      pending: [],
      seq: 0,

      setOwner: (userId) => set({ ownerUserId: userId }),

      enqueue: ({ ten, loaiXe, custodianUserId, custodianName }) => {
        const seq = get().seq + 1;
        const tempId = `LOCAL-KHO-${seq}`;
        const item: PendingKhoTam = {
          tempId,
          ten: ten.trim(),
          loaiXe,
          custodianUserId,
          custodianName,
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
      name: KHO_TAM_QUEUE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted) => persisted as Partial<KhoTamQueueState>,
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        pending: state.pending,
        seq: state.seq,
      }),
    },
  ),
);

/** Không để hàng đợi kho tạm của KTV này lẫn sang KTV khác trên cùng máy. */
export function reconcileKhoTamQueueForUser(userId: string | undefined) {
  const state = useKhoTamQueueStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
