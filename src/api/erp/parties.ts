import { client, MOCK_API } from '../client';
import type { Party } from '../../features/orders/types';
import { MOCK_PARTIES } from '../../mocks/catalog.mock';

export async function searchParties(q: string): Promise<Party[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PARTIES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.phones.some((ph) => ph.includes(needle)),
    );
  }
  const { data } = await client.get<{ data: Party[] }>('/parties', { params: { q } });
  return data.data;
}
