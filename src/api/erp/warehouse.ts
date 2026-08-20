import { client, MOCK_API } from '../client';
import type {
  CreateKiemKeBody,
  CreateReceiptBody,
  DongHangNhapLieu,
  Kho,
  KhoMove,
  ListReceiptsQuery,
  Paginated,
  PhieuBan,
  PhieuFull,
  PhieuHeader,
  PhieuKiemKe,
  PhieuNhap,
  ReceiptKind,
  TonKhoRow,
} from '../../features/vat-tu/types';
import {
  MOCK_KHO,
  MOCK_MOVES_STORE,
  MOCK_PHIEU_STORE,
  MOCK_VATTU,
  nextMoveId,
  nextPhieuId,
  sumStock,
  tonKhoTable,
} from '../../mocks/vat-tu.mock';
import { convertToBase } from '../../features/vat-tu/unit-convert';

const MOCK_DELAY = 300;
function delay<T>(v: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
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

function paginate<T>(all: T[], page = 1, pageSize = 50): Paginated<T> {
  const total = all.length;
  const start = (page - 1) * pageSize;
  return { data: all.slice(start, start + pageSize), meta: { total, page, pageSize } };
}

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ============ KHO / STOCK / MOVES ============

export async function listKho(): Promise<Kho[]> {
  if (MOCK_API) return delay(MOCK_KHO);
  const { data } = await client.get<{ data: Kho[] }>('/kho');
  return data.data;
}

export async function getStock(input: { khoId: string; vatTuId: string }): Promise<{
  soLuong: number;
  donViCoBan: string;
}> {
  const { khoId, vatTuId } = input;
  if (MOCK_API) {
    const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
    return delay({ soLuong: sumStock(khoId, vatTuId), donViCoBan: sku?.donViCoBan ?? '' });
  }
  const { data } = await client.get<{ data: Array<{ khoId: string; vatTuId: string; soLuong: number }> }>(
    '/kho/ton',
    { params: { khoId, vatTuId } },
  );
  const row = data.data[0];
  const sku = row ? MOCK_VATTU.find((v) => v.id === row.vatTuId) : undefined;
  return { soLuong: row?.soLuong ?? 0, donViCoBan: sku?.donViCoBan ?? '' };
}

/** Bảng tồn full list — dùng cho TonKho tab. */
export async function tonKho(query: { khoId?: string } = {}): Promise<TonKhoRow[]> {
  if (MOCK_API) return delay(tonKhoTable(query.khoId));
  const { data } = await client.get<{ data: TonKhoRow[] }>('/kho/ton', { params: query });
  return data.data;
}

export async function getMoves(input: {
  khoId?: string;
  vatTuId?: string;
  chungTuId?: string;
  from?: string;
  to?: string;
}): Promise<KhoMove[]> {
  if (MOCK_API) {
    return delay(
      MOCK_MOVES_STORE.filter((m) => {
        if (input.khoId && m.khoId !== input.khoId) return false;
        if (input.vatTuId && m.vatTuId !== input.vatTuId) return false;
        if (input.chungTuId && m.chungTuId !== input.chungTuId) return false;
        return true;
      }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)),
    );
  }
  const { data } = await client.get<{ data: KhoMove[] }>('/kho/moves', { params: input });
  return data.data;
}

// ============ PHIẾU (list + detail) ============

