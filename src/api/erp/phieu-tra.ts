import { MOCK_API } from '../client';
import type {
  CreatePhieuTraBody,
  DongHangNhapLieu,
  LanThu,
  PhieuBan,
  PhieuTra,
} from '../../features/vat-tu/types';
import {
  MOCK_KHO,
  MOCK_MOVES_STORE,
  MOCK_PHIEU_STORE,
  MOCK_PHIEU_TRA_STORE,
  MOCK_VATTU,
  nextLanThuId,
  nextMoveId,
  nextPhieuId,
} from '../../mocks/vat-tu.mock';
import { convertToBase } from '../../features/vat-tu/unit-convert';
import { conNo } from '../../features/vat-tu/payment';

/**
 * Phiếu khách trả (khach_tra) — đổi/trả một phần từ phiếu bán gốc. LỚP TIỀN +
 * xuất/nhập, backend CHƯA CÓ (KHO_VAT_TU_V1 §K4). Toàn bộ mock-first.
 *
 * Endpoint giả định khi có BE:
 *   POST /kho/phieu-tra   body CreatePhieuTraBody → {phieu}
 *   GET  /kho/phieu-tra?phieuGocId=&khoId=        → {rows,total}
 *   GET  /kho/phieu-tra/:id                       → {phieu}
 *
 * Quy tắc mock (giữ nghiêm bằng thật để nối BE không vỡ):
 *  - Phiếu gốc phải là phiếu BÁN đã `ghi`.
 *  - Số trả mỗi SKU (base) + đã trả trước ≤ đã bán → chặn `tra_vuot_so_luong`.
 *  - Giá trả lấy đơn giá DÒNG GỐC theo vatTuId+lo. Giảm giá toàn phiếu KHÔNG
 *    phân bổ vào giá trả (hạn chế đã biết — ghi rõ để đợt nối BE cân nhắc).
 *  - Tiền: trừ nợ TRƯỚC, hoàn SAU. giamNo = min(giaTri, conNo); hoanTien = phần
 *    còn lại → push LanThu ÂM vào phiếu gốc (daThu -= hoanTien); daTra += giaTri.
 *  - Moves: mỗi dòng huong='in', chungTuLoai='khach_tra', kho = kho phiếu gốc.
 */

const MOCK_DELAY = 300;

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayShort(): string {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Base units một dòng (đơn vị cơ sở của SKU). */
function baseOf(d: DongHangNhapLieu): number {
  const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
  return convertToBase(d.soLuong, d.donVi, {
    heSoQuyDoi: d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi,
  });
}

/** Đã bán mỗi SKU (base) trên phiếu gốc. */
function soldBaseByVatTu(goc: PhieuBan): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of goc.dongHang) m.set(d.vatTuId, (m.get(d.vatTuId) ?? 0) + baseOf(d));
  return m;
}

/** Đã trả mỗi SKU (base) trên các phiếu trả 'ghi' cùng phiếu gốc. */
function returnedBaseByVatTu(phieuGocId: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const pt of MOCK_PHIEU_TRA_STORE) {
    if (pt.phieuGocId !== phieuGocId || pt.trangThai !== 'ghi') continue;
    for (const d of pt.dongHang) m.set(d.vatTuId, (m.get(d.vatTuId) ?? 0) + baseOf(d));
  }
  return m;
}

/** Đơn giá dòng gốc theo vatTuId (ưu tiên đúng lô, fallback SKU đầu tiên). */
function donGiaGoc(goc: PhieuBan, vatTuId: string, lo?: string): number {
  const exact = goc.dongHang.find((d) => d.vatTuId === vatTuId && (d.lo ?? '') === (lo ?? ''));
  const any = goc.dongHang.find((d) => d.vatTuId === vatTuId);
  const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
  return exact?.donGia ?? any?.donGia ?? sku?.giaBan ?? 0;
}

