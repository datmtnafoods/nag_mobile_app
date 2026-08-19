import type { ChungTuLoai, MaKieu, MaNguon, PhieuTrangThai, ReceiptKind } from './types';

const NF = new Intl.NumberFormat('vi-VN');

export function formatQty(n: number, donVi?: string): string {
  const rounded = Math.round(n * 1000) / 1000;
  return `${NF.format(rounded)}${donVi ? ` ${donVi}` : ''}`;
}

export function formatVND(n: number): string {
  if (!Number.isFinite(n)) return '0 đ';
  return `${NF.format(Math.round(n))} đ`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(iso)} · ${time}`;
}

type StatusMeta = { label: string; bg: string; text: string; icon: string };
type KindMeta = {
  label: string;
  cta: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
};

export const RECEIPT_STATUS_META: Record<PhieuTrangThai, StatusMeta> = {
  ke_hoach: {
    label: 'Phiếu tạm',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    icon: 'time-outline',
  },
  ghi: {
    label: 'Đã ghi',
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: 'checkmark-outline',
  },
  huy: {
    label: 'Đã huỷ',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'close-circle-outline',
  },
};

/** Label riêng cho nhập kho (Đã ghi → "Đã nhập hàng"). */
export function statusLabelForKind(status: PhieuTrangThai, kind: ReceiptKind): string {
  if (status === 'ghi') {
    if (kind === 'nhap') return 'Đã nhập hàng';
    if (kind === 'kiem_ke') return 'Đã cân bằng';
    return 'Đã ghi';
  }
  return RECEIPT_STATUS_META[status].label;
}

export const RECEIPT_KIND_META: Record<ReceiptKind, KindMeta> = {
  nhap: {
    label: 'Nhập kho',
    cta: 'Tạo phiếu nhập',
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-500',
    icon: 'download-outline',
  },
  ban: {
    label: 'Bán / Xuất',
    cta: 'Tạo phiếu bán',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-500',
    icon: 'arrow-up-circle-outline',
  },
  kiem_ke: {
    label: 'Kiểm kho',
    cta: 'Tạo phiếu kiểm',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-500',
    icon: 'clipboard-outline',
  },
};

export const MA_KIEU_LABELS: Record<MaKieu, string> = {
  qr: 'QR',
  barcode: 'Barcode',
  datamatrix: 'Datamatrix',
  khac: 'Khác',
};

export const MA_NGUON_LABELS: Record<MaNguon, string> = {
  nha_sx: 'Nhà SX',
  tu_gan: 'Tự gán',
  he_thong: 'Hệ thống',
};

export const CHUNG_TU_LOAI_LABELS: Record<ChungTuLoai, string> = {
  nhap: 'Nhập kho',
  ban: 'Bán',
  kiem_ke: 'Kiểm kê',
  dieu_chuyen: 'Điều chuyển',
  nhap_tram: 'Nhập trạm',
  thu_mua: 'Thu mua',
  xuat_huy: 'Xuất huỷ',
  xuat_noi_bo: 'Xuất nội bộ',
  tra_ncc: 'Trả NCC',
  khach_tra: 'Khách trả',
};

export function formatMaKieuLabel(kieu: MaKieu): string {
  return MA_KIEU_LABELS[kieu] ?? kieu;
}

export function formatMaNguonLabel(nguon: MaNguon): string {
  return MA_NGUON_LABELS[nguon] ?? nguon;
}
