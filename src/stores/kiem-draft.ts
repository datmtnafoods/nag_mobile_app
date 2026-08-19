import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateKiemKeBody } from '../features/vat-tu/types';
import type { ViTri } from '../features/location/types';

export const KIEM_DRAFT_KEY = 'nag.kiem-draft';

export type KiemDraftLine = {
  vatTuId: string;
  tenSku: string;
  donViCoBan: string;
  /** Người đếm được — theo đơn vị cơ sở. */
  thucTe: number;
};

type KiemDraftState = {
  ownerUserId?: string;
  khoId?: string;
  dongKiem: KiemDraftLine[];
  ghiChu?: string;
  /** Toạ độ nơi đếm (không persist — đo lại mỗi lần mở wizard). */
  viTri?: ViTri;

  setOwner: (userId: string | undefined) => void;
  startDraft: () => void;
  setKho: (khoId: string | undefined) => void;
  /** Add row cho SKU chưa có; nếu đã có → return {duplicate: true, index}. Kiểm kê là đếm CHÍNH XÁC, không phải sự kiện +1. */
  addSku: (line: KiemDraftLine) => { duplicate: boolean; index: number };
  updateThucTe: (index: number, thucTe: number) => void;
  removeAt: (index: number) => void;
  setGhiChu: (v: string | undefined) => void;
  setViTri: (v: ViTri | undefined) => void;
  reset: () => void;

  toCreateBody: () => CreateKiemKeBody | null;
  toPatchBody: () => Partial<CreateKiemKeBody>;
};

export const useKiemDraftStore = create<KiemDraftState>()(
  persist(
    (set, get) => ({
      dongKiem: [],

      setOwner: (userId) => set({ ownerUserId: userId }),

      startDraft: () =>
        set({ khoId: undefined, dongKiem: [], ghiChu: undefined, viTri: undefined }),

      setKho: (khoId) => set({ khoId }),
      setGhiChu: (ghiChu) => set({ ghiChu }),
      setViTri: (viTri) => set({ viTri }),

      addSku: (line) => {
        const state = get();
        const existing = state.dongKiem.findIndex((d) => d.vatTuId === line.vatTuId);
        if (existing >= 0) {
          return { duplicate: true, index: existing };
        }
        set({ dongKiem: [...state.dongKiem, line] });
        return { duplicate: false, index: state.dongKiem.length };
      },

      updateThucTe: (index, thucTe) =>
        set((s) => {
          if (index < 0 || index >= s.dongKiem.length) return s;
          const next = [...s.dongKiem];
          next[index] = { ...next[index]!, thucTe: Math.max(0, thucTe) };
          return { dongKiem: next };
        }),

      removeAt: (index) =>
        set((s) => {
          if (index < 0 || index >= s.dongKiem.length) return s;
          const next = [...s.dongKiem];
          next.splice(index, 1);
          return { dongKiem: next };
        }),

      reset: () =>
        set({
          ownerUserId: undefined,
          khoId: undefined,
          dongKiem: [],
          ghiChu: undefined,
          viTri: undefined,
        }),

      toCreateBody: () => {
        const { khoId, dongKiem, ghiChu, viTri } = get();
        if (!khoId || !dongKiem.length) return null;
        return {
          khoId,
          ghiChu,
          viTri,
          dongKiem: dongKiem.map((d) => ({ vatTuId: d.vatTuId, thucTe: d.thucTe })),
        };
      },

      toPatchBody: () => {
        const { dongKiem, ghiChu } = get();
        return {
          ghiChu,
          dongKiem: dongKiem.map((d) => ({ vatTuId: d.vatTuId, thucTe: d.thucTe })),
        };
      },
    }),
    {
      name: KIEM_DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        khoId: state.khoId,
        dongKiem: state.dongKiem,
        ghiChu: state.ghiChu,
      }),
    },
  ),
);

/** Đảm bảo draft không lẫn giữa các user trên cùng thiết bị. */
export function reconcileKiemDraftForUser(userId: string | undefined) {
  const state = useKiemDraftStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
