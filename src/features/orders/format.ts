import type { OrderStatus } from './types';

const NF = new Intl.NumberFormat('vi-VN');

export function formatVND(n: number): string {
  if (!Number.isFinite(n)) return '0 đ';
  return `${NF.format(Math.round(n))} đ`;
}

export function formatQuantity(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return NF.format(Math.round(n));
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(iso)} · ${time}`;
}

type StatusMeta = {
  label: string;
  bg: string; // Tailwind bg-* class
  text: string; // Tailwind text-* class
  icon: string;
};

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  draft: { label: 'Nháp', bg: 'bg-neutral-200', text: 'text-neutral-700', icon: 'document-outline' },
  new: { label: 'Chờ xác nhận', bg: 'bg-amber-100', text: 'text-amber-800', icon: 'time-outline' },
  confirmed: { label: 'Đã xác nhận', bg: 'bg-sky-100', text: 'text-sky-800', icon: 'checkmark-outline' },
  producing: { label: 'Đang sản xuất', bg: 'bg-primary-50', text: 'text-primary-700', icon: 'construct-outline' },
  delivering: { label: 'Đang giao', bg: 'bg-indigo-100', text: 'text-indigo-800', icon: 'car-outline' },
  completed: { label: 'Hoàn tất', bg: 'bg-green-100', text: 'text-green-800', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Đã huỷ', bg: 'bg-red-50', text: 'text-red-700', icon: 'close-circle-outline' },
};
