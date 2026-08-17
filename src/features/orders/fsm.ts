import type { OrderStatus } from './types';

type Perm = 'orders.create' | 'orders.confirm' | 'orders.ship' | 'orders.complete' | 'orders.cancel';

type Transition = {
  to: OrderStatus;
  label: string;
  perm: Perm;
  destructive?: boolean;
  requiresReason?: boolean;
};

const FLOW: Record<OrderStatus, Transition[]> = {
  draft: [
    { to: 'new', label: 'Gửi đơn', perm: 'orders.create' },
    { to: 'cancelled', label: 'Huỷ nháp', perm: 'orders.cancel', destructive: true, requiresReason: true },
  ],
  new: [
    { to: 'confirmed', label: 'Xác nhận', perm: 'orders.confirm' },
    { to: 'cancelled', label: 'Huỷ đơn', perm: 'orders.cancel', destructive: true, requiresReason: true },
  ],
  confirmed: [
    { to: 'producing', label: 'Bắt đầu sản xuất', perm: 'orders.ship' },
    { to: 'cancelled', label: 'Huỷ đơn', perm: 'orders.cancel', destructive: true, requiresReason: true },
  ],
  producing: [{ to: 'delivering', label: 'Xuất giao', perm: 'orders.ship' }],
  delivering: [{ to: 'completed', label: 'Hoàn tất', perm: 'orders.complete' }],
  completed: [],
  cancelled: [],
};

const ROLE_PERMS: Record<string, Perm[]> = {
  admin: ['orders.create', 'orders.confirm', 'orders.ship', 'orders.complete', 'orders.cancel'],
  staff: ['orders.create', 'orders.confirm', 'orders.cancel'],
  npp: ['orders.create', 'orders.cancel'],
  seed_producer: ['orders.ship'],
  viewer: [],
};

export function permsForRoles(roles: string[]): Set<Perm> {
  const s = new Set<Perm>();
  for (const r of roles) {
    for (const p of ROLE_PERMS[r] ?? []) s.add(p);
  }
  return s;
}

export function allowedTransitions(status: OrderStatus, roles: string[]): Transition[] {
  const perms = permsForRoles(roles);
  return (FLOW[status] ?? []).filter((t) => perms.has(t.perm));
}

export const STATUS_ORDER: OrderStatus[] = [
  'draft',
  'new',
  'confirmed',
  'producing',
  'delivering',
  'completed',
];

export function statusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  return STATUS_ORDER.indexOf(status);
}
