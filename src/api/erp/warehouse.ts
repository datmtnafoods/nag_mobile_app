import { client, MOCK_API } from '../client';
import type {
  CreateKiemKeBody,
  CreateReceiptBody,
  DongHangNhapLieu,
  Kho,
  KhoMove,
  LanThu,
  ListReceiptsQuery,
  Paginated,
  PhieuBan,
  PhieuFull,
  PhieuHeader,
  PhieuKiemKe,
  PhieuNhap,
  ReceiptKind,
  TaoKhoTamBody,
  TonKhoRow,
} from '../../features/vat-tu/types';
import {
  MOCK_KHO,
  MOCK_MOVES_STORE,
  MOCK_PHIEU_STORE,
  MOCK_VATTU,
  nextKhoTamId,
  nextLanThuId,
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

/**
 * Shape list của backend: `core/list.js#listResponse` → `{ rows, total }`.
 * KHÔNG có envelope `{data}` ở bất kỳ route nào (đã rà `app.js` + `core/`), nên
 * mọi nhánh real phải đọc `rows`.
 */
type BeList<T> = { rows: T[]; total: number };

export async function listKho(): Promise<Kho[]> {
  if (MOCK_API) return delay(MOCK_KHO);
  const { data } = await client.get<BeList<Kho>>('/kho');
  return data.rows ?? [];
}

/**
 * Tạo kho tạm (kho xe) NGAY TRÊN APP — KTV tự tạo, không chờ admin provision.
 *
 * Kho tạm = kho xe (W7): `loai:'xe'`, custodian = chính KTV (DB CHECK ép non-null).
 * BE GAP: backend CHƯA có `POST /kho`. Khi nối thật:
 *   POST /kho  body { ten, loai:'xe', loaiXe, custodianUserId } → trả Kho TRỰC TIẾP
 *   (KHÔNG envelope {data}). `loaiXe` (xe máy/tải) cần cột BE tương ứng
 *   (vehicle_kind). Gate theo quyền BE (vd 'kho:tao') — KHÔNG map role ở client
 *   (Khuôn 5). Cho tới lúc đó nhánh real trả 404; hàng đợi offline giữ lại thử sau.
 * Đồng bộ offline: kho tạm khai lúc mất mạng xếp `stores/kho-tam-queue.ts`, drain
 * bằng `api/erp/kho-sync.ts#flushKhoQueue()` khi có mạng lại.
 */
export async function taoKhoTam(body: TaoKhoTamBody): Promise<Kho> {
  if (MOCK_API) {
    const ten = body.ten.trim();
    if (ten.length < 2) {
      throw new MockApiError('Nhập tên kho tạm (tối thiểu 2 ký tự).', 'thieu_ten', 400);
    }
    const kho: Kho = {
      id: nextKhoTamId(),
      ten,
      loai: 'xe',
      loaiXe: body.loaiXe,
      custodianUserId: body.custodianUserId,
      custodianName: body.custodianName,
      trangThai: 'active',
    };
    MOCK_KHO.push(kho);
    return delay(kho);
  }
  const { data } = await client.post<Kho>('/kho', {
    ten: body.ten.trim(),
    loai: 'xe',
    loaiXe: body.loaiXe,
    custodianUserId: body.custodianUserId,
  });
  return data;
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
  const { data } = await client.get<BeList<{ khoId: string; vatTuId: string; soLuong: number }>>(
    '/kho/ton',
    { params: { khoId, vatTuId } },
  );
  const row = data.rows?.[0];
  const sku = row ? MOCK_VATTU.find((v) => v.id === row.vatTuId) : undefined;
  return { soLuong: row?.soLuong ?? 0, donViCoBan: sku?.donViCoBan ?? '' };
}

/** Bảng tồn full list — dùng cho TonKho tab. */
export async function tonKho(query: { khoId?: string } = {}): Promise<TonKhoRow[]> {
  if (MOCK_API) return delay(tonKhoTable(query.khoId));
  const { data } = await client.get<BeList<TonKhoRow>>('/kho/ton', { params: query });
  return data.rows ?? [];
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
  const { data } = await client.get<BeList<KhoMove>>('/kho/moves', { params: input });
  return data.rows ?? [];
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
      client.get<BeList<PhieuHeader>>('/kho/phieu-nhap', {
        params: { khoId, status, nccId, from, to, q, page, pageSize },
      }),
      client.get<BeList<PhieuHeader>>('/kho/phieu-ban', {
        params: { khoId, status, from, to, q, page, pageSize },
      }),
      client.get<BeList<PhieuHeader>>('/kho/phieu-kiem', {
        params: { khoId, status, from, to, q, page, pageSize },
      }),
    ]);
    const merged = [
      ...(nhap.data.rows ?? []).map((p) => normalizePhieuRow(p, 'nhap')),
      ...(ban.data.rows ?? []).map((p) => normalizePhieuRow(p, 'ban')),
      ...(kiem.data.rows ?? []).map((p) => normalizePhieuRow(p, 'kiem_ke')),
    ].sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
    return { data: merged, meta: { total: merged.length, page, pageSize } };
  }
  const path =
    kind === 'nhap' ? '/kho/phieu-nhap' : kind === 'ban' ? '/kho/phieu-ban' : '/kho/phieu-kiem';
  const { data } = await client.get<BeList<PhieuHeader>>(path, {
    params: { khoId, status, nccId, partyId, from, to, q, page, pageSize },
  });
  let rows = (data.rows ?? []).map((p) => normalizePhieuRow(p, kind));
  // BACKEND CHƯA LỌC gì cả — `svc.listPhieu*()` không nhận tham số, `core/list.js`
  // chỉ cắt offset/limit. Lọc lại ở client để màn "lịch sử mua của hộ" không hiện
  // phiếu của hộ khác. Bỏ được khi BE thêm filter (xem PROGRESS).
  if (partyId) rows = rows.filter((p) => p.kind === 'ban' && p.partyId === partyId);
  return { data: rows, meta: { total: data.total ?? rows.length, page, pageSize } };
}

