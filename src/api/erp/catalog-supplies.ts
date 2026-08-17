import { client, MOCK_API } from '../client';
import type { LoaiVatTu, VatTu } from '../../features/vat-tu/types';
import { MOCK_LOAI, MOCK_VATTU, resolveMaToSku } from '../../mocks/vat-tu.mock';

const MOCK_DELAY = 250;
function delay<T>(v: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

export async function listVatTu(input: { q?: string; loaiId?: string } = {}): Promise<VatTu[]> {
  const { q, loaiId } = input;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    return delay(
      MOCK_VATTU.filter((v) => {
        if (v.trangThai !== 'active') return false;
        if (loaiId && v.loaiId !== loaiId) return false;
        if (needle) {
          const hay = `${v.ten} ${v.id} ${v.ma.map((m) => m.ma).join(' ')}`.toLowerCase();
          return hay.includes(needle);
        }
        return true;
      }),
    );
  }
  const { data } = await client.get<{ data: VatTu[] }>('/vat-tu', { params: { q, loai: loaiId } });
  return data.data;
}

export async function getVatTu(id: string): Promise<VatTu> {
  if (MOCK_API) {
    const item = MOCK_VATTU.find((v) => v.id === id);
    if (!item) throw new Error('Không tìm thấy vật tư');
    return delay(item);
  }
  const { data } = await client.get<{ data: VatTu }>(`/vat-tu/${id}`);
  return data.data;
}

export async function resolveByCode(ma: string): Promise<VatTu> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 300));
    const item = resolveMaToSku(ma);
    if (!item) {
      const err = new Error('Mã này chưa gán cho SKU nào');
      (err as Error & { code?: string }).code = 'ma_not_found';
      throw err;
    }
    return item;
  }
  const { data } = await client.get<{ data: VatTu }>('/vat-tu/resolve', { params: { ma } });
  return data.data;
}

export async function listLoai(): Promise<LoaiVatTu[]> {
  if (MOCK_API) return delay(MOCK_LOAI);
  const { data } = await client.get<{ data: LoaiVatTu[] }>('/vat-tu/loai');
  return data.data;
}
