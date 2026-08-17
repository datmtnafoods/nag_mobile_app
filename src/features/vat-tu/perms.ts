import type { ReceiptKind } from './types';

export type VatTuPerm =
  | 'vattu:view'
  | 'vattu:manage'
  | 'kho:view'
  | 'kho:nhap'
  | 'kho:ban'
  | 'kho:huy';

const ROLE_PERMS: Record<string, VatTuPerm[]> = {
  admin: ['vattu:view', 'vattu:manage', 'kho:view', 'kho:nhap', 'kho:ban', 'kho:huy'],
  kho_manager: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:ban', 'kho:huy'],
  kho_staff: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:ban'],
  tram_staff: ['vattu:view', 'kho:view', 'kho:ban'],
  seed_producer: ['vattu:view', 'kho:view', 'kho:nhap'],
  viewer: ['vattu:view', 'kho:view'],
  npp: ['vattu:view', 'kho:view'],
  staff: ['vattu:view', 'kho:view', 'kho:nhap', 'kho:ban'],
};

export function permsForVatTu(roles: string[] | undefined): Set<VatTuPerm> {
  const s = new Set<VatTuPerm>();
  if (!roles?.length) return s;
  for (const r of roles) {
    for (const p of ROLE_PERMS[r] ?? []) s.add(p);
  }
  return s;
}

export function canCreateReceipt(perms: Set<VatTuPerm>, kind: ReceiptKind): boolean {
  return kind === 'nhap' ? perms.has('kho:nhap') : perms.has('kho:ban');
}

export function canCancelReceipt(perms: Set<VatTuPerm>): boolean {
  return perms.has('kho:huy');
}

export function canManageCatalog(perms: Set<VatTuPerm>): boolean {
  return perms.has('vattu:manage');
}
