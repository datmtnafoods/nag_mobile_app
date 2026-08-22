import { client, MOCK_API } from '../client';
import type {
  CreatePhieuChuyenKeHoachBody,
  DongHangNhapLieu,
  PhieuChuyen,
} from '../../features/vat-tu/types';
import {
  MOCK_KHO,
  MOCK_MOVES_STORE,
  MOCK_PHIEU_CHUYEN_STORE,
  MOCK_VATTU,
  nextMoveId,
  nextPhieuId,
  sumStock,
} from '../../mocks/vat-tu.mock';
import { convertToBase } from '../../features/vat-tu/unit-convert';

/**
 * Phiếu chuyển kho 2 pha — W7 (K2 backend, HEAD a5ba961).
 *
 * Contract bám thẳng `nag_erp_api/src/modules/kho/service.js` §K2 (25 test BE +
 * 10 E2E pg). Vòng đời `ke_hoach → dang_chuyen → ghi | cho_duyet_lech → ghi`.
 * Perm: `kho:view` đọc, `kho:chuyen` lập/sửa/huỷ ke_hoach + xác nhận xuất,
 * `kho:nhan` xác nhận nhận, `kho:duyet-lech` duyệt.
 *
 * BE envelope: KHÔNG bọc `{data}`. List trả `{rows,total}`; create/xác nhận/huỷ
 * trả thẳng `{phieu, moves?}`; `GET /kho/phieu/:id` (chung với 4 phiếu K1) trả
 * `{phieu, dongHang}` nhưng `dongHang` ở đó là dòng sổ (moves), không phải dòng
 * nhập liệu — nên dựng `PhieuChuyen` từ chính `phieu`.
 *
 * Hai nợ backend còn treo (PROGRESS.md §K2):
 *  (a) `xacNhanNhanChuyen` chưa enforce custodian match kho đích — mobile tự
 *      lọc `custodianUserId === userId` trước khi cho bấm "Xác nhận nhận".
 *  (b) Huỷ khi `dang_chuyen` chưa có route — nhánh CK- chưa nhét vào `huyPhieu`
 *      chung. Mobile không hiển thị nút Huỷ ở trạng thái đó.
 */

const MOCK_DELAY = 300;

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

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type BeList<T> = { rows: T[]; total: number };

function toBase(d: DongHangNhapLieu): number {
  const sku = MOCK_VATTU.find((v) => v.id === d.vatTuId);
  const heSo = d.heSoQuyDoiSnapshot ?? sku?.heSoQuyDoi;
  return convertToBase(d.soLuong, d.donVi, { heSoQuyDoi: heSo });
}

// ============ ĐỌC ============

export async function listPhieuChuyen(query: {
  khoId?: string;
  status?: PhieuChuyen['trangThai'] | 'all';
} = {}): Promise<PhieuChuyen[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_PHIEU_CHUYEN_STORE.filter((p) => {
      if (query.khoId && p.khoNguonId !== query.khoId && p.khoDichId !== query.khoId) return false;
      if (query.status && query.status !== 'all' && p.trangThai !== query.status) return false;
      return true;
    }).sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
  }
  // BE `listPhieuChuyen` hiện chưa nhận filter (khớp bug 4 endpoint list K1 —
  // đã ghi Follow-ups PROGRESS.md). Kéo hết rồi lọc client-side.
  const { data } = await client.get<BeList<PhieuChuyen>>('/kho/phieu-chuyen', {
    params: query,
  });
  let rows = data.rows ?? [];
  if (query.khoId) {
    rows = rows.filter((p) => p.khoNguonId === query.khoId || p.khoDichId === query.khoId);
  }
  if (query.status && query.status !== 'all') {
    rows = rows.filter((p) => p.trangThai === query.status);
  }
  return rows;
}

export async function getPhieuChuyen(id: string): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = MOCK_PHIEU_CHUYEN_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu chuyển.', 'khong_tim_thay', 404);
    return phieu;
  }
  const { data } = await client.get<{ phieu: PhieuChuyen }>(`/kho/phieu/${id}`);
  return data.phieu;
}

// ============ LẬP LỆNH (ke_hoach) ============

