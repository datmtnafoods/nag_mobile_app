import type { LichCayTrong, LoaiMoc, LoaiNhatKy, MocCanhTac } from './types';

/**
 * Logic lịch canh tác thuần — KHÔNG chứa dữ liệu.
 *
 * DỮ LIỆU lịch nay ở mock store `MOCK_LICH_CAY` (`src/mocks/den-thua.mock.ts`),
 * gọi qua tầng `src/api/erp/lich-cay.ts` (real chưa có endpoint — throw). Trước
 * đây tự chứa hằng `LICH_CANH_TAC` chỉ có chanh leo, sửa được lịch buộc phải
 * đổi code — nay KTV tự khai lịch cho từng loại cây qua màn
 * `app/thua/lich-cay/[cayId].tsx`, áp cho MỌI thửa trồng cây đó.
 *
 * Backend gap giữ nguyên: chưa có bảng `crop_catalog`/`crop_stage`, chưa có cột
 * `planted_at` trên `growing_plot`. Khi nag_erp §9.6 dựng xong thì đổi tầng API.
 */

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
 *
 * Nhận `dsLich` làm tham số (không đọc hằng nội bộ) để hook `useMocThua` có thể
 * bơm dữ liệu từ query vào.
 */
export function nhanDangCayTrong(
  cropName: string | null | undefined,
  dsLich: LichCayTrong[],
): LichCayTrong | null {
  if (!cropName?.trim()) return null;
  const ten = boDau(cropName);
  for (const lich of dsLich) {
    if (lich.tuKhoa.some((k) => k.trim() && ten.includes(boDau(k)))) return lich;
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
 * Sinh tới `soLuaToiDa` lứa (nếu có `chuKy`) — không cắt theo "hôm nay" vì KTV
 * cần nhìn thấy cả mốc sắp tới để biết lần sau quay lại làm gì. Cây thu 1 lứa
 * (không `chuKy`) thì chỉ trả `mocDau`.
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

  // Không có chu kỳ lặp → chỉ mốc đầu.
  if (!lich.chuKy) return ra.sort((a, b) => a.thang - b.thang);

  // Mốc thu hoạch cuối trong `mocDau` là điểm neo cho chu kỳ lặp.
  const neo = [...lich.mocDau].reverse().find((m) => m.loai === 'thu_hoach');
  if (!neo) return ra.sort((a, b) => a.thang - b.thang);

  const soLua = Math.max(1, lich.soLuaToiDa ?? 1);
  for (let n = 1; n <= soLua - (neo.lua ?? 1); n += 1) {
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
 * Mốc "hiện tại" = mốc gần nhất đã tới hạn.
 *
 * Trả **-1** khi CHƯA tới mốc nào (thửa mới trồng, `ngayGoc` còn ở tương lai).
 * Trước đây trả `0` — nghĩa là mốc đầu luôn hiển thị như "đã qua" kể cả khi lịch
 * chưa bắt đầu, làm form nhật ký gợi ý sai giai đoạn. UI dùng giá trị này phải
 * check `>= 0` trước khi so sánh với index (xem `TimelineCanhTac.tsx`,
 * `app/thua/nhat-ky.tsx`).
 */
export function chiSoMocHienTai(mocs: MocCanhTac[], bayGio = new Date()): number {
  let idx = -1;
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

/** Slug an toàn cho `LichCayTrong.id` khi KTV tạo lịch cho cây chưa có. */
export function slugCay(ten: string): string {
  return (
    boDau(ten)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'cay'
  );
}
