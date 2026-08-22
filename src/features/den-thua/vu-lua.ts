import type { ChiTietThuHoach, MocCanhTac, NhatKyCanhTac } from './types';

/**
 * Vụ / lứa thu hoạch — VIEW DẪN XUẤT.
 *
 * KHÔNG là entity riêng; tính từ 3 nguồn: (a) mốc `thu_hoach*` trong mocs của
 * thửa (đã merge xác nhận thực tế bởi `useMocThua`), (b) nhật ký `thu_hoach`
 * gắn mocId (từ `ChiTietThuHoach.mocId`). Một nguồn sự thật, không sync 2
 * chiều; BE sau này có bảng `harvest_cycle` thì thay tầng derive này, UI không
 * đổi. Đánh dấu TẠM theo nguyên tắc 1 của skill.
 */

export interface LuaThua {
  mocId: string;
  lua?: number;
  nhan: string;
  ngayDuKien: string;
  /** Từ xác nhận mốc. */
  ngayThucTe?: string;
  /** Tổng `sanLuong` cộng dồn từ nhật ký thu_hoach có mocId này. */
  sanLuongCongDon: number;
  soNhatKy: number;
  trangThai: 'sap_toi' | 'cho_xac_nhan' | 'da_thu';
}

export interface ChuaGanLua {
  soNhatKy: number;
  sanLuong: number;
}

export interface TinhLuaKetQua {
  lua: LuaThua[];
  chuaGan: ChuaGanLua;
}

/** Trạng thái 1 lứa. */
function tinhTrangThai(
  ngayDuKien: string,
  ngayThucTe: string | undefined,
  bayGio: Date,
): LuaThua['trangThai'] {
  if (ngayThucTe) return 'da_thu';
  return new Date(ngayDuKien) <= bayGio ? 'cho_xac_nhan' : 'sap_toi';
}

/**
 * Tính danh sách vụ/lứa từ mocs (đã merge xác nhận) + nhật ký thu_hoach.
 *
 * Chỉ mocs `loai='thu_hoach'` mới thành lứa; các mốc canh tác khác không tính.
 * Nhật ký `mocId` không khớp lứa nào → gom vào `chuaGan` (không mất; hiện dòng
 * riêng để KTV biết có nhật ký lẻ).
 */
export function tinhLuaThua(
  mocs: MocCanhTac[],
  nhatKy: NhatKyCanhTac[] = [],
  bayGio: Date = new Date(),
): TinhLuaKetQua {
  const mocThuHoach = mocs.filter((m) => m.loai === 'thu_hoach');
  const idHopLe = new Set(mocThuHoach.map((m) => m.id));

  // Gom nhật ký thu_hoach theo mocId.
  const theoMoc = new Map<string, { sl: number; count: number }>();
  const chuaGan: ChuaGanLua = { soNhatKy: 0, sanLuong: 0 };
  for (const n of nhatKy) {
    if (n.loai !== 'thu_hoach') continue;
    const ct = (n.chiTiet ?? {}) as ChiTietThuHoach;
    const sl = ct.sanLuong ?? 0;
    if (ct.mocId && idHopLe.has(ct.mocId)) {
      const cu = theoMoc.get(ct.mocId) ?? { sl: 0, count: 0 };
      theoMoc.set(ct.mocId, { sl: cu.sl + sl, count: cu.count + 1 });
    } else {
      chuaGan.soNhatKy += 1;
      chuaGan.sanLuong += sl;
    }
  }

  const lua: LuaThua[] = mocThuHoach.map((m) => {
    const g = theoMoc.get(m.id);
    return {
      mocId: m.id,
      lua: m.lua,
      nhan: m.nhan,
      ngayDuKien: m.ngayDuKien,
      ngayThucTe: m.ngayThucTe,
      sanLuongCongDon: g?.sl ?? 0,
      soNhatKy: g?.count ?? 0,
      trangThai: tinhTrangThai(m.ngayDuKien, m.ngayThucTe, bayGio),
    };
  });

  return { lua, chuaGan };
}