export async function listReceipts(query: ListReceiptsQuery): Promise<Paginated<PhieuHeader>> {
  const { kind, khoId, status, nccId, partyId, from, to, q, page = 1, pageSize = 50 } = query;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = MOCK_PHIEU_STORE.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false;
      if (khoId && p.khoId !== khoId) return false;
      if (status && status !== 'all' && p.trangThai !== status) return false;
      if (nccId && p.kind === 'nhap' && p.nccId !== nccId) return false;
      if (partyId && !(p.kind === 'ban' && p.partyId === partyId)) return false;
      if (from && p.taoLuc < from) return false;
      if (to && p.taoLuc > to) return false;
      if (needle) {
        const hay = `${p.id} ${p.partnerTen ?? ''} ${
          p.kind === 'nhap' ? p.ncc ?? '' : ''
        } ${p.kind === 'ban' ? p.partyName ?? '' : ''}`.toLowerCase();
        return hay.includes(needle);
      }
      return true;
    }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
    return delay(paginate(filtered, page, pageSize));
  }
  if (kind === 'all') {
    const [nhap, ban, kiem] = await Promise.all([
      client.get<Paginated<PhieuHeader>>('/kho/phieu-nhap', {
        params: { khoId, status, nccId, from, to, q, page, pageSize },
      }),
      client.get<Paginated<PhieuHeader>>('/kho/phieu-ban', {
        params: { khoId, status, from, to, q, page, pageSize },
      }),
      client.get<Paginated<PhieuHeader>>('/kho/phieu-kiem', {
        params: { khoId, status, from, to, q, page, pageSize },
      }),
    ]);
    const merged = [...nhap.data.data, ...ban.data.data, ...kiem.data.data].sort((a, b) =>
      b.taoLuc.localeCompare(a.taoLuc),
    );
    return { data: merged, meta: { total: merged.length, page, pageSize } };
  }
  const path =
    kind === 'nhap' ? '/kho/phieu-nhap' : kind === 'ban' ? '/kho/phieu-ban' : '/kho/phieu-kiem';
  const { data } = await client.get<Paginated<PhieuHeader>>(path, {
    params: { khoId, status, nccId, partyId, from, to, q, page, pageSize },
  });
  // BACKEND CHƯA LỌC theo partyId — `svc.listPhieuBan()` không nhận tham số, chỉ
  // `core/list.js` cắt offset/limit. Lọc lại ở client để màn "lịch sử mua của hộ"
  // không hiện phiếu của hộ khác. Bỏ được khi BE thêm filter (xem PROGRESS).
  if (partyId) {
    const rows = data.data.filter((p) => p.kind === 'ban' && p.partyId === partyId);
    return { data: rows, meta: { ...data.meta, total: rows.length } };
  }
  return data;
}

export async function getReceipt(id: string): Promise<PhieuFull> {
  if (MOCK_API) {
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu', 'khong_tim_thay', 404);
    const dongHang =
      phieu.kind === 'kiem_ke'
        ? []
        : phieu.dongHang.map((d) => {
            // Ưu tiên snapshot đã lưu; chỉ fallback sang live SKU khi phiếu cũ chưa có
            // snapshot (backwards-compat). Đảm bảo phiếu đã ghi không bị đổi khi
            // admin edit SKU về sau.
            const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
            const heSo = d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi;
            const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: heSo });
            return {
              vatTuId: d.vatTuId,
              tenSku: d.tenSkuSnapshot ?? sku?.ten,
              donViCoBan: d.donViCoBanSnapshot ?? sku?.donViCoBan ?? '',
              donViLon: d.donViLonSnapshot ?? sku?.donViLon,
              heSoQuyDoi: heSo,
              soLuong: d.soLuong,
              donVi: d.donVi,
              soLuongCoBan: base,
              lo: d.lo,
              hanDung: d.hanDung,
              serial: d.serial,
              donGia: d.donGia,
            };
          });
    return delay({ phieu, dongHang });
  }
  const { data } = await client.get<{ data: PhieuFull }>(`/kho/phieu/${id}`);
  return data.data;
}

/** Enrich body dòng hàng với snapshot meta trước khi persist vào phiếu. */
function enrichSnapshot(lines: DongHangNhapLieu[]): DongHangNhapLieu[] {
  return lines.map((d) => {
    const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
    return {
      ...d,
      tenSkuSnapshot: d.tenSkuSnapshot ?? sku?.ten,
      donViCoBanSnapshot: d.donViCoBanSnapshot ?? sku?.donViCoBan,
      donViLonSnapshot: d.donViLonSnapshot ?? sku?.donViLon,
      heSoQuyDoiSnapshot: d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi,
    };
  });
}

