import type { RoleId } from './types';

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: 'Quản trị hệ thống',
  sales_staff: 'Nhân viên kinh doanh',
  field_staff: 'Nhân viên thị trường',
  npp: 'Nhà phân phối',
  agent: 'Đại lý',
  htx: 'Hợp tác xã (HTX)',
  viewer: 'Kế toán / Báo cáo',
  seed_producer: 'Nhân viên sản xuất (NaSeeds)',
};

export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  admin: 'Toàn quyền, gồm quản trị người dùng & phân quyền.',
  sales_staff: 'Chỉ lên đơn + xem danh sách đơn hàng.',
  field_staff: 'Khảo sát & hỗ trợ nông hộ, duyệt/gắn cờ kích hoạt.',
  npp: 'Quản đại lý & đơn thuộc NPP mình.',
  agent: 'Xem hồ sơ kích hoạt & vùng trồng của chính mình.',
  htx: 'Xem hồ sơ kích hoạt & vùng trồng của chính HTX.',
  viewer: 'Kiểm công nợ NPP & xác nhận đơn; xem số liệu, xuất báo cáo.',
  seed_producer:
    'NaSeeds: đăng ký sản lượng, sinh lô & in tem QR, gán lô xuất về NPP, theo dõi kích hoạt.',
};

export const ROLE_SCOPE_LABELS: Record<RoleId, string> = {
  admin: 'Toàn hệ thống',
  sales_staff: 'Được phân công',
  field_staff: 'Được phân công',
  npp: 'NPP của mình',
  agent: 'Của mình',
  htx: 'Của mình',
  viewer: 'Chỉ đọc + xác nhận',
  seed_producer: 'Viện của mình',
};

export const ALL_ROLE_IDS: RoleId[] = [
  'admin',
  'sales_staff',
  'field_staff',
  'npp',
  'agent',
  'htx',
  'viewer',
  'seed_producer',
];

export const NURSERIES: Array<{ id: string; ten: string }> = [
  { id: 'an_phu', ten: 'An Phú' },
  { id: 'que_phong', ten: 'Quế Phong' },
];

export function nurseryName(id: string): string {
  return NURSERIES.find((n) => n.id === id)?.ten ?? id;
}

export const PROVIDER_LABELS: Record<'entra' | 'entra_external' | 'local', string> = {
  entra: 'Microsoft',
  entra_external: 'Microsoft (ngoài)',
  local: 'Nội bộ',
};

// Mirror nag_erp_api/src/core/rbac.js DEFAULT_ROLE_PERMISSIONS — dùng cho mock login khi
// backend chưa nối. Real BE trả về permissions runtime nên client không phụ thuộc bảng này.
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, string[]> = {
  admin: ['*'],
  sales_staff: [
    'seed-order:view',
    'seed-order:create',
    'seed-order:update-status',
    'party:view',
    'party:create',
    'party:update',
    'chat:view',
    'chat:send',
    'chat:internal',
    'task:view',
    'task:create',
    'task:assign',
    'task:update',
  ],
  field_staff: [
    'chat:internal',
    'distributor:view',
    'agent:view',
    // KTV tạo được nông hộ tại vườn (rbac.js đổi chính sách 2026-08).
    'party:view',
    'party:create',
    'party:update',
    'activation:view',
    'activation:approve',
    'activation:flag',
    'growing-area:draw',
    'dashboard:view',
    'inbox:view',
    'inbox:send',
    'task:view',
    'task:create',
    'task:update',
  ],
  npp: [
    'agent:view',
    'agent:create',
    'agent:update',
    'party:view',
    'seed-order:view',
    'seed-order:create',
    'activation:view',
    'activation:manage',
    'growing-area:view',
    'config:production',
    'dashboard:view',
    'inbox:view',
    'inbox:send',
  ],
  agent: ['activation:view', 'activation:manage', 'growing-area:view', 'inbox:view', 'inbox:send'],
  htx: ['activation:view', 'activation:manage', 'growing-area:view', 'inbox:view', 'inbox:send'],
  viewer: [
    'chat:internal',
    'distributor:view',
    'agent:view',
    'seed-order:view',
    'seed-order:view-amount',
    'seed-order:confirm',
    'dashboard:view',
    'report:export',
    'staff-kpi:view',
    'vattu:view',
    'kho:view',
  ],
  seed_producer: [
    'chat:internal',
    'seed-order:view',
    'distributor:view',
    'agent:view',
    'qr:generate',
    'qr:print',
    'config:production',
    'dashboard:view',
    'vattu:view',
    'kho:view',
    'kho:nhap',
    'kho:kiem',
  ],
};

export function permissionsForRoles(roles: RoleId[]): string[] {
  if (roles.includes('admin')) return ['*'];
  const set = new Set<string>();
  for (const r of roles) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[r] ?? []) set.add(p);
  }
  return [...set];
}