/**
 * Chuẩn hoá 1 row phiếu về `PhieuHeader` mobile chờ.
 *
 * BE `/kho/phieu-{nhap,ban,kiem}` KHÔNG set `kind` trên row (endpoint đã tự phân
 * loại) — mobile phải bơm lại theo path đã gọi để `PhieuCard` biết dùng meta/route
 * nào. `tongSoLuong`/`tongTien` cũng có thể trả camel/snake khác nhau hoặc dùng
 * alias khác — coerce mọi biến thể về số hữu hạn để UI không show NaN.
 */
function normalizePhieuRow(raw: unknown, kind: ReceiptKind): PhieuHeader {
  const src = (raw ?? {}) as Record<string, unknown>;
  const toNum = (v: unknown): number => {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
  };
  const tongSL = toNum(
    src.tongSoLuong ?? src.tong_so_luong ?? src.totalQty ?? src.total_qty ?? src.tongSl,
  );
  const tongTT = toNum(
    src.tongTien ?? src.tong_tien ?? src.totalAmount ?? src.total_amount ?? src.tongThanhTien,
  );
  return {
    ...(src as object),
    kind: (src.kind as ReceiptKind) ?? kind,
    tongSoLuong: tongSL,
    tongTien: tongTT,
    anh: Array.isArray(src.anh) ? (src.anh as string[]) : [],
  } as PhieuHeader;
}

/**
 * Dựng `PhieuFull` từ 1 phiếu: enrich snapshot dòng hàng thành `PhieuDongHang`.
 *
 * Ưu tiên snapshot đã lưu trên phiếu; chỉ fallback sang SKU sống khi phiếu cũ
 * chưa có snapshot (backwards-compat) — để phiếu đã ghi không đổi khi admin sửa
 * SKU về sau. Dùng CHUNG cho mock và real: backend trả `dongHang` là DÒNG SỔ
 * (moves), không phải dòng nhập liệu đã quy đổi mà UI cần.
 */
function toPhieuFull(phieu: PhieuHeader): PhieuFull {
  if (phieu.kind === 'kiem_ke') return { phieu, dongHang: [] };
  // `dongHang` có thể thiếu ở phiếu cũ hoặc lượt response BE bị cắt ngắn — guard để
  // detail screen không crash "Cannot read property 'map' of undefined".
  const dongHang = (phieu.dongHang ?? []).map((d) => {
    const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
    const heSo = d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi;
    return {
      vatTuId: d.vatTuId,
      tenSku: d.tenSkuSnapshot ?? sku?.ten,
      donViCoBan: d.donViCoBanSnapshot ?? sku?.donViCoBan ?? '',
      donViLon: d.donViLonSnapshot ?? sku?.donViLon,
      heSoQuyDoi: heSo,
      soLuong: d.soLuong,
      donVi: d.donVi,
      soLuongCoBan: convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: heSo }),
      lo: d.lo,
      hanDung: d.hanDung,
      serial: d.serial,
      donGia: d.donGia,
    };
  });
  return { phieu, dongHang };
}

