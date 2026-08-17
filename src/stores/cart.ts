import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrderCustomer, OrderDelivery, OrderLine } from '../features/orders/types';

type CustomerDraft = {
  partyId?: string;
  name?: string;
  phones?: string[];
};

type CartState = {
  ownerUserId?: string;
  lines: OrderLine[];
  customer?: CustomerDraft;
  delivery?: OrderDelivery;
  note?: string;

  setOwner: (userId: string | undefined) => void;
  addLine: (line: OrderLine) => void;
  updateLineQuantity: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  setCustomer: (customer: CustomerDraft | undefined) => void;
  setDelivery: (delivery: OrderDelivery | undefined) => void;
  setNote: (note: string | undefined) => void;
  reset: () => void;

  totalQuantity: () => number;
  totalAmount: () => number;
  toCreateBody: (opts?: { asDraft?: boolean }) => {
    customers: Array<Pick<OrderCustomer, 'partyId' | 'phones' | 'name' | 'lines' | 'deliveries'>>;
    note?: string;
  } | null;
};

export const CART_STORAGE_KEY = 'nag.cart';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      setOwner: (userId) => set({ ownerUserId: userId }),

      addLine: (line) =>
        set((s) => {
          const existingIdx = s.lines.findIndex(
            (l) => l.nurseryId === line.nurseryId && l.seedProductId === line.seedProductId,
          );
          if (existingIdx >= 0) {
            const next = [...s.lines];
            const existing = next[existingIdx]!;
            const quantity = existing.quantity + line.quantity;
            next[existingIdx] = {
              ...existing,
              quantity,
              amount: existing.unitPrice * quantity,
            };
            return { lines: next };
          }
          return {
            lines: [
              ...s.lines,
              { ...line, amount: line.unitPrice * line.quantity },
            ],
          };
        }),

      updateLineQuantity: (index, quantity) =>
        set((s) => {
          if (index < 0 || index >= s.lines.length) return s;
          const q = Math.max(1, Math.floor(quantity));
          const next = [...s.lines];
          const target = next[index]!;
          next[index] = { ...target, quantity: q, amount: target.unitPrice * q };
          return { lines: next };
        }),

      removeLine: (index) =>
        set((s) => {
          if (index < 0 || index >= s.lines.length) return s;
          const next = [...s.lines];
          next.splice(index, 1);
          return { lines: next };
        }),

      setCustomer: (customer) => set({ customer }),
      setDelivery: (delivery) => set({ delivery }),
      setNote: (note) => set({ note }),

      reset: () =>
        set({
          lines: [],
          customer: undefined,
          delivery: undefined,
          note: undefined,
        }),

      totalQuantity: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      totalAmount: () =>
        get().lines.reduce((s, l) => s + (l.amount ?? l.unitPrice * l.quantity), 0),

      toCreateBody: (opts) => {
        const { lines, customer, delivery, note } = get();
        if (!lines.length) return null;
        const asDraft = Boolean(opts?.asDraft);
        if (!asDraft && !delivery) return null;
        return {
          note,
          customers: [
            {
              partyId: customer?.partyId,
              name: customer?.name,
              phones: customer?.phones,
              deliveries: delivery ? [delivery] : [],
              lines: lines.map((l) => ({
                nurseryId: l.nurseryId,
                seedProductId: l.seedProductId,
                quantity: l.quantity,
                // NOTE: unitPrice có thể cũ khi cart persist qua nhiều ngày.
                // Backend nên là source-of-truth về giá; client chỉ estimate.
                unitPrice: l.unitPrice,
              })),
            },
          ],
        };
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Persist lines + note + ownerUserId. KHÔNG persist customer/delivery vì là PII.
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        lines: state.lines,
        note: state.note,
      }),
    },
  ),
);

/**
 * Gọi khi user login mới. Nếu cart persisted thuộc user khác → clear để tránh
 * lẫn dữ liệu giữa các tài khoản trên cùng thiết bị.
 */
export function reconcileCartForUser(userId: string | undefined) {
  const state = useCartStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
