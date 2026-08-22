import type { Accent } from '../../theme/tokens';
import type { LoaiMoc, MocLich, MocCanhTac } from './types';

/**
 * Giai đoạn cây (LoaiMoc) — màu + helper hiển thị dùng chung.
 *
 * Trước đây map màu này chôn cục bộ trong `app/thua/lich-cay/[cayId].tsx`; nay
 * badge giai đoạn ở màn chi tiết thửa + sheet chọn mẫu cũng cần → gom về đây cho
 * MỘT nguồn (khớp bảng `ACCENT` của theme, không hardcode hex per-màn).
 */
export const ACCENT_LOAI: Record<LoaiMoc, Accent> = {
  kich_hoat: 'do',
  kien_thiet: 'xanh-la',
  lam_bong: 'tim',
  di_canh: 'xanh-duong',
  thu_hoach: 'ho-phach',
};

/**
 * Giai đoạn hiện tại của thửa để hiện badge. `idx` = `chiSoMocHienTai(mocs)`:
 *  - `idx >= 0`: đang ở mốc `mocs[idx]`.
 *  - `idx === -1`: chưa tới mốc nào → "sắp tới" mốc đầu (`sapToi`).
 * Trả `null` khi chưa có mốc nào (không có lịch / chưa có ngày gốc).
 */
export function giaiDoanHienTai(
  mocs: MocCanhTac[],
  idx: number,
): { moc: MocCanhTac; sapToi: boolean } | null {
  if (!mocs.length) return null;
  if (idx >= 0 && idx < mocs.length) return { moc: mocs[idx], sapToi: false };
  return { moc: mocs[0], sapToi: true };
}

/**
 * Mẫu "bắt đầu tối thiểu" — CHỈ 1 mốc Kích hoạt, KHÔNG bịa mốc (giữ nguyên tắc
 * repo: không tự đẻ giai đoạn nghiệp vụ). Khớp cách màn editor khởi tạo lịch mới;
 * KTV tự khai các mốc còn lại. Dùng khi chưa có lịch nào để sao chép.
 */
export const MOC_TOI_THIEU: MocLich[] = [{ loai: 'kich_hoat', nhan: 'Kích hoạt', thang: 0 }];
