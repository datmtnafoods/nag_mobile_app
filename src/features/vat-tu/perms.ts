import type { ReceiptKind } from './types';

export type VatTuPerm =
  | 'vattu:view'
  | 'vattu:manage'
  | 'kho:view'
  | 'kho:nhap'
  | 'kho:ban'
  | 'kho:huy'
  | 'kho:kiem';

const ROLE_PERMS: Record<string, VatTuPerm[]> = {
  admin: ['vattu:view', 'vattu:manage', 'kho:view', 'kho:nhap', 'kho:ban', 'kho:huy', 'kho:kiem'],
  kho_manager: ['vattu:view', 'vattu:manage', 'kho:view', 'kho:nhap', 'kho:ban', 'kho:huy', 'kho:kiem'],
  kho_staff: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:ban', 'kho:kiem'],
  tram_staff: ['vattu:view', 'kho:view', 'kho:ban'],
  seed_producer: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:kiem'],
  viewer: ['vattu:view', 'kho:view'],
  npp: ['vattu:view', 'kho:view'],
  staff: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:ban'],
};

export function permsForVatTu(roles: string[] | undefined): Set<VatTuPerm> {
  const s = new Set<VatTuPerm>();
  if (!roles?.length) return s;
  // Admin wildcard: nếu store trả về permissions ['*'] admin → nhận tất cả bằng cách grant
  // toàn bộ mapping. Roles-based fallback dùng ROLE_PERMS.
  for (const r of roles) {
    if (r === 'admin') {
      for (const p of ROLE_PERMS.admin!) s.add(p);
      continue;
    }
    for (const p of ROLE_PERMS[r] ?? []) s.add(p);
  }
  return s;
}

export function canCreateReceipt(perms: Set<VatTuPerm>, kind: ReceiptKind): boolean {
  if (kind === 'nhap') return perms.has('kho:nhap');
  if (kind === 'ban') return perms.has('kho:ban');
  return perms.has('kho:kiem');
}

export function canCancelReceipt(perms: Set<VatTuPerm>): boolean {
  return perms.has('kho:huy');
}

export function canManageCatalog(perms: Set<VatTuPerm>): boolean {
  return perms.has('vattu:manage');
}

export function canDoInventoryCount(perms: Set<VatTuPerm>): boolean {
  return perms.has('kho:kiem');
}

export function canCreateNcc(perms: Set<VatTuPerm>): boolean {
  return perms.has('vattu:manage');
}
