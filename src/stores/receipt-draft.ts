import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreateReceiptBody,
  DraftLine,
  PartnerDraft,
  ReceiptKind,
} from '../features/vat-tu/types';
import { convertToBase } from '../features/vat-tu/unit-convert';

export const RECEIPT_DRAFT_KEY = 'nag.receipt-draft';

type ReceiptDraftState = {
  ownerUserId?: string;
  kind: ReceiptKind | null;
  khoId?: string;
  partner?: PartnerDraft;
  lines: DraftLine[];
  ghiChu?: string;

  setOwner: (userId: string | undefined) => void;
  startDraft: (kind: ReceiptKind) => void;
  setKho: (khoId: string | undefined) => void;
  setPartner: (partner: PartnerDraft | undefined) => void;
  addLine: (line: DraftLine) => void;
  updateLine: (index: number, patch: Partial<DraftLine>) => void;
  removeLine: (index: number) => void;
  setGhiChu: (v: string | undefined) => void;
  reset: () => void;

  totalBaseQuantity: () => number;
  totalAmount: () => number;
  toCreateBody: () => CreateReceiptBody | null;
};

function isSameLineKey(a: DraftLine, b: Pick<DraftLine, 'vatTuId' | 'lo'>): boolean {
  return a.vatTuId === b.vatTuId && (a.lo ?? '') === (b.lo ?? '');
}

export const useReceiptDraftStore = create<ReceiptDraftState>()(
  persist(
    (set, get) => ({
      kind: null,
      lines: [],

      setOwner: (userId) => set({ ownerUserId: userId }),

      startDraft: (kind) =>
        set({ kind, khoId: undefined, partner: undefined, lines: [], ghiChu: undefined }),

      setKho: (khoId) => set({ khoId }),
      setPartner: (partner) => set({ partner }),
      setGhiChu: (ghiChu) => set({ ghiChu }),

      addLine: (line) =>
        set((s) => {
          const idx = s.lines.findIndex((l) => isSameLineKey(l, line));
          if (idx >= 0) {
            const existing = s.lines[idx]!;
            // Cộng dồn: quy về đơn vị hiện có trong cart (giữ nguyên donVi cũ)
            const addedBase = convertToBase(line.soLuong, line.donVi, { heSoQuyDoi: line.heSoQuyDoi });
            const existingBase = convertToBase(existing.soLuong, existing.donVi, {
              heSoQuyDoi: existing.heSoQuyDoi,
            });
            const newBase = existingBase + addedBase;
            const newQty =
              existing.donVi === 'lon' && existing.heSoQuyDoi && existing.heSoQuyDoi > 0
                ? newBase / existing.heSoQuyDoi
                : newBase;
            const next = [...s.lines];
            next[idx] = { ...existing, soLuong: Math.round(newQty * 1000) / 1000 };
            return { lines: next };
          }
          return { lines: [...s.lines, line] };
        }),

      updateLine: (index, patch) =>
        set((s) => {
          if (index < 0 || index >= s.lines.length) return s;
          const next = [...s.lines];
          const existing = next[index]!;
          next[index] = { ...existing, ...patch };
          if (patch.soLuong !== undefined) {
            next[index]!.soLuong = Math.max(0.001, patch.soLuong);
          }
          return { lines: next };
        }),

      removeLine: (index) =>
        set((s) => {
          if (index < 0 || index >= s.lines.length) return s;
          const next = [...s.lines];
          next.splice(index, 1);
          return { lines: next };
        }),

      reset: () =>
        set({
          kind: null,
          khoId: undefined,
          partner: undefined,
          lines: [],
          ghiChu: undefined,
        }),

      totalBaseQuantity: () =>
        get().lines.reduce(
          (s, l) => s + convertToBase(l.soLuong, l.donVi, { heSoQuyDoi: l.heSoQuyDoi }),
          0,
        ),

      totalAmount: () =>
        get().lines.reduce((s, l) => {
          const base = convertToBase(l.soLuong, l.donVi, { heSoQuyDoi: l.heSoQuyDoi });
          const price = l.donGia ?? 0;
          return s + price * base;
        }, 0),

      toCreateBody: () => {
        const { kind, khoId, partner, lines, ghiChu } = get();
        if (!kind || !khoId || !lines.length) return null;
        const body: CreateReceiptBody = {
          khoId,
          ghiChu,
          anh: [],
          dongHang: lines.map((l) => ({
            vatTuId: l.vatTuId,
            soLuong: l.soLuong,
            donVi: l.donVi,
            lo: l.lo,
            hanDung: l.hanDung,
            serial: l.serial,
            donGia: l.donGia,
          })),
        };
        if (kind === 'nhap') {
          body.ncc = partner?.ten;
        } else {
          if (partner?.kind === 'nongHo') {
            body.nongHoId = partner.id;
            body.nongHoTen = partner.ten;
          } else {
            body.nongHoTen = partner?.ten ?? 'Khách lẻ';
          }
        }
        return body;
      },
    }),
    {
      name: RECEIPT_DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Persist chỉ meta + lines + ghiChu + ownerUserId. KHÔNG persist partner (PII).
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        kind: state.kind,
        khoId: state.khoId,
        lines: state.lines,
        ghiChu: state.ghiChu,
      }),
    },
  ),
);

/** Đảm bảo draft không lẫn giữa các user trên cùng thiết bị. */
export function reconcileReceiptDraftForUser(userId: string | undefined) {
  const state = useReceiptDraftStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
