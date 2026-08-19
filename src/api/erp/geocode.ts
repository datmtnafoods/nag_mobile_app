import { client, MOCK_API } from '../client';
import type { DiaChiGeocode, GoiYDiaChi } from '../../features/location/types';

/**
 * Geocode đi QUA BACKEND, không gọi thẳng Goong từ mobile.
 *
 * Lý do: BE dùng polygon địa giới nội bộ (34 tỉnh / 3.321 xã, SAU sáp nhập
 * 1/7/2025). Goong còn địa giới cũ — repo ERP đã đo thật: tỉnh đúng 6/12, xã
 * SAI 12/12. Ngoài ra REST key nằm ở server nên client không lộ key, và polygon
 * nội bộ nhanh hơn nhiều (~12 ms so với ~360 ms gọi Goong qua mạng).
 *
 * Các endpoint này PUBLIC (mini-app router không gắn requirePerm).
 */

const MOCK_DELAY = 350;
const BE_TIMEOUT_MS = 4000;

/**
 * URL backend riêng cho geocode, TÁCH khỏi EXPO_PUBLIC_API_BASE_URL.
 *
 * Cố ý tách: geocode phải chạy thật ngay cả khi phần còn lại vẫn mock. Bật
 * MOCK_API=0 toàn cục sẽ vỡ nhiều chỗ khác — backend chưa có POST /parties,
 * chưa có module nhật ký, chưa có tra thửa theo toạ độ.
 */
const GEOCODE_URL = process.env.EXPO_PUBLIC_GEOCODE_URL?.trim().replace(/\/+$/, '');

/** Vài xã/tỉnh thật (tên sau sáp nhập) để mock nhìn hợp lý theo dải toạ độ. */
const MOCK_VUNG: Array<{ minLat: number; province: string; commune: string }> = [
  { minLat: 14.5, province: 'Gia Lai', commune: 'Xã Ia Grai' },
  { minLat: 13.5, province: 'Gia Lai', commune: 'Xã Chư Sê' },
  { minLat: 12.5, province: 'Đắk Lắk', commune: 'Xã Ea Kar' },
  { minLat: 11.5, province: 'Lâm Đồng', commune: 'Xã Di Linh' },
  { minLat: -90, province: 'Đắk Nông', commune: 'Xã Đắk Mil' },
];

async function mockReverse(lat: number, lng: number): Promise<DiaChiGeocode> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  const vung = MOCK_VUNG.find((v) => lat >= v.minLat) ?? MOCK_VUNG[MOCK_VUNG.length - 1]!;
  return {
    province: vung.province,
    commune: vung.commune,
    // Giữ RỖNG đúng như provider `polygon` của BE — polygon không suy ra được
    // số nhà/đường. Mock "đẹp hơn thật" sẽ vỡ UI lúc nối backend.
    detail: '',
    lat,
    lng,
    nguon: 'mock',
  };
}

/**
 * Gọi backend, trả null nếu không tới được — KHÔNG ném.
 *
 * Dùng `fetch` chứ KHÔNG dùng axios `client`: client có interceptor, gặp 401 là
 * xoá session và đá về màn login. Geocode là endpoint public — không được phép
 * làm văng người dùng ra ngoài chỉ vì một lệnh tra địa chỉ.
 *
 * Timeout tự đua bằng Promise.race thay vì AbortSignal.timeout — cái đó chưa
 * chắc có trong Hermes của RN 0.81.
 */
async function goiBackend(path: string, body: unknown): Promise<unknown | null> {
  if (!GEOCODE_URL) return null;
  try {
    const res = await Promise.race([
      fetch(`${GEOCODE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), BE_TIMEOUT_MS)),
    ]);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch {
    // Mất mạng, DNS hỏng, backend tắt — im lặng lùi về mock. Địa chỉ là tiện
    // ích, không đáng để chặn người dùng làm việc.
    return null;
  }
}

/** Toạ độ → tỉnh/xã. `detail` rỗng, user tự bổ sung số nhà. */
export async function reverseGeocode(lat: number, lng: number): Promise<DiaChiGeocode> {
  const that = (await goiBackend('/geocode/reverse', { lat, lng })) as DiaChiGeocode | null;
  if (that?.province) return { ...that, nguon: 'backend' };
  if (MOCK_API) return mockReverse(lat, lng);
  const { data } = await client.post<DiaChiGeocode>('/geocode/reverse', { lat, lng });
  return { ...data, nguon: 'backend' };
}

/** Gợi ý địa chỉ khi gõ (BE trả tối đa 3). Chưa dùng ở bản demo. */
export async function autocompleteDiaChi(input: string): Promise<GoiYDiaChi[]> {
  if (input.trim().length < 2) return [];
  const that = (await goiBackend('/geocode/autocomplete', { input })) as
    | { predictions?: GoiYDiaChi[] }
    | null;
  if (that) return that.predictions ?? [];
  if (MOCK_API) return [];
  const { data } = await client.post<{ predictions: GoiYDiaChi[] }>('/geocode/autocomplete', {
    input,
  });
  return data.predictions ?? [];
}

/** Chi tiết 1 gợi ý → toạ độ + tỉnh/xã. Chưa dùng ở bản demo. */
export async function placeDetail(placeId: string): Promise<DiaChiGeocode> {
  const that = (await goiBackend('/geocode/place', { placeId })) as DiaChiGeocode | null;
  if (that?.province) return { ...that, nguon: 'backend' };
  if (MOCK_API) return mockReverse(13.9803, 108.008);
  const { data } = await client.post<DiaChiGeocode>('/geocode/place', { placeId });
  return { ...data, nguon: 'backend' };
}

/** Ghép chuỗi địa chỉ hiển thị. Bỏ phần rỗng, không để lại dấu phẩy thừa. */
export function ghepDiaChi(d: DiaChiGeocode): string {
  return [d.detail, d.commune, d.province].map((s) => s?.trim()).filter(Boolean).join(', ');
}