// ============ NHẬP KHO (ghi thẳng + 2-pha) ============

function computeTotals(lines: DongHangNhapLieu[]): { tongSoLuong: number; tongTien: number } {
  let tongSoLuong = 0;
  let tongTien = 0;
  for (const d of lines) {
    const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
    const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
    tongSoLuong += base;
    const gia = d.donGia ?? sku?.giaBan ?? 0;
    tongTien += gia * base;
  }
  return { tongSoLuong, tongTien };
}

/** Nhập kho GHI THẲNG (không qua kế hoạch). */
async function mockCreatePhieuNhap(body: CreateReceiptBody): Promise<PhieuFull> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY + 100));
  if (!body.ncc || !body.ncc.trim()) {
    throw new MockApiError('Thiếu tên NCC.', 'thieu_ncc', 400);
  }
  if (!body.dongHang.length) {
    throw new MockApiError('Phiếu phải có ít nhất một dòng hàng.', 'empty_dong_hang', 400);
  }
  const shortDate = todayShort();
  const id = nextPhieuId('nhap', shortDate);
  const kho = MOCK_KHO.find((k) => k.id === body.khoId);
  const taoLuc = nowIso();
  const totals = computeTotals(body.dongHang);
  const phieu: PhieuNhap = {
    id,
    kind: 'nhap',
    khoId: body.khoId,
    khoTen: kho?.ten,
    partnerTen: body.ncc,
    ncc: body.ncc.trim(),
    nccId: body.nccId,
    trangThai: 'ghi',
    ghiChu: body.ghiChu,
    tongSoLuong: totals.tongSoLuong,
    tongTien: Math.max(0, totals.tongTien - (body.giamGia ?? 0)),
    nguoiTao: 'Admin',
    taoLuc,
    anh: body.anh ?? [],
    viTri: body.viTri,
    dongHang: enrichSnapshot(body.dongHang),
    expectedOn: body.expectedOn,
    soHoaDon: body.soHoaDon,
    giamGia: body.giamGia,
  };
  MOCK_PHIEU_STORE.unshift(phieu);
  for (const d of body.dongHang) {
    const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
    const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
    MOCK_MOVES_STORE.push({
      id: nextMoveId(),
      khoId: body.khoId,
      huong: 'in',
      loaiHang: 'vat_tu',
      vatTuId: d.vatTuId,
      soLuong: base,
      lo: d.lo,
      hanDung: d.hanDung,
      serial: d.serial,
      donGia: d.donGia,
      chungTuLoai: 'nhap',
      chungTuId: id,
      nguoiTao: 'Admin',
      taoLuc,
    });
  }
  return getReceipt(id);
}

export async function createPhieuNhap(body: CreateReceiptBody): Promise<PhieuFull> {
  if (MOCK_API) return mockCreatePhieuNhap(body);
  const { data } = await client.post<{ data: PhieuFull }>('/kho/phieu-nhap', body);
  return data.data;
}

/** Nhập kho LƯU TẠM — chưa vào sổ. */
export async function createPhieuNhapKeHoach(body: CreateReceiptBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!body.ncc || !body.ncc.trim()) {
      throw new MockApiError('Thiếu tên NCC.', 'thieu_ncc', 400);
    }
    if (!body.dongHang.length) {
      throw new MockApiError('Phiếu phải có ít nhất một dòng hàng.', 'empty_dong_hang', 400);
    }
    const shortDate = todayShort();
    const id = nextPhieuId('nhap', shortDate);
    const kho = MOCK_KHO.find((k) => k.id === body.khoId);
    const taoLuc = nowIso();
    const totals = computeTotals(body.dongHang);
    const phieu: PhieuNhap = {
      id,
      kind: 'nhap',
      khoId: body.khoId,
      khoTen: kho?.ten,
      partnerTen: body.ncc,
      ncc: body.ncc.trim(),
      nccId: body.nccId,
      trangThai: 'ke_hoach',
      ghiChu: body.ghiChu,
      tongSoLuong: totals.tongSoLuong,
      tongTien: Math.max(0, totals.tongTien - (body.giamGia ?? 0)),
      nguoiTao: 'Admin',
      taoLuc,
      anh: body.anh ?? [],
      viTri: body.viTri,
      dongHang: enrichSnapshot(body.dongHang),
      expectedOn: body.expectedOn,
      soHoaDon: body.soHoaDon,
      giamGia: body.giamGia,
    };
    MOCK_PHIEU_STORE.unshift(phieu);
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>('/kho/phieu-nhap/ke-hoach', body);
  return data.data;
}

