import { client, MOCK_API } from '../client';
import type {
  MaKieu,
  MaNguon,
  NhaCungCap,
  VatTu,
  VatTuLoai,
} from '../../features/vat-tu/types';
import {
  MOCK_LOAI,
  MOCK_MOVES_STORE,
  MOCK_NCC,
  MOCK_VATTU,
  nextNccId,
  resolveMaToSku,
} from '../../mocks/vat-tu.mock';

const MOCK_DELAY = 250;
function delay<T>(v: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

/**
 * Envelope backend: KHÔNG bọc `{data}` (xem warehouse.ts:65-70, commit 7e14c05).
 * List → `{rows, total}`; get/create/patch → trả thẳng object.
 * File này từng đọc `data.data` ở mọi nhánh real → undefined ở real mode.
 */
type BeList<T> = { rows: T[]; total: number };

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ============ SKU ============

export async function listVatTu(
  input: { q?: string; loaiId?: string; includeNgung?: boolean } = {},
): Promise<VatTu[]> {
  const { q, loaiId, includeNgung } = input;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    return delay(
      MOCK_VATTU.filter((v) => {
        if (!includeNgung && v.trangThai !== 'active') return false;
        if (loaiId && v.loaiId !== loaiId) return false;
        if (needle) {
          const hay = `${v.ten} ${v.id} ${v.ma.map((m) => m.ma).join(' ')}`.toLowerCase();
          return hay.includes(needle);
        }
        return true;
      }),
    );
  }
  const { data } = await client.get<BeList<VatTu>>('/vat-tu', {
    params: { q, loai: loaiId, includeNgung: includeNgung ? 1 : undefined },
  });
  return data.rows ?? [];
}

export async function getVatTu(id: string): Promise<VatTu> {
  if (MOCK_API) {
    const item = MOCK_VATTU.find((v) => v.id === id);
    if (!item) throw new MockApiError('Không tìm thấy vật tư', 'khong_tim_thay', 404);
    return delay(item);
  }
  const { data } = await client.get<VatTu>(`/vat-tu/${id}`);
  return data;
}

/** Trả về SKU nếu tìm thấy, ném { code: 'ma_not_found' } nếu không. */
export async function resolveByCode(ma: string): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 300));
    const item = resolveMaToSku(ma);
    if (!item) throw new MockApiError('Mã này chưa gán cho SKU nào', 'ma_not_found', 404);
    return item;
  }
  const { data } = await client.get<VatTu>('/vat-tu/resolve', { params: { ma } });
  return data;
}

export type CreateSkuInput = {
  ten: string;
  loaiId: string;
  donViCoBan: string;
  donViLon?: string;
  heSoQuyDoi?: number;
  moTa?: string;
  anh?: string[];
  giaBan?: number;
  tonMin?: number;
  tonMax?: number;
  trangThai?: 'active' | 'ngung';
};

function nextSkuId(): string {
  const nums = MOCK_VATTU.map((v) => v.id)
    .filter((id) => /^VT-\d+$/.test(id))
    .map((id) => Number(id.slice(3)))
    .concat(0);
  const next = Math.max(...nums) + 1;
  return `VT-${String(next).padStart(6, '0')}`;
}

export async function createSku(input: CreateSkuInput): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!input.ten?.trim()) throw new MockApiError('Thiếu tên vật tư.', 'thieu_ten', 400);
    if (!input.donViCoBan?.trim())
      throw new MockApiError('Thiếu đơn vị cơ bản.', 'thieu_don_vi', 400);
    if (input.donViLon && !(Number(input.heSoQuyDoi) > 0)) {
      throw new MockApiError(
        'Có đơn vị lớn phải kèm hệ số quy đổi > 0.',
        'thieu_he_so',
        400,
      );
    }
    const id = nextSkuId();
    const sku: VatTu = {
      id,
      loaiId: input.loaiId,
      ten: input.ten.trim(),
      donViCoBan: input.donViCoBan.trim(),
      donViLon: input.donViLon?.trim() || undefined,
      heSoQuyDoi: input.heSoQuyDoi,
      moTa: input.moTa?.trim() || undefined,
      anh: input.anh ?? [],
      giaBan: input.giaBan,
      tonMin: input.tonMin,
      tonMax: input.tonMax,
      // Mã hệ thống = id, không xoá được — mirror ERP.
      ma: [{ ma: id, kieu: 'qr', nguon: 'he_thong' }],
      trangThai: input.trangThai ?? 'active',
    };
    MOCK_VATTU.push(sku);
    return sku;
  }
  const { data } = await client.post<VatTu>('/vat-tu', input);
  return data;
}