export async function createPhieuTra(body: CreatePhieuTraBody): Promise<PhieuTra> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!body.lyDo?.trim()) {
      throw new MockApiError('Phải nêu lý do trả hàng.', 'thieu_ly_do', 400);
    }
    const dongTra = (body.dongHang ?? []).filter((d) => baseOf(d) > 0);
    if (!dongTra.length) {
      throw new MockApiError('Chọn ít nhất một dòng để trả.', 'empty_dong_hang', 400);
    }
    const goc = MOCK_PHIEU_STORE.find((p) => p.id === body.phieuGocId);
    if (!goc || goc.kind !== 'ban') {
      throw new MockApiError('Không tìm thấy phiếu bán gốc.', 'phieu_goc_khong_hop_le', 404);
    }
    const gocBan = goc as PhieuBan;
    if (gocBan.trangThai !== 'ghi') {
      throw new MockApiError(
        'Phiếu bán gốc đã huỷ — không trả hàng được.',
        'phieu_goc_khong_hop_le',
        409,
      );
    }

    // Giới hạn per-SKU theo base unit: trả lần này + đã trả trước ≤ đã bán.
    const sold = soldBaseByVatTu(gocBan);
    const returned = returnedBaseByVatTu(gocBan.id);
    const nowBase = new Map<string, number>();
    for (const d of dongTra) nowBase.set(d.vatTuId, (nowBase.get(d.vatTuId) ?? 0) + baseOf(d));
    for (const [vatTuId, need] of nowBase) {
      const daBan = sold.get(vatTuId) ?? 0;
      const daTra = returned.get(vatTuId) ?? 0;
      const conTraDuoc = daBan - daTra;
      if (need > conTraDuoc + 1e-6) {
        const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
        throw new MockApiError(
          `"${sku?.ten ?? vatTuId}" chỉ còn trả được ${Math.max(0, conTraDuoc)} ${
            sku?.donViCoBan ?? ''
          }.`,
          'tra_vuot_so_luong',
          409,
        );
      }
    }

    // Giá trị trả = Σ đơn giá gốc × base.
    let giaTri = 0;
    for (const d of dongTra) giaTri += donGiaGoc(gocBan, d.vatTuId, d.lo) * baseOf(d);

    // Tiền: trừ nợ trước, hoàn sau.
    const con = conNo(gocBan);
    const giamNo = Math.min(giaTri, Math.max(0, con));
    const hoanTien = Math.max(0, giaTri - giamNo);

    const shortDate = todayShort();
    const id = nextPhieuId('khach_tra', shortDate);
    const kho = MOCK_KHO.find((k) => k.id === gocBan.khoId);
    const taoLuc = nowIso();

    const phieu: PhieuTra = {
      id,
      phieuGocId: gocBan.id,
      khoId: gocBan.khoId,
      khoTen: kho?.ten,
      trangThai: 'ghi',
      lyDo: body.lyDo.trim(),
      dongHang: dongTra.map((d) => ({ ...d, donGia: donGiaGoc(gocBan, d.vatTuId, d.lo) })),
      giaTri,
      giamNo,
      hoanTien,
      phuongThucHoan: hoanTien > 0 ? body.phuongThucHoan ?? 'tien_mat' : undefined,
      anh: body.anh ?? [],
      viTri: body.viTri,
      nguoiTao: 'Admin',
      taoLuc,
    };
    MOCK_PHIEU_TRA_STORE.unshift(phieu);

    // Cập nhật phiếu gốc: hàng trả + hoàn tiền (LanThu âm).
    gocBan.daTra = (gocBan.daTra ?? 0) + giaTri;
    if (hoanTien > 0) {
      const lan: LanThu = {
        id: nextLanThuId(),
        soTien: -hoanTien,
        phuongThuc: body.phuongThucHoan ?? 'tien_mat',
        ghiChu: `Hoàn tiền phiếu trả ${id}`,
        nguoiThu: 'Admin',
        thuLuc: taoLuc,
      };
      gocBan.lanThu = [...(gocBan.lanThu ?? []), lan];
      gocBan.daThu = (gocBan.daThu ?? 0) - hoanTien;
    }

    // Moves nhập lại kho.
    for (const d of dongTra) {
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: gocBan.khoId,
        huong: 'in',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: baseOf(d),
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: donGiaGoc(gocBan, d.vatTuId, d.lo),
        chungTuLoai: 'khach_tra',
        chungTuId: id,
        nguoiTao: 'Admin',
        taoLuc,
      });
    }
    return phieu;
  }
  throw new Error('Backend chưa có API trả hàng — dự kiến POST /kho/phieu-tra (lớp TIỀN K4).');
}

export async function listPhieuTra(
  query: { phieuGocId?: string; khoId?: string } = {},
): Promise<PhieuTra[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_PHIEU_TRA_STORE.filter((p) => {
      if (query.phieuGocId && p.phieuGocId !== query.phieuGocId) return false;
      if (query.khoId && p.khoId !== query.khoId) return false;
      return true;
    }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
  }
  throw new Error('Backend chưa có API trả hàng — dự kiến GET /kho/phieu-tra.');
}

export async function getPhieuTra(id: string): Promise<PhieuTra> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 150));
    const phieu = MOCK_PHIEU_TRA_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu trả.', 'khong_tim_thay', 404);
    return phieu;
  }
  throw new Error('Backend chưa có API trả hàng — dự kiến GET /kho/phieu-tra/:id.');
}
