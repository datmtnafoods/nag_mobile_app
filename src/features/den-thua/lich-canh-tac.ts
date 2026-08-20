import type { LichCayTrong, LoaiMoc, LoaiNhatKy, MocCanhTac } from './types';

/**
 * Lịch chuẩn vòng đời cây trồng.
 *
 * BACKEND CHƯA CÓ GÌ cho phần này — không bảng, không endpoint, không cả cột
 * `planted_at` trên `growing_plot`. Bảng lịch ở đây là hardcode để demo; đợt nối
 * backend thì đổi thành tải về từ cấu hình admin.
 *
 * Lịch chanh leo đọc ngược từ timeline nghiệp vụ cung cấp:
 *   Kích hoạt T+0 · Kiến thiết T+0 · Làm bông T+2 · Thu lứa 1 T+4
 *   Đi cành T+6 · Thu lứa 2 T+7 · Đi cành T+9 · Thu lứa 3 T+10 · …
 * Quy luật: sau lứa 1, cứ +2 tháng đi cành/làm bông rồi +1 tháng nữa thu lứa
 * tiếp — chu kỳ 3 tháng lặp lại. Riêng lứa đầu dài hơn: +2 làm bông, +2 nữa thu.
 */

export const LICH_CANH_TAC: Record<string, LichCayTrong> = {
  chanh_leo: {
    id: 'chanh_leo',
    nhan: 'Chanh leo',
    /** Nhận diện từ `cropName` tự do — so khớp sau khi bỏ dấu, viết thường. */
    tuKhoa: ['chanh leo', 'chanh day', 'passion'],
    mocDau: [
      { loai: 'kich_hoat', nhan: 'Kích hoạt', thang: 0 },
      { loai: 'kien_thiet', nhan: 'Kiến thiết', thang: 0 },
      { loai: 'lam_bong', nhan: 'Làm bông', thang: 2 },
      { loai: 'thu_hoach', nhan: 'Thu hoạch lứa 1', thang: 4, lua: 1 },
    ],
    chuKy: { thangDiCanh: 2, thangThuHoach: 3 },
    soLuaToiDa: 8,
    // Giai đoạn nào thì loại việc nào hay làm — để form đẩy chip gợi ý lên trước.
    goiYTheoGiaiDoan: {
      kich_hoat: ['canh_tac'],
      kien_thiet: ['canh_tac', 'bon_phan'],
      lam_bong: ['bon_phan', 'phun_thuoc', 'canh_tac'],
      di_canh: ['canh_tac', 'bon_phan'],
      thu_hoach: ['thu_hoach', 'phun_thuoc'],
    },
  },
  // Cà phê / bơ / ổi: KHUNG ĐÃ SẴN, chưa có lịch thật.
  // Cố ý để trống thay vì bịa — thửa cây chưa có lịch sẽ không hiện timeline,
  // chỉ có nhật ký thường. Nghiệp vụ cung cấp mốc thì thêm vào đây là chạy.
};

/** Bỏ dấu tiếng Việt để so khớp `cropName` tự do. */
function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * `cropName` là TEXT tự do ở backend ("Chanh leo tím", "chanh dây vàng"…) nên
 * phải so khớp mềm. Không nhận ra → trả null → không hiện timeline.
 */
export function nhanDangCayTrong(cropName?: string | null): LichCayTrong | null {
  if (!cropName?.trim()) return null;
  const ten = boDau(cropName);
  for (const lich of Object.values(LICH_CANH_TAC)) {
    if (lich.tuKhoa.some((k) => ten.includes(boDau(k)))) return lich;
  }
  return null;
}

/**
 * Loại nhật ký nên gợi ý cho giai đoạn (`LoaiMoc`) hiện tại của thửa. Cây chưa có
 * hồ sơ hoặc giai đoạn không khai → trả `[]` (form hiện mọi loại ngang nhau).
 */
export function goiYLoaiTheoGiaiDoan(
  lich: LichCayTrong | null,
  giaiDoan?: LoaiMoc,
): LoaiNhatKy[] {
  if (!lich?.goiYTheoGiaiDoan || !giaiDoan) return [];
  return lich.goiYTheoGiaiDoan[giaiDoan] ?? [];
}

function themThang(goc: Date, thang: number): Date {
  const d = new Date(goc);
  d.setMonth(d.getMonth() + thang);
  return d;
}

/**
 * Sinh danh sách mốc từ ngày gốc theo lịch chuẩn.
 *
 * Sinh tới `soLuaToiDa` lứa — không cắt theo "hôm nay" vì KTV cần nhìn thấy cả
 * mốc sắp tới để biết lần sau quay lại làm gì.
 */
export function tinhMocCanhTac(ngayGocIso: string, lich: LichCayTrong): MocCanhTac[] {
  const goc = new Date(ngayGocIso);
  if (Number.isNaN(goc.getTime())) return [];

  const ra: MocCanhTac[] = lich.mocDau.map((m) => ({
    id: m.lua ? `${m.loai}_${m.lua}` : m.loai,
    loai: m.loai,
    nhan: m.nhan,
    lua: m.lua,
    thang: m.thang,
    ngayDuKien: themThang(goc, m.thang).toISOString(),
  }));

  // Mốc thu hoạch cuối trong `mocDau` là điểm neo cho chu kỳ lặp.
  const neo = [...lich.mocDau].reverse().find((m) => m.loai === 'thu_hoach');
  if (!neo) return ra;

  for (let n = 1; n <= lich.soLuaToiDa - (neo.lua ?? 1); n += 1) {
    const thangDiCanh = neo.thang + (n - 1) * lich.chuKy.thangThuHoach + lich.chuKy.thangDiCanh;
    const thangThu = neo.thang + n * lich.chuKy.thangThuHoach;
    const lua = (neo.lua ?? 1) + n;
    ra.push({
      id: `di_canh_${lua}`,
      loai: 'di_canh',
      nhan: 'Đi cành, làm bông',
      thang: thangDiCanh,
      ngayDuKien: themThang(goc, thangDiCanh).toISOString(),
    });
    ra.push({
      id: `thu_hoach_${lua}`,
      loai: 'thu_hoach',
      nhan: `Thu hoạch lứa ${lua}`,
      lua,
      thang: thangThu,
      ngayDuKien: themThang(goc, thangThu).toISOString(),
    });
  }

  return ra.sort((a, b) => a.thang - b.thang);
}

/**
 * Mốc "hiện tại" = mốc gần nhất đã tới hạn. Chưa tới mốc nào (thửa mới trồng)
 * thì lấy mốc đầu.
 */
export function chiSoMocHienTai(mocs: MocCanhTac[], bayGio = new Date()): number {
  let idx = 0;
  for (let i = 0; i < mocs.length; i += 1) {
    if (new Date(mocs[i]!.ngayDuKien) <= bayGio) idx = i;
    else break;
  }
  return idx;
}

const NHAN_LOAI: Record<LoaiMoc, string> = {
  kich_hoat: 'Kích hoạt',
  kien_thiet: 'Kiến thiết',
  lam_bong: 'Làm bông',
  di_canh: 'Đi cành, làm bông',
  thu_hoach: 'Thu hoạch',
};

export function nhanLoaiMoc(loai: LoaiMoc): string {
  return NHAN_LOAI[loai] ?? loai;
}

/** Số ngày lệch giữa thực tế và dự kiến. Dương = muộn. */
export function lechNgay(ngayDuKien: string, ngayThucTe?: string): number | null {
  if (!ngayThucTe) return null;
  const a = new Date(ngayDuKien).getTime();
  const b = new Date(ngayThucTe).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}