function mustPhieuNhapKeHoach(id: string): PhieuNhap {
  const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
  if (!phieu) throw new MockApiError('Không tìm thấy phiếu.', 'khong_tim_thay', 404);
  if (phieu.kind !== 'nhap') {
    throw new MockApiError('Phiếu không phải loại nhập.', 'sai_loai', 400);
  }
  if (phieu.trangThai !== 'ke_hoach') {
    throw new MockApiError('Phiếu đã ghi sổ hoặc đã huỷ — không thao tác kế hoạch nữa.', 'khong_phai_ke_hoach', 409);
  }
  return phieu;
}

export async function capNhatKeHoach(
  id: string,
  patch: Partial<CreateReceiptBody>,
): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustPhieuNhapKeHoach(id);
    if (patch.dongHang !== undefined) phieu.dongHang = enrichSnapshot(patch.dongHang);
    if (patch.ncc !== undefined) {
      phieu.ncc = String(patch.ncc).trim();
      phieu.partnerTen = phieu.ncc;
    }
    if (patch.nccId !== undefined) phieu.nccId = patch.nccId || undefined;
    if (patch.ghiChu !== undefined) phieu.ghiChu = patch.ghiChu || undefined;
    if (patch.expectedOn !== undefined) phieu.expectedOn = patch.expectedOn || undefined;
    if (patch.soHoaDon !== undefined) phieu.soHoaDon = patch.soHoaDon || undefined;
    if (patch.giamGia !== undefined) phieu.giamGia = patch.giamGia ?? 0;
    if (patch.anh !== undefined) phieu.anh = patch.anh ?? [];
    const totals = computeTotals(phieu.dongHang);
    phieu.tongSoLuong = totals.tongSoLuong;
    phieu.tongTien = Math.max(0, totals.tongTien - (phieu.giamGia ?? 0));
    return getReceipt(id);
  }
  const { data } = await client.patch<{ data: PhieuFull }>(`/kho/phieu-nhap/${id}/ke-hoach`, patch);
  return data.data;
}

