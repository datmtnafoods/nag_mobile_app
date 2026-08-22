import { client, MOCK_API } from '../client';
import type { Nursery, SeedProduct } from '../../features/orders/types';
import { MOCK_NURSERIES, MOCK_SEED_PRODUCTS } from '../../mocks/catalog.mock';

const MOCK_DELAY = 250;

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

/**
 * Bóc mảng từ response list bất kể envelope — backend NaGreen list trả `{rows,total}`
 * (KHÔNG bọc `{data}`; xem cảnh báo Khuôn 4 + commit 7e14c05). Nhận cả `{rows}`,
 * `{data}` (module cũ) lẫn mảng trần, và LUÔN trả mảng — react-query cấm `undefined`.
 */
function bocRows<T>(data: T[] | { rows?: T[]; data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  return data?.rows ?? data?.data ?? [];
}

export async function listNurseries(q?: string): Promise<Nursery[]> {
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = needle
      ? MOCK_NURSERIES.filter((n) => n.name.toLowerCase().includes(needle))
      : MOCK_NURSERIES;
    return delay(filtered);
  }
  const { data } = await client.get<Nursery[] | { rows?: Nursery[]; data?: Nursery[] }>(
    '/seed-orders/nurseries',
    { params: { q, pageSize: 100 } },
  );
  return bocRows(data);
}

export async function listSeedProducts(input: { nurseryId?: string; q?: string }): Promise<SeedProduct[]> {
  const { nurseryId, q } = input;
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = MOCK_SEED_PRODUCTS.filter((p) => {
      if (nurseryId && !p.nurseryIds.includes(nurseryId)) return false;
      if (needle) {
        return (
          p.name.toLowerCase().includes(needle) ||
          (p.varietyCode?.toLowerCase().includes(needle) ?? false)
        );
      }
      return true;
    });
    return delay(filtered);
  }
  // Real mode: BE `/seed-orders/seed-products` có thể chưa tồn tại (module cũ
  // demo). Trả `[]` khi lỗi/không có endpoint để `useQuery` không nhận undefined
  // (react-query v5 warning "Query data cannot be undefined"). UI đã fallback
  // sang danh sách gợi ý cục bộ trong `ChonCayTrong`.
  try {
    const { data } = await client.get<
      SeedProduct[] | { rows?: SeedProduct[]; data?: SeedProduct[] } | null
    >('/seed-orders/seed-products', { params: { nurseryId, q } });
    return bocRows(data);
  } catch {
    return [];
  }
}
