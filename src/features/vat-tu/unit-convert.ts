import type { VatTu, DraftLine } from './types';

/**
 * Đổi số lượng về đơn vị cơ bản.
 * Nếu user chọn đơn vị "lớn" và SKU có heSoQuyDoi → nhân lên.
 * Ngược lại giữ nguyên.
 */
export function convertToBase(
  qty: number,
  unit: 'co_ban' | 'lon',
  sku: Pick<VatTu, 'heSoQuyDoi'> | Pick<DraftLine, 'heSoQuyDoi'>,
): number {
  if (!Number.isFinite(qty)) return 0;
  if (unit === 'lon' && sku.heSoQuyDoi && sku.heSoQuyDoi > 0) {
    return qty * sku.heSoQuyDoi;
  }
  return qty;
}

/**
 * Format hiển thị số lượng với caption quy đổi.
 * "10 bao (= 500 kg)" khi user nhập donVi='lon' và có heSoQuyDoi.
 * "500 kg" khi donVi='co_ban' hoặc không có heSoQuyDoi.
 */
export function formatQtyWithUnit(
  qty: number,
  unit: 'co_ban' | 'lon',
  sku: Pick<VatTu, 'donViCoBan' | 'donViLon' | 'heSoQuyDoi'>,
): { primary: string; caption?: string } {
  const primary = `${formatNumber(qty)} ${unit === 'lon' ? sku.donViLon ?? sku.donViCoBan : sku.donViCoBan}`;
  if (unit === 'lon' && sku.heSoQuyDoi && sku.heSoQuyDoi > 0) {
    const base = qty * sku.heSoQuyDoi;
    return { primary, caption: `= ${formatNumber(base)} ${sku.donViCoBan}` };
  }
  return { primary };
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(
    Math.round(n * 1000) / 1000,
  );
}