/** Xác nhận nhận hàng: KẾ HOẠCH → GHI SỔ, sinh moves +in, cập nhật dongHang = thực nhận. */
export async function xacNhanNhan(
  id: string,
  dongHangThucTe?: DongHangNhapLieu[],
): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustPhieuNhapKeHoach(id);
    const dongThuc =
      Array.isArray(dongHangThucTe) && dongHangThucTe.length ? dongHangThucTe : phieu.dongHang;
    const taoLuc = nowIso();
    const dongThucNonZero = dongThuc.filter((d) => {
      const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
      const base = convertToBase(d.soLuong, d.donVi, {
        heSoQuyDoi: d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi,
      });
      return base > 0;
    });
    if (dongThucNonZero.length === 0) {
      throw new MockApiError(
        'Phải có ít nhất một dòng thực nhận > 0. Nếu không nhận hàng, dùng "Huỷ phiếu tạm".',
        'empty_thuc_nhan',
        400,
      );
    }
    for (const d of dongThuc) {
      const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
      const base = convertToBase(d.soLuong, d.donVi, {
        heSoQuyDoi: d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi,
      });
      if (!(base > 0)) continue;
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: phieu.khoId,
        huong: 'in',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: base,
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: d.donGia,
        chungTuLoai: 'nhap',
        chungTuId: id,
        nguoiTao: 'Admin',
        taoLuc,
      });
    }
    phieu.dongHang = enrichSnapshot(dongThuc);
    phieu.trangThai = 'ghi';
    const totals = computeTotals(dongThuc);
    phieu.tongSoLuong = totals.tongSoLuong;
    phieu.tongTien = Math.max(0, totals.tongTien - (phieu.giamGia ?? 0));
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu-nhap/${id}/xac-nhan`, {
    dongHang: dongHangThucTe,
  });
  return data.data;
}

/** Huỷ phiếu nhập TẠM — chỉ đổi cờ, không sinh moves. */
export async function huyKeHoach(id: string, lyDo: string): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!lyDo.trim()) throw new MockApiError('Phải nêu lý do huỷ.', 'thieu_ly_do', 400);
    const phieu = mustPhieuNhapKeHoach(id);
    phieu.trangThai = 'huy';
    phieu.lyDoHuy = lyDo.trim();
    phieu.huyBoi = 'Admin';
    phieu.huyLuc = nowIso();
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu-nhap/${id}/huy-ke-hoach`, {
    lyDo,
  });
  return data.data;
}

// ============ BÁN HÀNG ============

export async function createPhieuBan(body: CreateReceiptBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 100));
    if (!body.dongHang.length) {
      throw new MockApiError('Phiếu phải có ít nhất một dòng hàng.', 'empty_dong_hang', 400);
    }
    // Khách hàng BẮT BUỘC — mirror backend `kho/service.js` (đổi 2026-08-19, bỏ
    // "khách lẻ"). Mock không được dễ dãi hơn thật, không thì demo qua nhưng
    // real mode 400.
    if (!body.partyId) {
      throw new MockApiError('Phiếu bán phải có khách hàng.', 'thieu_khach_hang', 400);
    }
    // Aggregate check overstock theo vatTuId
    const groupBase: Record<string, number> = {};
    for (const d of body.dongHang) {
      const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
      const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
      groupBase[d.vatTuId] = (groupBase[d.vatTuId] ?? 0) + base;
    }
    for (const [vatTuId, need] of Object.entries(groupBase)) {
      const have = sumStock(body.khoId, vatTuId);
      if (need > have) {
        const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
        throw new MockApiError(
          `"${sku?.ten ?? vatTuId}" chỉ còn ${have} ${sku?.donViCoBan ?? ''}, không bán được ${need}.`,
          'thieu_ton',
          409,
        );
      }
    }
    const shortDate = todayShort();
    const id = nextPhieuId('ban', shortDate);
    const kho = MOCK_KHO.find((k) => k.id === body.khoId);
    const taoLuc = nowIso();
    const totals = computeTotals(body.dongHang);
    const phieu: PhieuBan = {
      id,
      kind: 'ban',
      khoId: body.khoId,
      khoTen: kho?.ten,
      partnerTen: body.partyName,
      partyId: body.partyId,
      partyName: body.partyName,
      partyKind: body.partyKind ?? 'household',
      giamGia: body.giamGia,
      trangThai: 'ghi',
      ghiChu: body.ghiChu,
      tongSoLuong: totals.tongSoLuong,
      tongTien: totals.tongTien,
      nguoiTao: 'Admin',
      taoLuc,
      anh: body.anh ?? [],
      viTri: body.viTri,
      dongHang: enrichSnapshot(body.dongHang),
    };
    MOCK_PHIEU_STORE.unshift(phieu);
    for (const d of body.dongHang) {
      const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
      const base = convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: sku?.heSoQuyDoi });
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: body.khoId,
        huong: 'out',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: base,
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: d.donGia ?? sku?.giaBan,
        chungTuLoai: 'ban',
        chungTuId: id,
        nguoiTao: 'Admin',
        taoLuc,
      });
    }
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>('/kho/phieu-ban', body);
  return data.data;
}

