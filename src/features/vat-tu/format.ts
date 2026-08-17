import type { ReceiptKind, ReceiptStatus } from './types';

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

export const RECEIPT_STATUS_META: Record<ReceiptStatus, StatusMeta> = {
  ghi: { label: 'Đã ghi', bg: 'bg-green-100', text: 'text-green-800', icon: 'checkmark-outline' },
  huy: { label: 'Đã huỷ', bg: 'bg-red-50', text: 'text-red-700', icon: 'close-circle-outline' },
};

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
};
