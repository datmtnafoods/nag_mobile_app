import type { PhieuBan, PhuongThucTT, TrangThaiThanhToan } from './types';

/**
 * Trạng thái thanh toán DERIVE từ đã-thu so với tổng phải thu (đã trừ hàng trả).
 * Không lưu trạng thái vào phiếu — tránh lệch khi thu thêm / trả hàng.
 */
export function deriveTrangThaiTT(daThu: number, tongTienHieuLuc: number): TrangThaiThanhToan {
  if (tongTienHieuLuc <= 0) return 'da_tt';
  if (daThu >= tongTienHieuLuc) return 'da_tt';
  if (daThu > 0) return 'mot_phan';
  return 'ghi_no';
}

/** Tổng phải thu sau khi trừ giá trị hàng khách đã trả lại. */
export function tongTienHieuLuc(phieu: Pick<PhieuBan, 'tongTien' | 'daTra'>): number {
  return Math.max(0, phieu.tongTien - (phieu.daTra ?? 0));
}

/** Còn nợ = phải thu − đã thu (không âm). */
export function conNo(phieu: Pick<PhieuBan, 'tongTien' | 'daTra' | 'daThu'>): number {
  return Math.max(0, tongTienHieuLuc(phieu) - (phieu.daThu ?? 0));
}

export const TT_META: Record<
  TrangThaiThanhToan,
  { label: string; bg: string; text: string; dot: string }
> = {
  da_tt: { label: 'Đã thanh toán', bg: 'bg-green-100', text: 'text-green-800', dot: '#16a34a' },
  mot_phan: { label: 'Thanh toán một phần', bg: 'bg-amber-100', text: 'text-amber-800', dot: '#d97706' },
  ghi_no: { label: 'Ghi nợ', bg: 'bg-red-50', text: 'text-red-700', dot: '#dc2626' },
};

export const PHUONG_THUC_LABEL: Record<PhuongThucTT, string> = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản',
};
