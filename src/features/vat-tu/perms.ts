import type { ReceiptKind } from './types';

/**
 * Quyền cho module kho / vật tư.
 *
 * ĐỌC THẲNG `permissions` backend trả lúc đăng nhập (khớp `core/rbac.js`), KHÔNG
 * tự suy từ role nữa. Bảng role→perm cũ tự chế ra các role KHÔNG TỒN TẠI ở
 * backend (`kho_manager`, `kho_staff`, `tram_staff`, `staff`) nên cấp quyền cho
 * những vai không ai có, đồng thời cấp `kho:view` cho `npp` — thứ backend không
 * cho. Mọi khác biệt kiểu đó là drift âm thầm: UI mở màn rồi API trả 403.
 *
 * Cùng cách làm với `features/den-thua/perms.ts`.
 *
 * Theo `core/rbac.js` (kiểm 2026-08-20), quyền kho hiện chỉ có ở:
 *   - `admin`         → `'*'` (toàn quyền)
 *   - `viewer`        → vattu:view, kho:view
 *   - `seed_producer` → vattu:view, kho:view, kho:nhap, kho:kiem
 * `field_staff` (KTV thực địa) KHÔNG có quyền kho nào — gọi thật `GET /kho` trả
 * 403. Nếu nghiệp vụ muốn KTV bán vật tư thì phải nới ở backend, không phải vá
 * bảng phía client (xem follow-up trong docs/PROGRESS.md).
 */

export type VatTuPerm =
  | 'vattu:view'
  | 'vattu:manage'
  | 'kho:view'
  | 'kho:nhap'
  | 'kho:ban'
  | 'kho:huy'
  | 'kho:kiem';

const ALL_VATTU_PERMS: VatTuPerm[] = [
  'vattu:view',
  'vattu:manage',
  'kho:view',
  'kho:nhap',
  'kho:ban',
  'kho:huy',
  'kho:kiem',
];

/**
 * Lọc `permissions` của phiên thành tập quyền kho. `'*'` (admin) = tất cả.
 */
export function permsForVatTu(permissions: string[] | undefined): Set<VatTuPerm> {
  const s = new Set<VatTuPerm>();
  if (!permissions?.length) return s;
  if (permissions.includes('*')) {
    for (const p of ALL_VATTU_PERMS) s.add(p);
    return s;
  }
  for (const p of ALL_VATTU_PERMS) {
    if (permissions.includes(p)) s.add(p);
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
