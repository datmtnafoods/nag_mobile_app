import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreateReceiptBody,
  DraftLine,
  PartnerDraft,
  ReceiptKind,
} from '../features/vat-tu/types';
import type { ViTri } from '../features/location/types';
import { convertToBase } from '../features/vat-tu/unit-convert';

export const RECEIPT_DRAFT_KEY = 'nag.receipt-draft';

type ReceiptDraftState = {
  ownerUserId?: string;
  kind: ReceiptKind | null;
  khoId?: string;
  partner?: PartnerDraft;
  lines: DraftLine[];
  ghiChu?: string;
  // Nhập kho: metadata bổ sung
  expectedOn?: string;
  soHoaDon?: string;
  giamGia?: number;
  /** Ảnh bằng chứng (data URL, không persist). */
  anh: string[];
  /** Toạ độ nơi lập phiếu (không persist — đo lại mỗi lần mở wizard). */
  viTri?: ViTri;

  setOwner: (userId: string | undefined) => void;
  startDraft: (kind: ReceiptKind) => void;
  setKho: (khoId: string | undefined) => void;
  setPartner: (partner: PartnerDraft | undefined) => void;
  addLine: (line: DraftLine) => void;
  updateLine: (index: number, patch: Partial<DraftLine>) => void;
  removeLine: (index: number) => void;
  setGhiChu: (v: string | undefined) => void;
  setExpectedOn: (v: string | undefined) => void;
  setSoHoaDon: (v: string | undefined) => void;
  setGiamGia: (v: number | undefined) => void;
  setAnh: (anh: string[]) => void;
  setViTri: (v: ViTri | undefined) => void;
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
      anh: [],

      setOwner: (userId) => set({ ownerUserId: userId }),

      startDraft: (kind) =>
        set({
          kind,
          khoId: undefined,
          partner: undefined,
          lines: [],
          ghiChu: undefined,
          expectedOn: undefined,
          soHoaDon: undefined,
          giamGia: undefined,
          anh: [],
          viTri: undefined,
        }),

      setKho: (khoId) => set({ khoId }),
      setPartner: (partner) => set({ partner }),
      setGhiChu: (ghiChu) => set({ ghiChu }),
      setExpectedOn: (v) => set({ expectedOn: v }),
      setSoHoaDon: (v) => set({ soHoaDon: v }),
      setGiamGia: (v) => set({ giamGia: v }),
      setAnh: (anh) => set({ anh }),
      setViTri: (viTri) => set({ viTri }),

      addLine: (line) =>
        set((s) => {
          const idx = s.lines.findIndex((l) => isSameLineKey(l, line));
          if (idx >= 0) {
            const existing = s.lines[idx]!;
            const addedBase = convertToBase(line.soLuong, line.donVi, {
              heSoQuyDoi: line.heSoQuyDoi,
            });
            const existingBase = convertToBase(existing.soLuong, existing.donVi, {
              heSoQuyDoi: existing.heSoQuyDoi,
            });
            const newBase = existingBase + addedBase;
            const newQty =
              existing.donVi === 'lon' && existing.heSoQuyDoi && existing.heSoQuyDoi > 0
                ? newBase / existing.heSoQuyDoi
                : newBase;
            const next = [...s.lines];
            next[idx] = {
              ...existing,
              soLuong: Math.round(newQty * 1000) / 1000,
              donGia: line.donGia ?? existing.donGia,
              hanDung: line.hanDung ?? existing.hanDung,
              serial: line.serial ?? existing.serial,
            };
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
          ownerUserId: undefined,
          kind: null,
          khoId: undefined,
          partner: undefined,
          lines: [],
          ghiChu: undefined,
          expectedOn: undefined,
          soHoaDon: undefined,
          giamGia: undefined,
          anh: [],
          viTri: undefined,
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
        const { kind, khoId, partner, lines, ghiChu, expectedOn, soHoaDon, giamGia, anh, viTri } =
          get();
        if (!kind || !khoId || !lines.length) return null;
        const body: CreateReceiptBody = {
          khoId,
          ghiChu,
          anh: anh ?? [],
          viTri,
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
          body.nccId = partner?.id;
          if (expectedOn) body.expectedOn = expectedOn;
          if (soHoaDon) body.soHoaDon = soHoaDon;
          if (giamGia != null) body.giamGia = giamGia;
        } else if (kind === 'ban') {
          // Khách hàng BẮT BUỘC có hồ sơ — backend ném 400 `thieu_khach_hang`
          // nếu thiếu partyId. Chặn ngay ở đây thay vì để server từ chối.
          if (!partner?.id) return null;
          body.partyId = partner.id;
          body.partyName = partner.ten;
          body.partyKind = 'household';
          if (giamGia != null) body.giamGia = giamGia;
        }
        return body;
      },
    }),
    {
      name: RECEIPT_DRAFT_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 → v2 chỉ thêm optional field (expectedOn/soHoaDon/giamGia/nccId) — shape v1
      // backward-compat, migrate no-op để tránh warning "no migrate function".
      migrate: (persisted) => persisted as Partial<ReceiptDraftState>,
      // Persist chỉ meta + lines + ghiChu + expectedOn + soHoaDon + giamGia + ownerUserId.
      // KHÔNG persist partner (PII) hay anh (data URI to, base64 slow re-encode).
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        kind: state.kind,
        khoId: state.khoId,
        lines: state.lines,
        ghiChu: state.ghiChu,
        expectedOn: state.expectedOn,
        soHoaDon: state.soHoaDon,
        giamGia: state.giamGia,
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
