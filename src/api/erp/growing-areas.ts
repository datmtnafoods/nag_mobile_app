import AsyncStorage from '@react-native-async-storage/async-storage';
import { client, MOCK_API, laLoiMang } from '../client';
import type {
  CreateThuaDatBody,
  KetQuaDoThua,
  ThuaDat,
  ThuaDatKemHo,
} from '../../features/den-thua/types';
import {
  areaHa,
  centroid,
  khoangCachM,
  pointInRing,
  validateRing,
} from '../../features/den-thua/geo';
import { MOCK_THUA_DAT, nextThuaId } from '../../mocks/den-thua.mock';
import { getPartiesByIds } from './parties';

const MOCK_DELAY = 320;

/**
 * Cache danh sách thửa để DÒ THỬA chạy được khi offline (phép so trùng là
 * point-in-polygon thuần client — chỉ thiếu danh sách thửa khi mất mạng).
 *
 * PII: chỉ cache `ThuaDat` THUẦN (hình học + cây + trạng thái) — KHÔNG có tên/
 * SĐT hộ (thứ đó nằm ở `ThuaDatKemHo`, ghép runtime từ `parties`, không đi qua
 * đây). Đúng khuôn "không persist PII" của repo.
 */
const THUA_CACHE_KEY = 'nag.thua-cache';

async function docThuaCache(): Promise<ThuaDat[] | null> {
  try {
    const raw = await AsyncStorage.getItem(THUA_CACHE_KEY);
    if (!raw) return null;
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ThuaDat[]) : null;
  } catch {
    return null;
  }
}

async function ghiThuaCache(plots: ThuaDat[]): Promise<void> {
  try {
    await AsyncStorage.setItem(THUA_CACHE_KEY, JSON.stringify(plots));
  } catch {
    // Cache chỉ là bonus offline — ghi hỏng thì thôi, không làm vỡ luồng.
  }
}

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
  try {
    const { data } = await client.get<{ rows: ThuaDat[]; total: number }>(
      '/growing-areas/plots',
      { params: query },
    );
    // Normalize `cropXen`: BE VARCHAR trả string ("Ngô, Đậu") — parse về array cho
    // đồng nhất với type mobile. Sau migration VARCHAR → TEXT[] bên `nag_erp` thì
    // bỏ đoạn này (giữ nguyên `data.rows ?? []`).
    const plots = (data.rows ?? []).map((p) => ({ ...p, cropXen: chuanHoaCropXen(p.cropXen) }));
    // Chỉ cache khi lấy TOÀN BỘ (không lọc status) để không ghi đè cache đầy đủ
    // bằng một tập con — dò thửa cần cả danh sách.
    if (!query.status) void ghiThuaCache(plots);
    return plots;
  } catch (err) {
    // Mất mạng → rơi về cache đã sync (nếu có) để dò thửa vẫn chạy offline.
    // Lỗi nghiệp vụ (4xx/5xx) thì KHÔNG nuốt — ném tiếp như cũ.
    if (laLoiMang(err)) {
      const cached = await docThuaCache();
      if (cached) return query.status ? cached.filter((p) => p.status === query.status) : cached;
    }
    throw err;
  }
}

