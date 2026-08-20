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
  // Backend trả { rows, total } theo `listResponse` (nag_erp_api/src/core/list.js).
  const { data } = await client.get<{ rows: Party[] }>('/parties', { params: { q } });
  return data.rows;
}

/**
 * Liệt kê nông hộ cho màn quản lý. Khác `searchParties` (cố ý trả `[]` khi rỗng
 * để không nạp cả bảng lúc gõ tìm), hàm này trả danh sách đầy đủ để duyệt.
 */
export async function listParties(
  params: { q?: string; kind?: PartyKind; mine?: boolean } = {},
): Promise<Party[]> {
  const { q, kind, mine } = params;
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const needle = q?.trim().toLowerCase();
    return MOCK_PARTIES.filter((p) => {
      // Hộ seed cũ (p_001..003) chưa gắn `kind` — coi như household, đừng loại.
      if (kind && p.kind && p.kind !== kind) return false;
      if (needle) {
        return (
          p.name.toLowerCase().includes(needle) ||
          p.phones.some((ph) => ph.includes(needle))
        );
      }
      return true;
    });
  }
  const { data } = await client.get<{ rows: Party[] }>('/parties', {
    // `mine=1` truyền chuỗi vì backend đọc `req.query.mine === '1' | 'true'`.
    params: { q, kind, mine: mine ? '1' : undefined, pageSize: 200 },
  });
  return data.rows;
}

export async function getParty(id: string): Promise<Party | null> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, 120));
    return MOCK_PARTIES.find((p) => p.id === id) ?? null;
  }
  // Backend trả object trần (200) hoặc 404 (svc.getById throw notFound).
  try {
    const { data } = await client.get<Party>(`/parties/${id}`);
    return data ?? null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } } | null)?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

/** Nạp nhiều hộ một lượt — để join tên hộ vào danh sách thửa mà không N+1. */
export async function getPartiesByIds(
  ids: Array<string | null | undefined>,
): Promise<Record<string, Party>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => Boolean(x))));
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
        .get<Party>(`/parties/${id}`)
        .then((r) => r.data)
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
  // ─ Danh tính điền từ QR mặt sau CCCD. Backend cần thêm cột tương ứng (xem
  //   doc-comment createParty). Số CCCD là dữ liệu cá nhân nhạy cảm (NĐ 13/2023).
  cccd?: string;
  /** Ngày sinh ISO 'YYYY-MM-DD'. */
  dob?: string;
  gender?: 'nam' | 'nu';
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
 * BACKEND ĐÃ SẴN SÀNG (kiểm 2026-08-20): `POST /parties` có ở
 * `nag_erp_api/src/modules/party/routes.js` (`requirePerm('party:create')`, trả
 * 201), và `field_staff` ĐÃ có `party:create` trong `core/rbac.js` — đổi chính
 * sách 2026-08 để KTV tạo được hộ ngay tại vườn. Chạy được ở real mode.
 *
 * Mock chặn trùng SĐT/CCCD y như ràng buộc backend (`party_phone.phone` là PK)
 * để lúc nối thật không vỡ.
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

    const cccd = input.cccd?.trim() || undefined;
    if (cccd) {
      // Backend nên đặt UNIQUE cho `party.cccd` (một số CCCD = một hộ). Mock chặn
      // trước để lúc nối thật không vỡ, giống guard số điện thoại ở trên.
      const trungCccd = MOCK_PARTIES.find((p) => p.cccd === cccd);
      if (trungCccd) {
        throw new MockApiError(
          `Số CCCD này đã thuộc hộ "${trungCccd.name}". Mỗi CCCD chỉ gắn một hộ.`,
          'cccd_da_ton_tai',
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
      cccd,
      dob: input.dob || undefined,
      gender: input.gender,
    };
    MOCK_PARTIES.push(party);
    return party;
  }
  // `...input` đã mang cccd/dob/gender — backend cần cột tương ứng cho 3 field này.
  // Backend trả object trần (201) — nag_erp_api/src/modules/party/routes.js.
  const { data } = await client.post<Party>('/parties', {
    ...input,
    kind: input.kind ?? 'household',
  });
  return data;
}

export type UpdatePartyInput = {
  name?: string;
  phone?: string;
  address?: string;
  commune?: string;
  province?: string;
  note?: string;
  cccd?: string;
  dob?: string;
  gender?: 'nam' | 'nu';
};

/**
 * Sửa hồ sơ nông hộ đã có. Chỉ truyền field cần sửa (partial patch).
 * SĐT là APPEND — thêm số mới, không thay số cũ (mobile hiện chưa cần "xoá số").
 */
export async function updateParty(id: string, input: UpdatePartyInput): Promise<Party> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const idx = MOCK_PARTIES.findIndex((p) => p.id === id);
    if (idx < 0) throw new MockApiError('Không tìm thấy nông hộ.', 'khong_thay', 404);
    const p = MOCK_PARTIES[idx]!;
    if (input.name !== undefined) p.name = input.name.trim();
    if (input.address !== undefined) p.address = input.address.trim() || undefined;
    if (input.commune !== undefined) p.commune = input.commune.trim() || undefined;
    if (input.cccd !== undefined) p.cccd = input.cccd.trim() || undefined;
    if (input.dob !== undefined) p.dob = input.dob || undefined;
    if (input.gender !== undefined) p.gender = input.gender;
    if (input.phone) {
      const ph = input.phone.trim();
      if (ph && !p.phones.includes(ph)) p.phones.push(ph);
    }
    return { ...p };
  }
  const { data } = await client.patch<Party>(`/parties/${id}`, input);
  return data;
}
