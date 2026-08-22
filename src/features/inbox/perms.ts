/**
 * Quyền inbox — đọc thẳng `permissions` backend trả lúc login (khuôn 5).
 * Các role trong `features/auth/roles.ts` (admin/sales_staff/field_staff/agent/htx)
 * đã có sẵn `inbox:view` + `inbox:send`. `'*'` = admin.
 */

export interface InboxPerms {
  canView: boolean;
  canSend: boolean;
}

export function permsForInbox(permissions: string[]): InboxPerms {
  const has = (p: string) => permissions.includes('*') || permissions.includes(p);
  return {
    canView: has('inbox:view'),
    canSend: has('inbox:send'),
  };
}