/** BE `crop_xen` là VARCHAR — coerce về `string[]` trước khi vào UI. */
function chuanHoaCropXen(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * Danh sách thửa kèm tên hộ — cho màn "Quản lý thửa" và "Chi tiết nông hộ".
 * Lọc theo `partyId` để lấy thửa của một hộ. Join một lượt tránh N+1.
 */
export async function listPlotsKemHo(
  query: { status?: ThuaDat['status']; partyId?: string } = {},
): Promise<ThuaDatKemHo[]> {
  const plots = await listPlots({ status: query.status });
  const loc = query.partyId ? plots.filter((p) => p.partyId === query.partyId) : plots;
  const parties = await getPartiesByIds(loc.map((p) => p.partyId));
  return loc.map((p) => {
    const ho = p.partyId ? parties[p.partyId] : undefined;
    return { ...p, tenHo: ho?.name, dienThoaiHo: ho?.phones?.[0] };
  });
}

/**
 * Lấy một thửa kèm tên hộ.
 *
 * Backend KHÔNG có `GET /growing-areas/plots/:id` — chỉ có list. Nên phải tải
 * list rồi lọc. Chấp nhận được vì dữ liệu nhỏ; khi backend thêm endpoint thì
 * đổi đúng một chỗ này.
 */
export async function getPlot(id: string): Promise<ThuaDatKemHo | null> {
  const plots = await listPlots();
  const thua = plots.find((p) => p.id === id);
  if (!thua) return null;
  const parties = await getPartiesByIds([thua.partyId]);
  const ho = thua.partyId ? parties[thua.partyId] : undefined;
  return { ...thua, tenHo: ho?.name, dienThoaiHo: ho?.phones?.[0] };
}

export async function createPlot(body: CreateThuaDatBody): Promise<ThuaDat> {
  // Validate trước ở client — cùng luật với backend `validateRing`, để báo lỗi
  // tiếng Việt ngay tại form thay vì đợi 400 rồi mới biết.
  const loi = validateRing(body.boundary);
  if (loi) throw new MockApiError(loi, 'ranh_khong_hop_le', 400);
  // Nông hộ KHÔNG bắt buộc lúc tạo (vẽ thửa trước, gán hộ sau). LƯU Ý: backend
  // thật `service.createPlot` vẫn ném 400 nếu thiếu partyId — thửa không hộ chỉ
  // chạy được ở mock; đợt nối backend phải nới ràng buộc này.

  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY + 200));
    const thua: ThuaDat = {
      id: nextThuaId(todayShort()),
      // Backend TỰ GÁN zoneId theo tâm thửa (point-in-polygon với các vùng
      // trồng đã duyệt). Mock chưa có vùng trồng nào nên để null — đúng hành vi
      // thật khi tâm không rơi vào vùng nào.
      zoneId: null,
      partyId: body.partyId ?? null,
      cropName: body.cropName?.trim() || null,
      // Cây xen — danh sách. List rỗng = không xen. Backend `crop_xen` hiện là
      // VARCHAR, chờ đổi sang TEXT[] (xem `ThuaDat.cropXen`).
      cropXen: body.cropXen && body.cropXen.length ? [...body.cropXen] : undefined,
      boundary: body.boundary,
      areaHa: areaHa(body.boundary),
      // Backend ép 'pending' bất kể client gửi gì — người vẽ không tự duyệt.
      status: 'pending',
      note: body.note?.trim() || null,
      createdBy: 'U-04',
      createdAt: new Date().toISOString(),
      // Backend chưa có cột `planted_at` — mock giữ riêng để tính timeline.
      ngayGoc: body.ngayGoc,
    };
    MOCK_THUA_DAT.push(thua);
    return thua;
  }

  // Backend nhận: boundary, cropName, cropXen, note, partyId. Field khác bị bỏ im lặng.
  const payload: Record<string, unknown> = {
    boundary: body.boundary,
    cropName: body.cropName,
    note: body.note,
  };
  // Cây xen: BE `crop_xen` HIỆN LÀ VARCHAR — service gọi `.trim()` trên input.cropXen
  // nên gửi array sẽ ném "input.cropXen?.trim is not a function". Serialize sang string
  // ngăn cách dấu phẩy. Khi migration `crop_xen: VARCHAR → TEXT[]` xong bên `nag_erp`,
  // đổi lại thành `payload.cropXen = body.cropXen`.
  if (body.cropXen?.length) payload.cropXen = body.cropXen.join(', ');
  // Backend thật BẮT BUỘC partyId (400 nếu thiếu) — chỉ đính khi có. Thửa không
  // hộ là hành vi mock; nối thật thì phải nới `service.createPlot`.
  if (body.partyId) payload.partyId = body.partyId;
  // Ngày trồng → cột `planted_at` (nag_erp migration 2026-08-22). Backend map
  // `ngayGoc`, dùng làm mốc T+0 tính lịch canh tác.
  if (body.ngayGoc) payload.ngayGoc = body.ngayGoc;
  const { data } = await client.post<ThuaDat>('/growing-areas/plots', payload);
  return { ...data, cropXen: chuanHoaCropXen(data.cropXen) };
}

