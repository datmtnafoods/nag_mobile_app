/**
 * Quyền cho luồng "đến thửa".
 *
 * Đọc thẳng `permissions` backend trả lúc đăng nhập, khớp `core/rbac.js`.
 * `features/vat-tu/perms.ts` nay cũng làm y hệt (trước đó nó tự map từ role với
 * bộ role không tồn tại ở backend — đã bỏ 2026-08-20).
 */

export const PERM_XEM_THUA = 'activation:view';
export const PERM_VE_THUA = 'growing-area:draw';
export const PERM_TAO_HO = 'party:create';

export type DenThuaPerms = {
  xemThua: boolean;
  veThua: boolean;
  taoHo: boolean;
};

function co(permissions: string[] | undefined, perm: string): boolean {
  if (!permissions?.length) return false;
  return permissions.includes('*') || permissions.includes(perm);
}

export function permsDenThua(permissions: string[] | undefined): DenThuaPerms {
  return {
    xemThua: co(permissions, PERM_XEM_THUA),
    veThua: co(permissions, PERM_VE_THUA),
    // `field_staff` ĐÃ có `party:create` (rbac.js đổi chính sách 2026-08: KTV tạo
    // được hộ ngay tại vườn) và `POST /parties` đã dựng — chạy được real mode.
    taoHo: co(permissions, PERM_TAO_HO),
  };
}
