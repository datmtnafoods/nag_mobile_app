/**
 * Hiển thị thời gian cho inbox — tương đối, ngắn gọn (khác `formatDateTime` dài
 * "dd/MM/yyyy · HH:mm"). Dùng ở list row + dưới bong bóng + separator ngày.
 * So sánh theo lịch ĐỊA PHƯƠNG của thiết bị.
 */
import { formatDate } from '../vat-tu/format';

const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const THU_DAY = [
  'Chủ nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

function parse(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function gioPhut(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Số ngày lịch giữa hai mốc (b − a), theo nửa đêm địa phương. */
function soNgayLech(a: Date, b: Date): number {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((b0.getTime() - a0.getTime()) / 86_400_000);
}

/** Hai mốc có cùng ngày lịch địa phương không. */
export function cungNgay(a?: string, b?: string): boolean {
  const da = parse(a);
  const db = parse(b);
  if (!da || !db) return false;
  return soNgayLech(da, db) === 0;
}

/**
 * Nhãn ngắn: hôm nay → "8:15"; hôm qua → "Hôm qua"; trong 7 ngày → "T2".."CN";
 * xa hơn → "15/08" (bỏ năm nếu cùng năm) / "15/08/2025".
 */
export function thoiGianTuongDoi(iso?: string): string {
  const d = parse(iso);
  if (!d) return '';
  const now = new Date();
  const lech = soNgayLech(d, now); // >0 = quá khứ
  if (lech === 0) return gioPhut(d);
  if (lech === 1) return 'Hôm qua';
  if (lech > 1 && lech < 7) return THU_NGAN[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  if (d.getFullYear() === now.getFullYear()) return `${day}/${month}`;
  return formatDate(iso);
}

/** Nhãn separator ngày trong màn chat: "Hôm nay" | "Hôm qua" | "Thứ Hai, 19/08" | "19/08/2026". */
export function nhanNgay(iso: string): string {
  const d = parse(iso);
  if (!d) return '';
  const now = new Date();
  const lech = soNgayLech(d, now);
  if (lech === 0) return 'Hôm nay';
  if (lech === 1) return 'Hôm qua';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  if (lech > 1 && lech < 7) return `${THU_DAY[d.getDay()]}, ${day}/${month}`;
  return formatDate(iso);
}
