import { client, MOCK_API } from '../client';
import type { DiaChiGeocode, GoiYDiaChi } from '../../features/location/types';

/**
 * Geocode đi QUA BACKEND, không gọi thẳng Goong từ mobile.
 * Lý do: BE dùng polygon địa giới nội bộ (34 tỉnh / 3.321 xã, SAU sáp nhập 1/7/2025).
 * Goong còn địa giới cũ — repo ERP đã đo: xã sai 12/12. Ngoài ra REST key nằm ở
 * server nên client không lộ key.
 *
 * Các endpoint này PUBLIC (mini-app router không gắn requirePerm) — vẫn dùng chung
 * axios client, Bearer thừa cũng vô hại.
 */

const MOCK_DELAY = 350;

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
  };
}

/** Toạ độ → tỉnh/xã. `detail` rỗng, user tự bổ sung số nhà. */
export async function reverseGeocode(lat: number, lng: number): Promise<DiaChiGeocode> {
  if (MOCK_API) return mockReverse(lat, lng);
  const { data } = await client.post<DiaChiGeocode>('/geocode/reverse', { lat, lng });
  return data;
}

/** Gợi ý địa chỉ khi gõ (BE trả tối đa 3). Chưa dùng ở bản demo. */
export async function autocompleteDiaChi(input: string): Promise<GoiYDiaChi[]> {
  if (input.trim().length < 2) return [];
  if (MOCK_API) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    return [];
  }
  const { data } = await client.post<{ predictions: GoiYDiaChi[] }>('/geocode/autocomplete', {
    input,
  });
  return data.predictions ?? [];
}

/** Chi tiết 1 gợi ý → toạ độ + tỉnh/xã. Chưa dùng ở bản demo. */
export async function placeDetail(placeId: string): Promise<DiaChiGeocode> {
  if (MOCK_API) return mockReverse(13.9803, 108.008);
  const { data } = await client.post<DiaChiGeocode>('/geocode/place', { placeId });
  return data;
}

/** Ghép chuỗi địa chỉ hiển thị. Bỏ phần rỗng, không để lại dấu phẩy thừa. */
export function ghepDiaChi(d: DiaChiGeocode): string {
  return [d.detail, d.commune, d.province].map((s) => s?.trim()).filter(Boolean).join(', ');
}
