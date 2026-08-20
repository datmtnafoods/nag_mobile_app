import { client, MOCK_API } from '../client';

/**
 * Users API — chỉ dùng cho luồng "scope của tôi" ở mobile GĐ2 (ownership hộ theo
 * vùng). Quản tài khoản đầy đủ (admin CRUD) ở màn Vue SPA, không cần trên mobile.
 */

export type MyStation = {
  id: string;
  name: string;
  province: string | null;
  commune: string | null;
  isPrimary: boolean;
};

export type MyScope = {
  /** true = user không bị giới hạn (admin/viewer) → mine=1 không lọc thêm. */
  seeAll: boolean;
  stations: MyStation[];
  communes: string[];
  provinces: string[];
};

/** Nạp scope của user đang đăng nhập. KTV chưa gán trạm → stations rỗng nhưng
 *  seeAll cũng false → mine=1 sẽ fallback createdBy ở backend. */
export async function getMyScope(): Promise<MyScope> {
  if (MOCK_API) {
    // Mock không có scope thật — trả seeAll để KTV mock thấy mọi hộ (không chặn dev).
    return { seeAll: true, stations: [], communes: [], provinces: [] };
  }
  const { data } = await client.get<MyScope>('/users/me/scope');
  return data;
}