/**
 * Gán (hoặc đổi) nông hộ cho một thửa đã có — "gán sau" khi lúc tạo bỏ trống.
 *
 * Backend thật: `PATCH /growing-areas/plots/:id` nhận `partyId`, nhưng MỌI patch
 * reset thửa về `pending`. Mock giữ nguyên status cho đỡ bất ngờ khi demo.
 */
export async function ganNongHoChoThua(plotId: string, partyId: string): Promise<ThuaDat> {
  if (!partyId) throw new MockApiError('Chọn nông hộ để gán.', 'thieu_party', 400);
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const thua = MOCK_THUA_DAT.find((p) => p.id === plotId);
    if (!thua) throw new MockApiError('Không tìm thấy thửa.', 'khong_thay', 404);
    thua.partyId = partyId;
    return thua;
  }
  const { data } = await client.patch<ThuaDat>(`/growing-areas/plots/${plotId}`, { partyId });
  return { ...data, cropXen: chuanHoaCropXen(data.cropXen) };
}

/**
 * Cập nhật thửa đã lưu — dùng cho "Sửa ranh" từ chi tiết thửa. Backend `updatePlot`
 * chấp: boundary (cleanRing + tính lại areaHa/zoneId), partyId, cropName, cropXen,
 * note. MỌI patch reset thửa về 'pending' (nghiệp vụ: ranh đã duyệt sửa xong coi
 * như nộp lại).
 */
export async function updatePlot(
  plotId: string,
  patch: Partial<
    Pick<CreateThuaDatBody, 'boundary' | 'cropName' | 'cropXen' | 'note' | 'partyId' | 'ngayGoc'>
  >,
): Promise<ThuaDat> {
  if (patch.boundary) {
    const loi = validateRing(patch.boundary);
    if (loi) throw new MockApiError(loi, 'ranh_khong_hop_le', 400);
  }
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const thua = MOCK_THUA_DAT.find((p) => p.id === plotId);
    if (!thua) throw new MockApiError('Không tìm thấy thửa.', 'khong_thay', 404);
    if (patch.boundary) {
      thua.boundary = patch.boundary;
      thua.areaHa = areaHa(patch.boundary);
      thua.status = 'pending';
    }
    if (patch.cropName !== undefined) thua.cropName = patch.cropName?.trim() || null;
    if (patch.cropXen !== undefined) thua.cropXen = patch.cropXen.length ? [...patch.cropXen] : undefined;
    if (patch.note !== undefined) thua.note = patch.note?.trim() || null;
    if (patch.partyId !== undefined) thua.partyId = patch.partyId || null;
    // Backend chưa có cột `planted_at` — mock giữ riêng (giống createPlot).
    if (patch.ngayGoc !== undefined) thua.ngayGoc = patch.ngayGoc;
    return thua;
  }
  // `ngayGoc` → cột `planted_at` (nag_erp migration 2026-08-22) — nay backend
  // nhận + trả về, giữ trong payload. `cropXen` vẫn phải serialize riêng (VARCHAR).
  const { cropXen: _cropXen, ...phanConLai } = patch;
  const payload: Record<string, unknown> = { ...phanConLai };
  // Serialize array → string cho VARCHAR BE (xem doc-comment `createPlot`). Mảng rỗng
  // = clear → gửi chuỗi rỗng để BE overwrite null; undefined = không đụng field.
  if (_cropXen !== undefined) {
    payload.cropXen = _cropXen.length ? _cropXen.join(', ') : '';
  }
  const { data } = await client.patch<ThuaDat>(`/growing-areas/plots/${plotId}`, payload);
  return { ...data, cropXen: chuanHoaCropXen(data.cropXen) };
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
  const kemHo = (p: ThuaDat): ThuaDatKemHo => {
    const ho = p.partyId ? parties[p.partyId] : undefined;
    return { ...p, tenHo: ho?.name, dienThoaiHo: ho?.phones?.[0] };
  };

  return {
    trung: trungRaw.map(kemHo),
    ganDo: ganRaw.map((x) => ({ ...kemHo(x.plot), khoangCachM: x.khoangCachM })),
  };
}
