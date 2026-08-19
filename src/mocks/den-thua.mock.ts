import type { MocDaXacNhan, NhatKyCanhTac, ThuaDat } from '../features/den-thua/types';
import { areaHa, oVuongTuDiem } from '../features/den-thua/geo';

/**
 * Toạ độ neo cho demo — vùng Ia Grai, Gia Lai. Trùng dải mà mock geocode
 * (`src/api/erp/geocode.ts`) trả về "Xã Ia Grai, Gia Lai" nên địa chỉ hiện
 * ra khớp với thửa, không mâu thuẫn khi demo.
 */
export const DEMO_LAT = 13.9803;
export const DEMO_LNG = 108.008;

/** Dịch một khoảng mét từ điểm neo — để rải thửa quanh đó. */
function lech(lat: number, lng: number, dxM: number, dyM: number): [number, number] {
  const dLat = dyM / 111_320;
  const dLng = dxM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

function seedThua(
  id: string,
  partyId: string,
  dxM: number,
  dyM: number,
  dienTichM2: number,
  cropName: string,
  status: ThuaDat['status'],
  taoLuc: string,
  ngayGoc?: string,
): ThuaDat {
  const [lat, lng] = lech(DEMO_LAT, DEMO_LNG, dxM, dyM);
  const boundary = oVuongTuDiem(lat, lng, dienTichM2);
  return {
    id,
    zoneId: null,
    partyId,
    cropName,
    boundary,
    areaHa: areaHa(boundary),
    status,
    note: null,
    createdBy: 'U-04',
    createdAt: taoLuc,
    ngayGoc,
  };
}

/**
 * Thửa seed. Cố ý đặt LỆCH khỏi điểm neo ~120–260 m để lúc demo, người đứng
 * ngay điểm neo sẽ rơi vào nhánh "chưa có thửa" — cho thấy luồng tạo mới trước.
 * Sau khi tạo xong thì dò lại sẽ trúng thửa vừa tạo.
 */
export const MOCK_THUA_DAT: ThuaDat[] = [
  // Chanh leo, kích hoạt 20/6/2025 — đúng mốc gốc trong timeline nghiệp vụ gửi,
  // để demo thấy chuỗi mốc y như bản thiết kế.
  seedThua(
    'GP-260810-01', 'p_001', 150, 90, 3_000, 'Chanh leo tím', 'approved',
    '2026-08-10T02:00:00Z', '2025-06-20T00:00:00Z',
  ),
  // Cà phê: CHƯA có lịch canh tác -> thửa này không hiện timeline, chỉ có nhật ký.
  // Cố ý giữ để demo được nhánh "cây chưa có lịch".
  seedThua('GP-260812-02', 'p_002', -180, -140, 5_000, 'Cà phê', 'approved', '2026-08-12T03:00:00Z'),
  seedThua('GP-260815-03', 'p_003', 60, -230, 1_500, 'Bơ 034', 'pending', '2026-08-15T06:00:00Z'),
];

/**
 * Mốc canh tác KTV đã xác nhận. Backend chưa có chỗ chứa nên giữ riêng ở đây.
 * Seed sẵn vài mốc quá khứ của thửa chanh leo, một mốc lệch lịch để demo thấy
 * chú thích "muộn N ngày".
 */
export const MOCK_MOC_XAC_NHAN: MocDaXacNhan[] = [
  {
    plotId: 'GP-260810-01',
    mocId: 'kich_hoat',
    ngayThucTe: '2025-06-20T00:00:00Z',
    nguoiTao: 'KTV (mock)',
    taoLuc: '2025-06-20T02:00:00Z',
  },
  {
    plotId: 'GP-260810-01',
    mocId: 'lam_bong',
    ngayThucTe: '2025-08-14T00:00:00Z',
    ghiChu: 'Bông ra đều, hộ đã bón thúc.',
    nguoiTao: 'KTV (mock)',
    taoLuc: '2025-08-14T03:00:00Z',
  },
  {
    plotId: 'GP-260810-01',
    mocId: 'thu_hoach_1',
    // Dự kiến 20/10/2025, thực tế 01/11 -> muộn 12 ngày.
    ngayThucTe: '2025-11-01T00:00:00Z',
    ghiChu: 'Mưa kéo dài nên thu muộn.',
    nguoiTao: 'KTV (mock)',
    taoLuc: '2025-11-01T04:00:00Z',
  },
];

export const MOCK_NHAT_KY: NhatKyCanhTac[] = [
  {
    id: 'NK-260816-01',
    plotId: 'GP-260810-01',
    partyId: 'p_001',
    loai: 'tinh_trang_cay',
    moTa: 'Cây phát triển tốt, có vài lá vàng ở tầng dưới. Đã dặn hộ theo dõi thêm.',
    anh: [],
    nguoiTao: 'NV Thị trường (mock)',
    taoLuc: '2026-08-16T01:30:00Z',
  },
];

let _thuaSeq = MOCK_THUA_DAT.length;
export function nextThuaId(shortDate: string): string {
  _thuaSeq += 1;
  return `GP-${shortDate}-${String(_thuaSeq).padStart(2, '0')}`;
}

let _nhatKySeq = MOCK_NHAT_KY.length;
export function nextNhatKyId(shortDate: string): string {
  _nhatKySeq += 1;
  return `NK-${shortDate}-${String(_nhatKySeq).padStart(2, '0')}`;
}
