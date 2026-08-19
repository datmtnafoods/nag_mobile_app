/**
 * Quyền cho luồng "đến thửa".
 *
 * CỐ Ý không dùng lại `features/vat-tu/perms.ts`: bảng đó map theo bộ role
 * riêng của kho (`kho_staff`, `tram_staff`, `kho_manager`…) không khớp `RoleId`
 * trong `features/auth/types.ts`, và KHÔNG có `field_staff` — đúng vai dùng màn
 * này. Ở đây đọc thẳng `permissions` mà backend trả lúc đăng nhập, khớp
 * `core/rbac.js`.
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
    // ⚠️ `field_staff` theo RBAC mặc định KHÔNG có `party:create` (rbac.js cố ý:
    // "tra và hoàn thiện hồ sơ hộ, KHÔNG tạo mới"). Backend sẽ phải nới quyền
    // khi dựng `POST /parties`. Bản mock bỏ qua để demo được trọn luồng.
    taoHo: co(permissions, PERM_TAO_HO),
  };
}