export async function createKeHoach(body: CreatePhieuChuyenKeHoachBody): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!body.khoNguonId || !body.khoDichId) {
      throw new MockApiError('Thiếu kho nguồn hoặc kho đích.', 'thieu_kho', 400);
    }
    if (body.khoNguonId === body.khoDichId) {
      throw new MockApiError('Kho nguồn và kho đích không được trùng nhau.', 'kho_trung_nhau', 400);
    }
    const id = nextPhieuId('chuyen', todayShort());
    const phieu: PhieuChuyen = {
      id,
      khoNguonId: body.khoNguonId,
      khoDichId: body.khoDichId,
      trangThai: 'ke_hoach',
      dongHang: body.dongHang ?? [],
      ghiChu: body.ghiChu?.trim() || undefined,
      anh: body.anh ?? [],
      viTri: body.viTri,
      nguoiTao: 'KTV (mock)',
      taoLuc: nowIso(),
    };
    MOCK_PHIEU_CHUYEN_STORE.unshift(phieu);
    return phieu;
  }
  const { data } = await client.post<{ phieu: PhieuChuyen }>(
    '/kho/phieu-chuyen/ke-hoach',
    body,
  );
  return data.phieu;
}

export async function patchKeHoach(
  id: string,
  patch: Partial<CreatePhieuChuyenKeHoachBody>,
): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustKeHoach(id);
    if (patch.dongHang !== undefined) phieu.dongHang = patch.dongHang;
    if (patch.ghiChu !== undefined) phieu.ghiChu = patch.ghiChu?.trim() || undefined;
    if (patch.viTri !== undefined) phieu.viTri = patch.viTri;
    if (patch.anh !== undefined) phieu.anh = patch.anh ?? [];
    return phieu;
  }
  const { data } = await client.patch<{ phieu: PhieuChuyen }>(
    `/kho/phieu-chuyen/${id}/ke-hoach`,
    patch,
  );
  return data.phieu;
}

function mustKeHoach(id: string): PhieuChuyen {
  const phieu = MOCK_PHIEU_CHUYEN_STORE.find((p) => p.id === id);
  if (!phieu) throw new MockApiError('Không tìm thấy phiếu chuyển.', 'khong_tim_thay', 404);
  if (phieu.trangThai !== 'ke_hoach') {
    throw new MockApiError(
      `Phiếu đang ở "${phieu.trangThai}" — chỉ thao tác được ở "ke_hoach".`,
      'khong_phai_ke_hoach',
      409,
    );
  }
  return phieu;
}

function mustDangChuyen(id: string): PhieuChuyen {
  const phieu = MOCK_PHIEU_CHUYEN_STORE.find((p) => p.id === id);
  if (!phieu) throw new MockApiError('Không tìm thấy phiếu chuyển.', 'khong_tim_thay', 404);
  if (phieu.trangThai !== 'dang_chuyen') {
    throw new MockApiError(
      `Phiếu đang ở "${phieu.trangThai}" — chỉ thao tác được ở "dang_chuyen".`,
      'khong_phai_dang_chuyen',
      409,
    );
  }
  return phieu;
}

// ============ XÁC NHẬN XUẤT (ke_hoach → dang_chuyen) ============

export async function xacNhanXuat(id: string): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustKeHoach(id);
    if (!phieu.dongHang.length) {
      throw new MockApiError('Phiếu chưa có dòng hàng — không xuất được.', 'empty_dong_hang', 400);
    }
    // Kiểm tồn kho nguồn per SKU (khớp BE `thieu_ton`).
    const canXuat = new Map<string, number>();
    for (const d of phieu.dongHang) canXuat.set(d.vatTuId, (canXuat.get(d.vatTuId) ?? 0) + toBase(d));
    for (const [vatTuId, can] of canXuat) {
      const con = sumStock(phieu.khoNguonId, vatTuId);
      if (can > con) {
        const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
        throw new MockApiError(
          `"${sku?.ten ?? vatTuId}" chỉ còn ${con} ${sku?.donViCoBan ?? ''} tại kho nguồn, không xuất được ${can}.`,
          'thieu_ton',
          409,
        );
      }
    }
    const taoLuc = nowIso();
    for (const d of phieu.dongHang) {
      const base = toBase(d);
      if (!(base > 0)) continue;
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: phieu.khoNguonId,
        huong: 'out',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: base,
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: d.donGia,
        chungTuLoai: 'dieu_chuyen',
        chungTuId: phieu.id,
        nguoiTao: 'KTV (mock)',
        taoLuc,
      });
    }
    phieu.trangThai = 'dang_chuyen';
    phieu.nguoiXuat = 'KTV (mock)';
    phieu.xuatLuc = taoLuc;
    return phieu;
  }
  const { data } = await client.post<{ phieu: PhieuChuyen }>(
    `/kho/phieu-chuyen/${id}/xac-nhan-xuat`,
  );
  return data.phieu;
}

// ============ XÁC NHẬN NHẬN (dang_chuyen → ghi | cho_duyet_lech) ============