export async function updateSku(id: string, patch: Partial<CreateSkuInput>): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const sku = MOCK_VATTU.find((v) => v.id === id);
    if (!sku) throw new MockApiError('Không tìm thấy vật tư', 'khong_tim_thay', 404);
    // Đơn vị của SỔ KHO là bất biến sau move đầu — đổi là cả lịch sử đọc sai.
    const hasMoves = MOCK_MOVES_STORE.some((m) => m.vatTuId === id);
    if (hasMoves) {
      if (patch.donViCoBan !== undefined && patch.donViCoBan.trim() !== sku.donViCoBan) {
        throw new MockApiError(
          'SKU đã có phát sinh sổ — không đổi được đơn vị cơ bản.',
          'don_vi_khoa',
          409,
        );
      }
      if (patch.heSoQuyDoi !== undefined && patch.heSoQuyDoi !== sku.heSoQuyDoi) {
        throw new MockApiError(
          'SKU đã có phát sinh sổ — không đổi được hệ số quy đổi.',
          'he_so_khoa',
          409,
        );
      }
    }
    if (patch.ten !== undefined) sku.ten = String(patch.ten).trim();
    if (patch.loaiId !== undefined) sku.loaiId = patch.loaiId;
    if (patch.donViCoBan !== undefined) sku.donViCoBan = String(patch.donViCoBan).trim();
    if (patch.donViLon !== undefined) sku.donViLon = patch.donViLon || undefined;
    if (patch.heSoQuyDoi !== undefined) sku.heSoQuyDoi = patch.heSoQuyDoi;
    if (patch.moTa !== undefined) sku.moTa = patch.moTa || undefined;
    if (patch.anh !== undefined) sku.anh = patch.anh;
    if (patch.giaBan !== undefined) sku.giaBan = patch.giaBan;
    if (patch.tonMin !== undefined) sku.tonMin = patch.tonMin;
    if (patch.tonMax !== undefined) sku.tonMax = patch.tonMax;
    if (patch.trangThai !== undefined) sku.trangThai = patch.trangThai;
    return sku;
  }
  const { data } = await client.put<VatTu>(`/vat-tu/${id}`, patch);
  return data;
}

// ============ MÃ QR / BARCODE ============

export async function addMa(
  id: string,
  input: { ma: string; kieu: MaKieu; nguon?: Exclude<MaNguon, 'he_thong'> },
): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const sku = MOCK_VATTU.find((v) => v.id === id);
    if (!sku) throw new MockApiError('Không tìm thấy vật tư', 'khong_tim_thay', 404);
    const ma = input.ma.trim();
    if (!ma) throw new MockApiError('Thiếu mã.', 'thieu_ma', 400);
    // Duplicate check global: một mã không thể gắn 2 SKU.
    for (const s of MOCK_VATTU) {
      if (s.id === id) continue;
      if (s.ma.some((m) => m.ma === ma)) {
        throw new MockApiError(
          `Mã "${ma}" đã gắn cho SKU khác: ${s.ten} (${s.id}).`,
          'ma_da_gan',
          409,
        );
      }
    }
    if (sku.ma.some((m) => m.ma === ma)) return sku; // no-op
    sku.ma = [...sku.ma, { ma, kieu: input.kieu, nguon: input.nguon ?? 'tu_gan' }];
    return sku;
  }
  const { data } = await client.post<VatTu>(`/vat-tu/${id}/ma`, input);
  return data;
}

export async function removeMa(id: string, ma: string): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const sku = MOCK_VATTU.find((v) => v.id === id);
    if (!sku) throw new MockApiError('Không tìm thấy vật tư', 'khong_tim_thay', 404);
    const target = sku.ma.find((m) => m.ma === ma);
    if (target?.nguon === 'he_thong') {
      throw new MockApiError('Mã hệ thống không xoá được.', 'ma_he_thong', 400);
    }
    sku.ma = sku.ma.filter((m) => m.ma !== ma);
    return sku;
  }
  const { data } = await client.delete<VatTu>(
    `/vat-tu/${id}/ma/${encodeURIComponent(ma)}`,
  );
  return data;
}

// ============ LOẠI ============

export async function listLoai(): Promise<VatTuLoai[]> {
  if (MOCK_API) return delay(MOCK_LOAI);
  const { data } = await client.get<BeList<VatTuLoai>>('/vat-tu/loai');
  return data.rows ?? [];
}

// ============ NCC ============

export async function listNcc(): Promise<NhaCungCap[]> {
  if (MOCK_API) return delay(MOCK_NCC);
  const { data } = await client.get<BeList<NhaCungCap>>('/vat-tu/ncc');
  return data.rows ?? [];
}

export async function createNcc(
  input: Omit<NhaCungCap, 'id'>,
): Promise<NhaCungCap> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    if (!input.ten?.trim()) throw new MockApiError('Thiếu tên NCC.', 'thieu_ten', 400);
    const ncc: NhaCungCap = {
      id: nextNccId(),
      ten: input.ten.trim(),
      dienThoai: input.dienThoai?.trim() || undefined,
      diaChi: input.diaChi?.trim() || undefined,
      maSoThue: input.maSoThue?.trim() || undefined,
    };
    MOCK_NCC.push(ncc);
    return ncc;
  }
  const { data } = await client.post<NhaCungCap>('/vat-tu/ncc', input);
  return data;
}
