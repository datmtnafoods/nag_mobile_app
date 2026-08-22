import axios from 'axios';
import { client, MOCK_API } from '../client';
import type { LichCayTrong } from '../../features/den-thua/types';
import { MOCK_LICH_CAY } from '../../mocks/den-thua.mock';

/**
 * Lịch chuẩn cây trồng — cấu hình per-loại cây, áp cho MỌI thửa trồng cây khớp
 * `tuKhoa`. Trước đây là hằng hardcode ở `lich-canh-tac.ts`; nay KTV chỉnh qua
 * `app/thua/lich-cay/[cayId].tsx`.
 *
 * Backend THẬT: module `crop-catalog` ở nag_erp (migration 2026-08-22) —
 * `GET /crop-catalog`, `GET/PUT/DELETE /crop-catalog/:id`. PUT thay TRỌN bộ mốc
 * 1 lệnh (upsert theo id). Sửa lịch gate quyền `crop-catalog:edit` (KTV có).
 * Shape wire = chính `LichCayTrong` nên không phải map. Nhánh MOCK_API giữ để
 * demo local (mock in-memory, MẤT KHI RELOAD).
 */

const MOCK_DELAY = 220;

export async function listLichCay(): Promise<LichCayTrong[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    // Trả bản sao để component không mutate store trực tiếp.
    return MOCK_LICH_CAY.map((l) => JSON.parse(JSON.stringify(l)) as LichCayTrong);
  }
  const { data } = await client.get<{ rows: LichCayTrong[] }>('/crop-catalog');
  return data.rows ?? [];
}

export async function getLichCay(id: string): Promise<LichCayTrong | null> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const found = MOCK_LICH_CAY.find((l) => l.id === id);
    return found ? (JSON.parse(JSON.stringify(found)) as LichCayTrong) : null;
  }
  try {
    const { data } = await client.get<LichCayTrong>(`/crop-catalog/${id}`);
    return data;
  } catch (err) {
    // Cây chưa có lịch (màn Tạo lịch mới) → 404 = null, không phải lỗi.
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Upsert lịch theo `id`. Lịch mới → push; lịch cũ → thay TẠI CHỖ (giữ tham
 * chiếu để mọi hook đọc trực tiếp `MOCK_LICH_CAY` cũng thấy — dù pattern chuẩn
 * là qua query).
 */
export async function luuLichCay(lich: LichCayTrong): Promise<LichCayTrong> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 120));
    const i = MOCK_LICH_CAY.findIndex((l) => l.id === lich.id);
    const clone = JSON.parse(JSON.stringify(lich)) as LichCayTrong;
    if (i >= 0) MOCK_LICH_CAY[i] = clone;
    else MOCK_LICH_CAY.push(clone);
    return clone;
  }
  const { data } = await client.put<LichCayTrong>(`/crop-catalog/${lich.id}`, lich);
  return data;
}

export async function xoaLichCay(id: string): Promise<void> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const i = MOCK_LICH_CAY.findIndex((l) => l.id === id);
    if (i >= 0) MOCK_LICH_CAY.splice(i, 1);
    return;
  }
  await client.delete(`/crop-catalog/${id}`);
}
