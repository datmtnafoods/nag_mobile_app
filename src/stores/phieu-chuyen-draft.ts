import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreatePhieuChuyenKeHoachBody,
  DraftLine,
} from '../features/vat-tu/types';
import type { ViTri } from '../features/location/types';
import { convertToBase } from '../features/vat-tu/unit-convert';

/**
 * Draft-store phiếu chuyển kho W7 (K2).
 *
 * Khuôn nhóm B của repo (persist AsyncStorage, xem `receipt-draft.ts`). Kho tạm
 * trên xe = 1 luồng nhiều bước (chọn nguồn/đích → quét N dòng → gửi lệnh) mà
 * KTV hay bị gọi giữa chừng, app bị kill nền — không có khái niệm "mất dữ liệu
 * vì thoát màn". Tái dùng `DraftLine` + `convertToBase` của module vat-tu để
 * shape lệch không tăng thêm.
 */

export const PHIEU_CHUYEN_DRAFT_KEY = 'nag.phieu-chuyen-draft';

type PhieuChuyenDraftState = {
  ownerUserId?: string;
  khoNguonId?: string;
  khoDichId?: string;
  lines: DraftLine[];
  ghiChu?: string;
  /** Ảnh bằng chứng (data URL, không persist — data URI to, base64 chậm). */
  anh: string[];
  /** Toạ độ lập lệnh (không persist — đo lại mỗi lần mở wizard, GPS KTV nhạy cảm). */
  viTri?: ViTri;

  setOwner: (userId: string | undefined) => void;
  startDraft: () => void;
  setKhoNguon: (khoId: string | undefined) => void;
  setKhoDich: (khoId: string | undefined) => void;
  swapKho: () => void;
  addLine: (line: DraftLine) => void;
  updateLine: (index: number, patch: Partial<DraftLine>) => void;
  removeLine: (index: number) => void;
  setGhiChu: (v: string | undefined) => void;
  setAnh: (anh: string[]) => void;
  setViTri: (v: ViTri | undefined) => void;
  reset: () => void;

  totalBaseQuantity: () => number;
  /** Trả `null` khi chưa đủ điều kiện gửi — thà nút disable còn hơn KTV bấm
   *  giữa vườn rồi nhận 400. Chặn các case BE chắc chắn từ chối:
   *   - thiếu kho nguồn/đích (BE `thieu_kho`)
   *   - kho nguồn === kho đích (BE `kho_trung_nhau` + DB CHECK)
   *   - không có dòng hàng > 0
   *  Không chặn `nhan_qua_xuat` ở đây (chưa xuất, chưa biết) và không chặn
   *  `thieu_ton` (backend dry-run khi xác nhận xuất, mobile không có tồn kho
   *  authoritative). */
  toCreateBody: () => CreatePhieuChuyenKeHoachBody | null;
};

function isSameLineKey(a: DraftLine, b: Pick<DraftLine, 'vatTuId' | 'lo'>): boolean {
  return a.vatTuId === b.vatTuId && (a.lo ?? '') === (b.lo ?? '');
}

const INITIAL: Omit<
  PhieuChuyenDraftState,
  | 'setOwner'
  | 'startDraft'
  | 'setKhoNguon'
  | 'setKhoDich'
  | 'swapKho'
  | 'addLine'
  | 'updateLine'
  | 'removeLine'
  | 'setGhiChu'
  | 'setAnh'
  | 'setViTri'
  | 'reset'
  | 'totalBaseQuantity'
  | 'toCreateBody'
> = {
  ownerUserId: undefined,
  khoNguonId: undefined,
  khoDichId: undefined,
  lines: [],
  ghiChu: undefined,
  anh: [],
  viTri: undefined,
};

export const usePhieuChuyenDraftStore = create<PhieuChuyenDraftState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setOwner: (userId) => set({ ownerUserId: userId }),

      startDraft: () =>
        set({
          khoNguonId: undefined,
          khoDichId: undefined,
          lines: [],
          ghiChu: undefined,
          anh: [],
          viTri: undefined,
        }),

      setKhoNguon: (khoNguonId) => set({ khoNguonId }),
      setKhoDich: (khoDichId) => set({ khoDichId }),
      swapKho: () =>
        set((s) => ({ khoNguonId: s.khoDichId, khoDichId: s.khoNguonId })),

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

      setGhiChu: (ghiChu) => set({ ghiChu }),
      setAnh: (anh) => set({ anh }),
      setViTri: (viTri) => set({ viTri }),

      reset: () => set({ ...INITIAL }),

      totalBaseQuantity: () =>
        get().lines.reduce(
          (s, l) => s + convertToBase(l.soLuong, l.donVi, { heSoQuyDoi: l.heSoQuyDoi }),
          0,
        ),

      toCreateBody: () => {
        const { khoNguonId, khoDichId, lines, ghiChu, anh, viTri } = get();
        if (!khoNguonId || !khoDichId) return null;
        if (khoNguonId === khoDichId) return null;
        if (!lines.length) return null;
        // Dòng chuyển kho nội bộ KHÔNG có `donGia` — giá vốn là việc của server
        // (kế thừa từ dòng nhập gốc qua ledger). Bỏ hẳn cho khớp DDL.
        const dongHang = lines.map((l) => ({
          vatTuId: l.vatTuId,
          soLuong: l.soLuong,
          donVi: l.donVi,
          lo: l.lo,
          hanDung: l.hanDung,
          serial: l.serial,
        }));
        return {
          khoNguonId,
          khoDichId,
          dongHang,
          ghiChu,
          anh: anh ?? [],
          viTri,
        };
      },
    }),
    {
      name: PHIEU_CHUYEN_DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 khởi tạo — migrate no-op để tránh warning zustand khi bump version sau.
      migrate: (persisted) => persisted as Partial<PhieuChuyenDraftState>,
      // KHÔNG persist `anh` (data URI to) và `viTri` (GPS KTV nhạy cảm, đo lại
      // rẻ). Chỉ giữ phần gõ tay + owner.
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        khoNguonId: state.khoNguonId,
        khoDichId: state.khoDichId,
        lines: state.lines,
        ghiChu: state.ghiChu,
      }),
    },
  ),
);

/** Đảm bảo draft không lẫn giữa các user trên cùng thiết bị (hai KTV dùng chung
 *  máy là kịch bản thật). Gọi ngay sau đăng nhập/đăng ký thành công. */
export function reconcilePhieuChuyenDraftForUser(userId: string | undefined) {
  const state = usePhieuChuyenDraftStore.getState();
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.reset();
  }
  state.setOwner(userId);
}
