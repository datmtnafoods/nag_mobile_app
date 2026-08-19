/**
 * Hình học đa giác — port từ `nag_erp_api/src/core/geo.js` để client dò được thửa
 * mà không cần round-trip. GIỮ NGUYÊN quy ước của backend:
 *   - Ring là MỘT vòng duy nhất, `[[lng, lat], …]` (thứ tự GeoJSON, KHÔNG phải [lat,lng])
 *   - Vòng kín nhưng KHÔNG lặp điểm cuối
 *   - Không hỗ trợ lỗ (hole), không MultiPolygon
 * Lệch quy ước ở đây là dò sai thửa mà không báo lỗi — nên đừng "sửa cho thuận tay".
 */

export type Ring = Array<[number, number]>;

const R_EARTH_M = 6371008.8;
/** 1 độ vĩ ≈ 111.320 m ở mọi vĩ độ. */
const M_PER_DEG_LAT = 111_320;

/** Khung lãnh thổ VN — trùng ngưỡng backend dùng để bắt lỗi đảo lat/lng. */
const VN_LNG_MIN = 100;
const VN_LNG_MAX = 112;
const VN_LAT_MIN = 7;
const VN_LAT_MAX = 24;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Điểm có nằm trong đa giác không — ray casting.
 * @param point `[lng, lat]` — ĐÚNG thứ tự này, đảo là lặng lẽ trả false.
 */
export function pointInRing(point: [number, number], ring: Ring): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Diện tích (ha) — chiếu equirectangular quanh vĩ độ trung bình rồi shoelace.
 * Cùng công thức backend dùng, để số hiển thị trên máy khớp số backend lưu.
 */
export function areaHa(ring: Ring): number {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const lat0 = rad(ring.reduce((s, p) => s + p[1], 0) / ring.length);
  const pts = ring.map(([lng, lat]) => [
    R_EARTH_M * rad(lng) * Math.cos(lat0),
    R_EARTH_M * rad(lat),
  ]);
  let acc = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    acc += pts[j]![0] * pts[i]![1] - pts[i]![0] * pts[j]![1];
  }
  return Math.round((Math.abs(acc) / 2 / 10_000) * 100) / 100;
}

/** Tâm đa giác (trung bình đỉnh) — `[lng, lat]`. */
export function centroid(ring: Ring): [number, number] | null {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lng, lat];
}

/** Trả chuỗi lỗi tiếng Việt, hoặc null nếu ring hợp lệ. Mirror backend `validateRing`. */
export function validateRing(ring: Ring): string | null {
  if (!Array.isArray(ring) || ring.length < 3) return 'Ranh thửa phải có ít nhất 3 đỉnh.';
  if (ring.length > 500) return 'Ranh thửa quá 500 đỉnh.';
  for (const p of ring) {
    if (!Array.isArray(p) || p.length !== 2) return 'Đỉnh phải có dạng [kinh độ, vĩ độ].';
    const [lng, lat] = p;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return 'Toạ độ đỉnh không hợp lệ.';
    if (lng < VN_LNG_MIN || lng > VN_LNG_MAX) {
      return `Kinh độ ${lng} ngoài lãnh thổ VN (có thể bị đảo lat/lng).`;
    }
    if (lat < VN_LAT_MIN || lat > VN_LAT_MAX) {
      return `Vĩ độ ${lat} ngoài lãnh thổ VN (có thể bị đảo lat/lng).`;
    }
  }
  return null;
}

/**
 * Sinh ô vuông quanh một điểm ghim, theo diện tích khai báo.
 *
 * Đây là RANH ƯỚC LƯỢNG, không phải ranh đo đạc — NV chỉ đứng giữa vườn bấm ghim
 * rồi khai "khoảng 3 sào". Đủ để đánh dấu "có thửa ở đây" và để dò lần sau trúng;
 * văn phòng chỉnh lại chính xác trên web. Luôn nói rõ điều này ở UI.
 *
 * @param dienTichM2 diện tích mét vuông
 * @returns ring `[[lng,lat], …]` 4 đỉnh, ngược chiều kim đồng hồ
 */
export function oVuongTuDiem(lat: number, lng: number, dienTichM2: number): Ring {
  const canh = Math.sqrt(Math.max(1, dienTichM2));
  const nua = canh / 2;
  const dLat = nua / M_PER_DEG_LAT;
  // Kinh tuyến co lại theo cos(vĩ độ) — bỏ qua là ô méo dần về phía cực.
  const dLng = nua / (M_PER_DEG_LAT * Math.cos(rad(lat)) || M_PER_DEG_LAT);
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ];
}

/** Cạnh ô vuông (m) ứng với diện tích — để hiện preview "~55 × 55 m". */
export function canhOVuong(dienTichM2: number): number {
  return Math.round(Math.sqrt(Math.max(0, dienTichM2)));
}

// ── Đơn vị diện tích ────────────────────────────────────────────────────────
// "Sào" mỗi vùng một khác (Bắc Bộ 360 m², Trung Bộ 500 m², Nam Bộ/Tây Nguyên
// 1.000 m²). Nafoods làm Tây Nguyên nên lấy 1.000, nhưng nhãn UI phải ghi rõ
// số m² để không ai hiểu nhầm.

export type DonViDienTich = 'sao' | 'ha' | 'm2';

export const DON_VI_DIEN_TICH: Array<{ id: DonViDienTich; nhan: string; m2: number }> = [
  { id: 'sao', nhan: 'sào (1.000 m²)', m2: 1_000 },
  { id: 'ha', nhan: 'ha (10.000 m²)', m2: 10_000 },
  { id: 'm2', nhan: 'm²', m2: 1 },
];

export function doiRaM2(soLuong: number, donVi: DonViDienTich): number {
  const found = DON_VI_DIEN_TICH.find((d) => d.id === donVi);
  return (Number.isFinite(soLuong) ? soLuong : 0) * (found?.m2 ?? 1);
}

/**
 * Khoảng cách hai điểm (m) — haversine. Dùng để xếp thửa gần nhất khi GPS rơi
 * ngoài mọi ranh, hoặc khi trúng nhiều thửa chồng nhau.
 */
export function khoangCachM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(s))));
}
