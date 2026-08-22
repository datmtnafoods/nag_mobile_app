/**
 * Lọc + tô màu thửa dùng chung cho màn danh sách và màn bản đồ (den-thua.tsx).
 * Tách ra khỏi màn để hai chế độ xem (Danh sách / Bản đồ) lọc y hệt nhau —
 * một nguồn predicate, không lệch kết quả khi toggle.
 */
import type { ThuaDatKemHo, PlotStatus } from './types';
import { ACCENT } from '../../theme/tokens';

/**
 * Lọc thửa theo từ khoá: tên hộ, cây trồng (chính + xen), mã thửa, SĐT hộ.
 * `needle` nên đã `.trim().toLowerCase()`; rỗng → trả nguyên danh sách.
 */
export function locThuaTheoTuKhoa(ds: ThuaDatKemHo[], needle: string): ThuaDatKemHo[] {
  const q = needle.trim().toLowerCase();
  if (!q) return ds;
  return ds.filter(
    (t) =>
      t.tenHo?.toLowerCase().includes(q) ||
      t.cropName?.toLowerCase().includes(q) ||
      t.cropXen?.some((c) => c.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q) ||
      t.dienThoaiHo?.includes(q),
  );
}

/**
 * Màu polygon theo trạng thái duyệt — lấy từ `ACCENT` (nguồn màu chung), khớp
 * ngữ nghĩa chip status của `ThuaDatCard`: duyệt = xanh, chờ = hổ phách, từ chối
 * = xám. `icon` là hex fill; viền dùng chung hex, page tự làm đậm khi chọn.
 */
export const MAU_THEO_STATUS: Record<PlotStatus, { fill: string; line: string }> = {
  approved: { fill: ACCENT['xanh-la'].icon, line: ACCENT['xanh-la'].icon },
  pending: { fill: ACCENT['ho-phach'].icon, line: ACCENT['ho-phach'].icon },
  rejected: { fill: ACCENT.xam.icon, line: ACCENT.xam.icon },
};