/**
 * Bóc response phiếu của backend.
 *
 * Backend KHÔNG bọc `{data}` — route trả thẳng `{phieu, moves}` (create/xác
 * nhận/huỷ) hoặc `{phieu}` (patch kế hoạch); `GET /phieu/:id` trả
 * `{phieu, dongHang}` nhưng `dongHang` ở đó là DÒNG SỔ, không dùng cho UI.
 * Nên mọi nơi đều dựng lại `PhieuFull` từ `phieu` (đã mang snapshot dòng hàng).
 */
function boc(res: { phieu: PhieuHeader }): PhieuFull {
  return toPhieuFull(res.phieu);
}

export async function getReceipt(id: string): Promise<PhieuFull> {
  if (MOCK_API) {
    const phieu = MOCK_PHIEU_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu', 'khong_tim_thay', 404);
    return delay(toPhieuFull(phieu));
  }
  const { data } = await client.get<{ phieu: PhieuHeader }>(`/kho/phieu/${id}`);
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>('/kho/phieu-nhap', body);
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>('/kho/phieu-nhap/ke-hoach', body);
  return boc(data);
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
  const { data } = await client.patch<{ phieu: PhieuHeader }>(`/kho/phieu-nhap/${id}/ke-hoach`, patch);
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>(`/kho/phieu-nhap/${id}/xac-nhan`, {
    dongHang: dongHangThucTe,
  });
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>(`/kho/phieu-nhap/${id}/huy-ke-hoach`, {
    lyDo,
  });
  return boc(data);
}

// ============ BÁN HÀNG ============

export async function createPhieuBan(body: CreateReceiptBody): Promise<PhieuFull> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 100));
    if (!body.dongHang.length) {
      throw new MockApiError('Phiếu phải có ít nhất một dòng hàng.', 'empty_dong_hang', 400);
    }
    // Khách có hồ sơ (household/cooperative) BẮT BUỘC partyId; khách vãng lai
    // (partyKind='khach_le') được miễn.
    // NỢ BACKEND: `kho/service.js` hiện vẫn ném 400 `thieu_khach_hang` khi thiếu
    // partyId (bỏ "khách lẻ" 2026-08-19). Để bật bán lẻ, BE cần chấp nhận
    // partyKind='khach_le' + `khachLe{ten,sdt}` (xem PROGRESS.md). Mock nới trước.
    if (body.partyKind !== 'khach_le' && !body.partyId) {
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
    const tongTien = Math.max(0, totals.tongTien - (body.giamGia ?? 0));
    // Thanh toán ngay (mock-first): clamp số thu ≤ phải thu, khởi tạo lần thu đầu.
    const soThu = Math.max(0, Math.min(body.thanhToan?.soTien ?? 0, tongTien));
    const lanThu: LanThu[] =
      soThu > 0
        ? [
            {
              id: nextLanThuId(),
              soTien: soThu,
              phuongThuc: body.thanhToan?.phuongThuc ?? 'tien_mat',
              nguoiThu: 'Admin',
              thuLuc: taoLuc,
            },
          ]
        : [];
    const phieu: PhieuBan = {
      id,
      kind: 'ban',
      khoId: body.khoId,
      khoTen: kho?.ten,
      partnerTen: body.partyName,
      partyId: body.partyId,
      partyName: body.partyName,
      partyKind: body.partyKind ?? 'household',
      khachLe: body.khachLe,
      giamGia: body.giamGia,
      trangThai: 'ghi',
      ghiChu: body.ghiChu,
      tongSoLuong: totals.tongSoLuong,
      // Trừ giảm giá — mirror mockCreatePhieuNhap (dòng ~287).
      tongTien,
      daThu: soThu,
      lanThu,
      daTra: 0,
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
  const { data } = await client.post<{ phieu: PhieuHeader }>('/kho/phieu-ban', body);
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>(`/kho/phieu/${id}/huy`, { lyDo });
  return boc(data);
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
  const { data } = await client.get<BeList<PhieuKiemKe>>('/kho/phieu-kiem', {
    params: query,
  });
  return data.rows ?? [];
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
  const { data } = await client.post<{ phieu: PhieuHeader }>('/kho/phieu-kiem', body);
  return boc(data);
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
  const { data } = await client.patch<{ phieu: PhieuHeader }>(`/kho/phieu-kiem/${id}`, patch);
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>(`/kho/phieu-kiem/${id}/can-bang`, {});
  return boc(data);
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
  const { data } = await client.post<{ phieu: PhieuHeader }>(`/kho/phieu-kiem/${id}/huy-ke-hoach`, {
    lyDo,
  });
  return boc(data);
}
