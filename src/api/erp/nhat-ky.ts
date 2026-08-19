import { client, MOCK_API } from '../client';
import type { CreateNhatKyBody, NhatKyCanhTac } from '../../features/den-ruong/types';
import { MOCK_NHAT_KY, nextNhatKyId } from '../../mocks/den-ruong.mock';

/**
 * Nhật ký canh tác.
 *
 * BACKEND CHƯA CÓ MODULE NÀY. Thứ gần nhất là bảng `task` + `task_update`
 * (`07_task.sql`) — đã chốt schema, có sẵn `kind='field_visit'` và cột
 * `growing_plot_id`, contract HTTP cũng đã viết sẵn ở web SPA
 * (`features/task/api/http.ts`), nhưng `src/modules/task/` chưa được dựng.
 *
 * Shape ở đây bám theo bảng đó để đợt nối backend chỉ phải đổi tầng này, không
 * phải sửa UI. Hai chỗ sẽ cần xử lý thêm khi nối thật:
 *   - `anh` hiện là data URL base64 (giống mọi nghiệp vụ khác trong hệ) →
 *     backend thật nên đổi sang objectKey MinIO.
 *   - `ghiAmUri` là file cục bộ. Backend ĐANG CHẶN CỨNG audio ở
 *     `core/chat-media.js isAllowed()` (chỉ cho image/video + vài đuôi tài
 *     liệu), nên ghi âm chưa upload được — phải nới whitelist trước.
 */

const MOCK_DELAY = 300;

function todayShort(): string {
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export async function listNhatKy(query: { plotId?: string } = {}): Promise<NhatKyCanhTac[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_NHAT_KY.filter((n) => !query.plotId || n.plotId === query.plotId).sort((a, b) =>
      b.taoLuc.localeCompare(a.taoLuc),
    );
  }
  const { data } = await client.get<{ rows: NhatKyCanhTac[] }>('/tasks', {
    params: { kind: 'field_visit', growingPlotId: query.plotId },
  });
  return data.rows ?? [];
}

export async function taoNhatKy(body: CreateNhatKyBody): Promise<NhatKyCanhTac> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 200));
    const nk: NhatKyCanhTac = {
      id: nextNhatKyId(todayShort()),
      plotId: body.plotId,
      partyId: body.partyId,
      loai: body.loai,
      moTa: body.moTa?.trim() || undefined,
      anh: body.anh ?? [],
      ghiAmUri: body.ghiAmUri,
      ghiAmGiay: body.ghiAmGiay,
      dongVatTu: body.dongVatTu,
      viTri: body.viTri,
      nguoiTao: 'NV Thị trường (mock)',
      taoLuc: new Date().toISOString(),
    };
    MOCK_NHAT_KY.unshift(nk);
    return nk;
  }
  const { plotId, ...phanConLai } = body;
  const { data } = await client.post<NhatKyCanhTac>('/tasks', {
    kind: 'field_visit',
    growingPlotId: plotId,
    ...phanConLai,
  });
  return data;
}
