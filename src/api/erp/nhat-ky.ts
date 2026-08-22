import { client, MOCK_API } from '../client';
import type {
  ChiTietNhatKy,
  ChiTietPhunThuoc,
  CreateNhatKyBody,
  NhatKyCanhTac,
} from '../../features/den-thua/types';
import { MOCK_NHAT_KY, nextNhatKyId } from '../../mocks/den-thua.mock';

/**
 * Nhật ký canh tác — W5.
 *
 * Backend **v0 Mongo có** ở `nag_erp_api/src/modules/task/` (commit 74dfd75):
 * `GET/POST /tasks?kind=field_visit&growingPlotId=…`. Sẽ **tách và thay bằng
 * `cultivation_log` Postgres** trong đợt trục canh tác DB (nag_erp plan §9.6),
 * lúc đó có thể đổi ID prefix và shape response — nên KHÔNG nối cứng shape:
 * dùng lại chính type ở đây và ép ở tầng service là biên phòng tuyến.
 *
 * **Backend đang vứt yên lặng** hai field, mobile chủ động strip trước khi gửi
 * để log rõ đây là hành vi cố ý (không phải bug), và để lượt migrate tìm được
 * hết nơi cần đổi khi backend nhận thật:
 *   - `anh` (data URL base64): `task/service.js:41` hard-code `anh: []`. Sau
 *     này backend sẽ nhận objectKey MinIO — thay đổi ở đây, không đụng UI.
 *   - `ghiAmUri` / `ghiAmGiay`: whitelist `core/chat-media.js isAllowed()` chỉ
 *     cho `image/*` + `video/*` + vài đuôi tài liệu, không có `audio/*`. Phải
 *     nới whitelist backend trước khi ghi âm upload được.
 *
 * **`dongVatTu`** (SKU vật tư dùng khi bón/phun) pass-through — BE hiện chưa
 * đọc field này (không có trong `task/service.js`). Chỉ ghi nhận, KHÔNG trừ tồn
 * kho ở bất kỳ nơi nào; khi BE thêm cột thì UI không phải đổi.
 *
 * Ảnh + ghi âm vẫn được **giữ ở nhánh MOCK_API** để demo local thấy đủ.
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
  // Strip explicit các field BE đang vứt (`anh`, `ghiAmUri`, `ghiAmGiay`) — xem
  // doc-comment đầu file. Server sẽ trả bản ghi không có ảnh/âm; nếu muốn thấy
  // đủ trên UI khi demo, chạy MOCK_API=1.
  const { plotId, anh: _anh, ghiAmUri: _ga, ghiAmGiay: _gg, ...phanConLai } = body;
  const { data } = await client.post<NhatKyCanhTac>('/tasks', {
    kind: 'field_visit',
    growingPlotId: plotId,
    ...phanConLai,
  });
  return data;
}