export async function xacNhanNhan(
  id: string,
  dongHangThucNhan?: DongHangNhapLieu[],
): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const phieu = mustDangChuyen(id);
    const thucNhan =
      Array.isArray(dongHangThucNhan) && dongHangThucNhan.length
        ? dongHangThucNhan
        : phieu.dongHang;
    const taoLuc = nowIso();

    // So per SKU (khớp BE): Δ dương chặn cứng, Δ âm → variance + cho_duyet_lech.
    const daXuat = new Map<string, number>();
    for (const m of MOCK_MOVES_STORE) {
      if (m.chungTuId !== id || m.huong !== 'out') continue;
      daXuat.set(m.vatTuId, (daXuat.get(m.vatTuId) ?? 0) + m.soLuong);
    }
    const xinNhan = new Map<string, number>();
    for (const d of thucNhan) xinNhan.set(d.vatTuId, (xinNhan.get(d.vatTuId) ?? 0) + toBase(d));
    for (const [vatTuId, nhan] of xinNhan) {
      const xuat = daXuat.get(vatTuId) ?? 0;
      if (nhan > xuat) {
        const sku = MOCK_VATTU.find((v) => v.id === vatTuId);
        throw new MockApiError(
          `"${sku?.ten ?? vatTuId}" xuất ${xuat} ${sku?.donViCoBan ?? ''} nhưng nhận ${nhan} — phải sửa xuất trước.`,
          'nhan_qua_xuat',
          400,
        );
      }
    }
    const variance: PhieuChuyen['variance'] = [];
    for (const [vatTuId, xuat] of daXuat) {
      const nhan = xinNhan.get(vatTuId) ?? 0;
      const diff = nhan - xuat;
      if (diff !== 0) variance.push({ vatTuId, soLuongLech: diff });
    }
    for (const d of thucNhan) {
      const base = toBase(d);
      if (!(base > 0)) continue;
      MOCK_MOVES_STORE.push({
        id: nextMoveId(),
        khoId: phieu.khoDichId,
        huong: 'in',
        loaiHang: 'vat_tu',
        vatTuId: d.vatTuId,
        soLuong: base,
        lo: d.lo,
        hanDung: d.hanDung,
        serial: d.serial,
        donGia: d.donGia,
        chungTuLoai: 'dieu_chuyen',
        chungTuId: phieu.id,
        nguoiTao: 'KTV (mock)',
        taoLuc,
      });
    }
    phieu.trangThai = variance.length ? 'cho_duyet_lech' : 'ghi';
    phieu.dongHangThucNhan = thucNhan;
    phieu.nguoiNhan = 'KTV (mock)';
    phieu.nhanLuc = taoLuc;
    if (variance.length) phieu.variance = variance;
    return phieu;
  }
  const { data } = await client.post<{ phieu: PhieuChuyen }>(
    `/kho/phieu-chuyen/${id}/xac-nhan-nhan`,
    { dongHangThucNhan },
  );
  return data.phieu;
}

// ============ DUYỆT LỆCH (cho_duyet_lech → ghi) ============

export async function duyetLech(id: string, lyDo: string): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!lyDo.trim()) throw new MockApiError('Phải nêu lý do duyệt lệch.', 'thieu_ly_do', 400);
    const phieu = MOCK_PHIEU_CHUYEN_STORE.find((p) => p.id === id);
    if (!phieu) throw new MockApiError('Không tìm thấy phiếu chuyển.', 'khong_tim_thay', 404);
    if (phieu.trangThai !== 'cho_duyet_lech') {
      throw new MockApiError(
        `Phiếu đang ở "${phieu.trangThai}" — chỉ duyệt được ở "cho_duyet_lech".`,
        'khong_phai_cho_duyet_lech',
        409,
      );
    }
    phieu.trangThai = 'ghi';
    phieu.nguoiDuyetLech = 'Admin (mock)';
    phieu.duyetLechLuc = nowIso();
    phieu.lyDoDuyetLech = lyDo.trim();
    return phieu;
  }
  const { data } = await client.post<{ phieu: PhieuChuyen }>(
    `/kho/phieu-chuyen/${id}/duyet-lech`,
    { lyDo },
  );
  return data.phieu;
}

// ============ HUỶ KẾ HOẠCH (chỉ khi ke_hoach) ============

export async function huyKeHoach(id: string, lyDo: string): Promise<PhieuChuyen> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!lyDo.trim()) throw new MockApiError('Phải nêu lý do huỷ.', 'thieu_ly_do', 400);
    const phieu = mustKeHoach(id);
    phieu.trangThai = 'huy';
    phieu.lyDoHuy = lyDo.trim();
    phieu.huyBoi = 'KTV (mock)';
    phieu.huyLuc = nowIso();
    return phieu;
  }
  const { data } = await client.post<{ phieu: PhieuChuyen }>(
    `/kho/phieu-chuyen/${id}/huy-ke-hoach`,
    { lyDo },
  );
  return data.phieu;
}
