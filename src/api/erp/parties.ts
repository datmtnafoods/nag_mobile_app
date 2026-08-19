import { client, MOCK_API } from '../client';
import type { Party, PartyKind } from '../../features/orders/types';
import { MOCK_PARTIES } from '../../mocks/catalog.mock';

const MOCK_DELAY = 300;

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function searchParties(q: string): Promise<Party[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_PARTIES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.phones.some((ph) => ph.includes(needle)),
    );
  }
  const { data } = await client.get<{ data: Party[] }>('/parties', { params: { q } });
  return data.data;
}

export async function getParty(id: string): Promise<Party | null> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 120));
    return MOCK_PARTIES.find((p) => p.id === id) ?? null;
  }
  const { data } = await client.get<{ data: Party }>(`/parties/${id}`);
  return data.data ?? null;
}

/** Nạp nhiều hộ một lượt — để join tên hộ vào danh sách thửa mà không N+1. */
export async function getPartiesByIds(ids: string[]): Promise<Record<string, Party>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 100));
    const out: Record<string, Party> = {};
    for (const p of MOCK_PARTIES) {
      if (unique.includes(p.id)) out[p.id] = p;
    }
    return out;
  }
  const results = await Promise.all(
    unique.map((id) =>
      client
        .get<{ data: Party }>(`/parties/${id}`)
        .then((r) => r.data.data)
        .catch(() => null),
    ),
  );
  const out: Record<string, Party> = {};
  results.forEach((p) => {
    if (p) out[p.id] = p;
  });
  return out;
}

export type CreatePartyInput = {
  name: string;
  phone?: string;
  address?: string;
  commune?: string;
  lat?: number;
  lng?: number;
  kind?: PartyKind;
};

function nextPartyId(kind: PartyKind): string {
  const prefix = kind === 'household' ? 'PTY-HH' : 'PTY-GEN';
  const nums = MOCK_PARTIES.map((p) => p.id)
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.split('-').pop()))
    .filter((n) => Number.isFinite(n))
    .concat(0);
  return `${prefix}-${String(Math.max(...nums) + 1).padStart(6, '0')}`;
}

/**
 * Tạo nông hộ.
 *
 * BACKEND CHƯA CÓ ENDPOINT NÀY — `modules/party` cố ý chỉ có `repo.js`, không
 * `routes.js` (nông hộ hiện chỉ đẻ ra như tác dụng phụ của kích hoạt tem).
 * Mock dựng sẵn đầy đủ để luồng "đến thửa" chạy được ngay; khi flip
 * `MOCK_API=0` sẽ nhận 404 và người gọi phải bắt để báo cho người dùng.
 *
 * Ngoài ra `field_staff` theo RBAC mặc định KHÔNG có `party:create` — backend
 * sẽ phải nới quyền khi dựng endpoint thật.
 */
export async function createParty(input: CreatePartyInput): Promise<Party> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 150));
    const name = input.name?.trim();
    if (!name) throw new MockApiError('Thiếu tên nông hộ.', 'thieu_ten', 400);

    const phone = input.phone?.trim();
    if (phone) {
      // Backend có `party_phone.phone` là PRIMARY KEY — một số thuộc đúng một
      // hộ trên toàn hệ thống. Mock chặn y hệt để lúc nối thật không vỡ.
      const trung = MOCK_PARTIES.find((p) => p.phones.includes(phone));
      if (trung) {
        throw new MockApiError(
          `Số ${phone} đã thuộc hộ "${trung.name}". Mỗi số điện thoại chỉ gắn một hộ.`,
          'sdt_da_ton_tai',
          409,
        );
      }
    }

    const kind: PartyKind = input.kind ?? 'household';
    const party: Party = {
      id: nextPartyId(kind),
      name,
      phones: phone ? [phone] : [],
      address: input.address?.trim() || undefined,
      commune: input.commune?.trim() || undefined,
      lat: input.lat,
      lng: input.lng,
      kind,
    };
    MOCK_PARTIES.push(party);
    return party;
  }
  const { data } = await client.post<{ data: Party }>('/parties', {
    ...input,
    kind: input.kind ?? 'household',
  });
  return data.data;
}