/** Alias legacy: createReceipt(kind, body) — giữ cho code cũ. */
export async function createReceipt(
  kind: ReceiptKind,
  body: CreateReceiptBody,
): Promise<PhieuFull> {
  if (kind === 'nhap') return createPhieuNhap(body);
  if (kind === 'ban') return createPhieuBan(body);
  throw new Error('createReceipt không hỗ trợ kiem_ke — dùng createKiemKe.');
}

// ============ HUỶ CHUNG (dùng cho phiếu 'ghi') ============

export async function huyPhieu(id: string, lyDo: string): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!lyDo.trim()) throw new MockApiError('Phải nêu lý do huỷ.', 'thieu_ly_do', 400);
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu.', 'khong_tim_thay', 404);
    if (phieu.trangThai === 'huy') {
      throw new MockApiError('Phiếu đã huỷ rồi.', 'da_huy', 409);
    }
    if (phieu.trangThai === 'ke_hoach') {
      throw new MockApiError(
        'Phiếu tạm chưa vào sổ — dùng đường "Huỷ phiếu tạm" riêng.',
        'huy_ke_hoach_qua_duong_rieng',
        409,
      );
    }
    const originals = MOCK_MOVES_STORE.filter((m) => m.chungTuId === id);
    const now = nowIso();
    for (const m of originals) {
      MOCK_MOVES_STORE.push({
        ...m,
        id: nextMoveId(),
        huong: m.huong === 'in' ? 'out' : 'in',
        taoLuc: now,
      });
    }
    phieu.trangThai = 'huy';
    phieu.lyDoHuy = lyDo.trim();
    phieu.huyBoi = 'Admin';
    phieu.huyLuc = now;
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu/${id}/huy`, { lyDo });
  return data.data;
}

/** Alias legacy — routes theo status: ke_hoach → huyKeHoach/huyKiemKeKeHoach; else → huyPhieu. */
export async function cancelReceipt(id: string, lyDo: string): Promise<PhieuFull> {
  if (MOCK_API) {
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
    if (phieu?.trangThai === 'ke_hoach') {
      if (phieu.kind === 'nhap') return huyKeHoach(id, lyDo);
      if (phieu.kind === 'kiem_ke') return huyKiemKeKeHoach(id, lyDo);
    }
    return huyPhieu(id, lyDo);
  }
  return huyPhieu(id, lyDo);
}

// ============ KIỂM KHO ============

export async function listPhieuKiem(query: {
  khoId?: string;
  status?: 'ke_hoach' | 'ghi' | 'huy' | 'all';
} = {}): Promise<PhieuKiemKe[]> {
  if (MOCK_API) {
    return delay(
      MOCK_PHIEU_STORE.filter((p): p is PhieuKiemKe => {
        if (p.kind !== 'kiem_ke') return false;
        if (query.khoId && p.khoId !== query.khoId) return false;
        if (query.status && query.status !== 'all' && p.trangThai !== query.status) return false;
        return true;
      }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)),
    );
  }
  const { data } = await client.get<{ data: PhieuKiemKe[] }>('/kho/phieu-kiem', {
    params: query,
  });
  return data.data;
}

export async function createKiemKe(body: CreateKiemKeBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!body.dongKiem.length) {
      throw new MockApiError('Phiếu kiểm phải có ít nhất một dòng.', 'empty_dong_kiem', 400);
    }
    const seen = new Set<string>();
    for (const d of body.dongKiem) {
      if (seen.has(d.vatTuId)) {
        const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
        throw new MockApiError(
          `Vật tư "${sku?.ten ?? d.vatTuId}" khai hai lần — mỗi SKU chỉ có một dòng đếm.`,
          'dong_kiem_trung',
          400,
        );
      }
      seen.add(d.vatTuId);
      if (!Number.isFinite(d.thucTe) || d.thucTe < 0) {
        throw new MockApiError('Thực tế phải là số ≥ 0.', 'bad_thuc_te', 400);
      }
    }
    const shortDate = todayShort();
    const id = nextPhieuId('kiem_ke', shortDate);
    const kho = MOCK_KHO.find((k) => k.id === body.khoId);
    const phieu: PhieuKiemKe = {
      id,
      kind: 'kiem_ke',
      khoId: body.khoId,
      khoTen: kho?.ten,
      trangThai: 'ke_hoach',
      ghiChu: body.ghiChu,
      tongSoLuong: 0,
      tongTien: 0,
      nguoiTao: 'Admin',
      taoLuc: nowIso(),
      anh: [],
      viTri: body.viTri,
      dongKiem: body.dongKiem.map((d) => ({ vatTuId: d.vatTuId, thucTe: d.thucTe })),
    };
    MOCK_PHIEU_STORE.unshift(phieu);
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>('/kho/phieu-kiem', body);
  return data.data;
}

function mustPhieuKiemKeHoach(id: string): PhieuKiemKe {
  const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
  if (!phieu) throw new MockApiError('Không tìm thấy phiếu kiểm.', 'khong_tim_thay', 404);
  if (phieu.kind !== 'kiem_ke') {
    throw new MockApiError('Phiếu không phải loại kiểm kê.', 'sai_loai', 400);
  }
  if (phieu.trangThai !== 'ke_hoach') {
    throw new MockApiError(
      'Phiếu đã cân bằng hoặc đã huỷ — không thao tác kế hoạch nữa.',
      'khong_phai_ke_hoach',
      409,
    );
  }
  return phieu;
}

export async function capNhatKiemKe(
  id: string,
  patch: Partial<CreateKiemKeBody>,
): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustPhieuKiemKeHoach(id);
    if (patch.dongKiem !== undefined) {
      phieu.dongKiem = patch.dongKiem.map((d) => ({ vatTuId: d.vatTuId, thucTe: d.thucTe }));
    }
    if (patch.ghiChu !== undefined) phieu.ghiChu = patch.ghiChu || undefined;
    return getReceipt(id);
  }
  const { data } = await client.patch<{ data: PhieuFull }>(`/kho/phieu-kiem/${id}`, patch);
  return data.data;
}

/** Cân bằng: đọc tồn sổ TẠI THỜI ĐIỂM CHỐT, sinh moves ±|lech| cho lệch ≠ 0. */
export async function canBangKiemKe(id: string): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustPhieuKiemKeHoach(id);
    const taoLuc = nowIso();
    const dongSau = phieu.dongKiem.map((d) => {
      const tonSo = sumStock(phieu.khoId, d.vatTuId);
      const lech = d.thucTe - tonSo;
      return { ...d, tonSo, lech };
    });
    for (const d of dongSau) {
      if (d.lech === 0) continue;
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: phieu.khoId,
        huong: (d.lech ?? 0) > 0 ? 'in' : 'out',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: Math.abs(d.lech ?? 0),
        chungTuLoai: 'kiem_ke',
        chungTuId: phieu.id,
        nguoiTao: 'Admin',
        taoLuc,
      });
    }
    phieu.dongKiem = dongSau;
    phieu.trangThai = 'ghi';
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu-kiem/${id}/can-bang`, {});
  return data.data;
}

export async function huyKiemKeKeHoach(id: string, lyDo: string): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!lyDo.trim()) throw new MockApiError('Phải nêu lý do huỷ.', 'thieu_ly_do', 400);
    const phieu = mustPhieuKiemKeHoach(id);
    phieu.trangThai = 'huy';
    phieu.lyDoHuy = lyDo.trim();
    phieu.huyBoi = 'Admin';
    phieu.huyLuc = nowIso();
    return getReceipt(id);
  }
  const { data } = await client.post<{ data: PhieuFull }>(`/kho/phieu-kiem/${id}/huy-ke-hoach`, {
    lyDo,
  });
  return data.data;
}
