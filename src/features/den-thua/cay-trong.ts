/**
 * Danh sách cây gợi ý (Tây Nguyên / vùng NaGreen) cho ô chọn cây — chip điền nhanh.
 *
 * Cục bộ, KHÔNG phụ thuộc mạng — để ô luôn có chip chọn kể cả khi backend chưa có
 * danh mục giống hoặc mất kết nối. `cropName`/`cropXen` vẫn là TEXT tự do, chip chỉ
 * là lối điền nhanh — gõ cây khác vẫn nhận.
 *
 * Hai danh sách TÁCH RIÊNG vì xen canh = trồng ≥2 loại cây khác nhau trên cùng thửa:
 * ô cây chính gợi ý cây trồng chính/lâu năm, ô cây xen gợi ý cây trồng kèm (ngô, đậu,
 * lạc, ớt… — cây họ đậu/ngắn ngày hay trồng xen).
 */

/** Cây trồng chính. Giữ "Chanh leo tím" đầu để `nhanDangCayTrong` khớp → ra lịch canh tác. */
export const CAY_TRONG_GOI_Y: string[] = [
  'Chanh leo tím',
  'Chanh leo vàng',
  'Cà phê',
  'Bơ',
  'Sầu riêng',
  'Ổi',
  'Mắc ca',
  'Chuối',
  'Hồ tiêu',
  'Điều',
];

/** Cây trồng xen (cây kèm) — khác hẳn danh mục cây chính. */
export const CAY_XEN_GOI_Y: string[] = [
  'Ngô',
  'Đậu tương',
  'Đậu xanh',
  'Lạc (đậu phộng)',
  'Ớt',
  'Gừng',
  'Nghệ',
  'Sả',
  'Khoai lang',
  'Rau màu',
];

/** Chuẩn hoá tên cây để so trùng — trim + lowercase. */
export const chuanHoaCay = (s: string) => s.trim().toLowerCase();

/**
 * Thêm 1 tên cây vào danh sách cây xen: trim, dedupe theo `chuanHoaCay`, chặn thêm
 * nếu trùng cây chính (trả list cũ khi trùng/rỗng). Dùng chung cho form tạo/sửa.
 */
export function themCayXen(
  list: string[],
  ten: string,
  cayChinh?: string,
): string[] {
  const t = ten.trim();
  if (!t) return list;
  const key = chuanHoaCay(t);
  if (cayChinh && chuanHoaCay(cayChinh) === key) return list;
  if (list.some((x) => chuanHoaCay(x) === key)) return list;
  return [...list, t];
}
