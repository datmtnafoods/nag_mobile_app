import { client, MOCK_API } from '../client';
import type {
  CreateThuaDatBody,
  KetQuaDoThua,
  ThuaDat,
  ThuaDatKemHo,
} from '../../features/den-ruong/types';
import {
  areaHa,
  centroid,
  khoangCachM,
  pointInRing,
  validateRing,
} from '../../features/den-ruong/geo';
import { MOCK_THUA_DAT, nextThuaId } from '../../mocks/den-ruong.mock';
import { getPartiesByIds } from './parties';

const MOCK_DELAY = 320;

class MockApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function todayShort(): string {
  const d = new Date();
  return `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export async function listPlots(
  query: { status?: ThuaDat['status'] } = {},
): Promise<ThuaDat[]> {
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return MOCK_THUA_DAT.filter((p) => !query.status || p.status === query.status);
  }
  const { data } = await client.get<{ rows: ThuaDat[]; total: number }>(
    '/growing-areas/plots',
    { params: query },
  );
  return data.rows ?? [];
}

export async function createPlot(body: CreateThuaDatBody): Promise<ThuaDat> {
  // Validate trước ở client — cùng luật với backend `validateRing`, để báo lỗi
  // tiếng Việt ngay tại form thay vì đợi 400 rồi mới biết.
  const loi = validateRing(body.boundary);
  if (loi) throw new MockApiError(loi, 'ranh_khong_hop_le', 400);
  if (!body.partyId) {
    throw new MockApiError('Thửa phải gắn 1 nông hộ.', 'thieu_party', 400);
  }

  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 200));
    const thua: ThuaDat = {
      id: nextThuaId(todayShort()),
      // Backend TỰ GÁN zoneId theo tâm thửa (point-in-polygon với các vùng
      // trồng đã duyệt). Mock chưa có vùng trồng nào nên để null — đúng hành vi
      // thật khi tâm không rơi vào vùng nào.
      zoneId: null,
      partyId: body.partyId,
      cropName: body.cropName?.trim() || null,
      boundary: body.boundary,
      areaHa: areaHa(body.boundary),
      // Backend ép 'pending' bất kể client gửi gì — người vẽ không tự duyệt.
      status: 'pending',
      note: body.note?.trim() || null,
      createdBy: 'U-04',
      createdAt: new Date().toISOString(),
    };
    MOCK_THUA_DAT.push(thua);
    return thua;
  }

  // Backend chỉ nhận đúng 4 field; gửi thêm areaHa/status/zoneId bị bỏ im lặng.
  const { data } = await client.post<ThuaDat>('/growing-areas/plots', {
    partyId: body.partyId,
    boundary: body.boundary,
    cropName: body.cropName,
    note: body.note,
  });
  return data;
}

/** Bán kính coi là "gần đây" khi GPS rơi ngoài mọi ranh thửa. */
const BAN_KINH_GAN_M = 300;

/**
 * Dò xem toạ độ đang đứng có thuộc thửa nào chưa.
 *
 * ⚠️ CẢNH BÁO KHI NỐI BACKEND THẬT: hiện dò bằng cách tải `GET /plots` rồi chạy
 * point-in-polygon ở client. Nhưng backend LỌC THEO NGƯỜI TẠO — ai không có
 * `growing-area:approve` thì chỉ thấy thửa DO CHÍNH MÌNH vẽ. Nghĩa là NV A đứng
 * trên thửa NV B đã vẽ sẽ không thấy gì → app kết luận sai "chưa có thửa" → vẽ
 * đè, tạo nông hộ trùng.
 *
 * Cách đúng: backend thêm endpoint tra-theo-toạ-độ BỎ QUA lọc ownership. Dựng
 * dễ — `plotsRepo.all()` + `pointInRing` đều đã có sẵn ở `core/geo.js`.
 */
export async function timThuaTheoToaDo(lat: number, lng: number): Promise<KetQuaDoThua> {
  const plots = await listPlots();
  const diem: [number, number] = [lng, lat]; // thứ tự GeoJSON, KHÔNG phải [lat,lng]

  const trungRaw = plots.filter((p) => pointInRing(diem, p.boundary));
  const ganRaw = plots
    .filter((p) => !trungRaw.includes(p))
    .map((p) => {
      const c = centroid(p.boundary);
      const d = c ? khoangCachM({ lat, lng }, { lat: c[1], lng: c[0] }) : Number.MAX_SAFE_INTEGER;
      return { plot: p, khoangCachM: d };
    })
    .filter((x) => x.khoangCachM <= BAN_KINH_GAN_M)
    .sort((a, b) => a.khoangCachM - b.khoangCachM);

  // Join tên hộ một lượt cho cả hai nhóm — tránh N+1.
  const parties = await getPartiesByIds([
    ...trungRaw.map((p) => p.partyId),
    ...ganRaw.map((x) => x.plot.partyId),
  ]);
  const kemHo = (p: ThuaDat): ThuaDatKemHo => ({
    ...p,
    tenHo: parties[p.partyId]?.name,
    dienThoaiHo: parties[p.partyId]?.phones?.[0],
  });

  return {
    trung: trungRaw.map(kemHo),
    ganDo: ganRaw.map((x) => ({ ...kemHo(x.plot), khoangCachM: x.khoangCachM })),
  };
}
