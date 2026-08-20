import { client, MOCK_API } from '../client';
import type {
  ChiTietNhatKy,
  ChiTietPhunThuoc,
  CreateNhatKyBody,
  NhatKyCanhTac,
} from '../../features/den-thua/types';
import { MOCK_NHAT_KY, nextNhatKyId } from '../../mocks/den-thua.mock';

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

/** Cộng n ngày vào 1 ngày ISO → 'YYYY-MM-DD'. */
function themNgay(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Mô phỏng backend: sinh field DERIVED. Với `phun_thuoc`, ngày an toàn thu hoạch
 * = ngày phun + thời gian cách ly (client KHÔNG gửi giá trị này). Backend thật sẽ
 * tính y hệt ở tầng service.
 */
function tinhChiTietServer(body: CreateNhatKyBody): ChiTietNhatKy | undefined {
  if (body.loai === 'phun_thuoc' && body.chiTiet && body.ngay) {
    const ct = body.chiTiet as ChiTietPhunThuoc;
    return { ...ct, ngayAnToanThuHoach: themNgay(body.ngay, ct.thoiGianCachLy) };
  }
  return body.chiTiet;
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
      ngay: body.ngay,
      moTa: body.moTa?.trim() || undefined,
      chiTiet: tinhChiTietServer(body),
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
