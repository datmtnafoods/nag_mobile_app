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
  lines: OrderLine[];
  customer?: CustomerDraft;
  delivery?: OrderDelivery;
  note?: string;

  addLine: (line: OrderLine) => void;
  updateLineQuantity: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  setCustomer: (customer: CustomerDraft | undefined) => void;
  setDelivery: (delivery: OrderDelivery | undefined) => void;
  setNote: (note: string | undefined) => void;
  reset: () => void;

  totalQuantity: () => number;
  totalAmount: () => number;
  toCreateBody: () => {
    customers: Array<Pick<OrderCustomer, 'partyId' | 'phones' | 'name' | 'lines' | 'deliveries'>>;
    note?: string;
  } | null;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

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

      reset: () => set({ lines: [], customer: undefined, delivery: undefined, note: undefined }),

      totalQuantity: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      totalAmount: () =>
        get().lines.reduce((s, l) => s + (l.amount ?? l.unitPrice * l.quantity), 0),

      toCreateBody: () => {
        const { lines, customer, delivery, note } = get();
        if (!lines.length) return null;
        if (!delivery) return null;
        return {
          note,
          customers: [
            {
              partyId: customer?.partyId,
              name: customer?.name,
              phones: customer?.phones,
              deliveries: [delivery],
              lines: lines.map((l) => ({
                nurseryId: l.nurseryId,
                seedProductId: l.seedProductId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              })),
            },
          ],
        };
      },
    }),
    {
      name: 'nag.cart',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist chỉ lines + note (không giữ PII customer/delivery giữa session).
      partialize: (state) => ({ lines: state.lines, note: state.note }),
    },
  ),
);
