import { client, MOCK_API } from '../client';
import type { Nursery, SeedProduct } from '../../features/orders/types';
import { MOCK_NURSERIES, MOCK_SEED_PRODUCTS } from '../../mocks/catalog.mock';

const MOCK_DELAY = 250;

function delay<T>(value: T, ms = MOCK_DELAY): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

export async function listNurseries(q?: string): Promise<Nursery[]> {
  if (MOCK_API) {
    const needle = q?.trim().toLowerCase();
    const filtered = needle
      ? MOCK_NURSERIES.filter((n) => n.name.toLowerCase().includes(needle))
      : MOCK_NURSERIES;
    return delay(filtered);
  }
  const { data } = await client.get<{ data: Nursery[] }>('/seed-orders/nurseries', {
    params: { q, pageSize: 100 },
  });
  return data.data;
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
  const { data } = await client.get<{ data: SeedProduct[] }>('/seed-orders/seed-products', {
    params: { nurseryId, q },
  });
  return data.data;
}
