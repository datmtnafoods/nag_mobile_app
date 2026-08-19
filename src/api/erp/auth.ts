import { client, MOCK_API } from '../client';
import type {
  LoginInput,
  LoginResponse,
  MeResponse,
  RegisterInput,
  User,
  RoleId,
} from '../../features/auth/types';
import { permissionsForRoles } from '../../features/auth/roles';

export type { LoginInput, LoginResponse, MeResponse, RegisterInput, User };

type MockUserSeed = {
  password: string;
  user: User;
};

// Mock users mirror shape ERP admin-provisioned. Password đồng nhất 123456 để tester dễ đổi
// role. Register-mock sẽ append vào map này in-memory (không persist qua restart).
const MOCK_USERS: Record<string, MockUserSeed> = {
  'admin@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-01',
      name: 'Quản trị (mock)',
      email: 'admin@nafoods.com',
      roles: ['admin'],
      nurseryIds: [],
      department: 'IT',
      provider: 'local',
    },
  },
  'npp@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-02',
      name: 'Nhà phân phối (mock)',
      email: 'npp@nafoods.com',
      roles: ['npp'],
      nurseryIds: [],
      department: 'Kinh doanh',
      salesTerritory: 'Miền Bắc',
      provider: 'local',
    },
  },
  'sales@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-03',
      name: 'NV Kinh doanh (mock)',
      email: 'sales@nafoods.com',
      roles: ['sales_staff'],
      nurseryIds: [],
      department: 'Kinh doanh',
      salesTerritory: 'Tây Nguyên',
      provider: 'entra',
    },
  },
  'field@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-04',
      name: 'NV Thị trường (mock)',
      email: 'field@nafoods.com',
      roles: ['field_staff'],
      nurseryIds: [],
      department: 'Thị trường',
      salesTerritory: 'Đồng bằng sông Cửu Long',
      provider: 'entra',
    },
  },
  'viewer@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-05',
      name: 'Kế toán (mock)',
      email: 'viewer@nafoods.com',
      roles: ['viewer'],
      nurseryIds: [],
      department: 'Tài chính - Kế toán',
      provider: 'local',
    },
  },
  'seed@nafoods.com': {
    password: '123456',
    user: {
      id: 'U-06',
      name: 'NV Sản xuất (mock)',
      email: 'seed@nafoods.com',
      roles: ['seed_producer'],
      nurseryIds: ['an_phu'],
      department: 'NaSeeds',
      provider: 'entra',
    },
  },
};

export const MOCK_LOGIN_HINTS: Array<{ email: string; label: string }> = [
  { email: 'admin@nafoods.com', label: 'Admin' },
  { email: 'npp@nafoods.com', label: 'NPP' },
  { email: 'sales@nafoods.com', label: 'Sales' },
  { email: 'field@nafoods.com', label: 'Field' },
  { email: 'viewer@nafoods.com', label: 'Kế toán' },
  { email: 'seed@nafoods.com', label: 'NaSeeds' },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function mockLogin(input: LoginInput): Promise<LoginResponse> {
  await new Promise((r) => setTimeout(r, 400));
  const email = normalizeEmail(input.email);
  const entry = MOCK_USERS[email];
  if (!entry || entry.password !== input.password) {
    const error = new Error('Email hoặc mật khẩu không đúng') as Error & {
      code?: string;
      status?: number;
    };
    error.code = 'MOCK_AUTH_FAILED';
    error.status = 401;
    throw error;
  }
  return {
    token: 'mock_token_' + entry.user.id,
    user: entry.user,
    permissions: permissionsForRoles(entry.user.roles),
  };
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const payload: LoginInput = { email: normalizeEmail(input.email), password: input.password };
  if (MOCK_API) return mockLogin(payload);
  const { data } = await client.post<LoginResponse>('/auth/login', payload);
  return data;
}

async function mockRegister(input: RegisterInput): Promise<LoginResponse> {
  await new Promise((r) => setTimeout(r, 500));
  const email = normalizeEmail(input.email);
  if (MOCK_USERS[email]) {
    const error = new Error(`Email ${email} đã có tài khoản.`) as Error & {
      code?: string;
      status?: number;
    };
    error.code = 'MOCK_EMAIL_TAKEN';
    error.status = 409;
    throw error;
  }
  const nextId = `U-${String(Object.keys(MOCK_USERS).length + 1).padStart(2, '0')}`;
  const defaultRoles: RoleId[] = ['npp'];
  const user: User = {
    id: nextId,
    name: input.name.trim(),
    email,
    roles: defaultRoles,
    nurseryIds: [],
    provider: 'local',
  };
  MOCK_USERS[email] = { password: input.password, user };
  return {
    token: 'mock_token_' + user.id,
    user,
    permissions: permissionsForRoles(user.roles),
  };
}

/**
 * Đăng ký tự phục vụ. Backend ERP HIỆN CHƯA CÓ endpoint `/auth/register` — khi flip real
 * API sẽ 404. Client mock cho phép tester thử luồng UI ngay; production cần BE mở endpoint
 * hoặc thay bằng luồng admin-provisioned.
 */
export async function register(input: RegisterInput): Promise<LoginResponse> {
  if (MOCK_API) return mockRegister(input);
  const { data } = await client.post<LoginResponse>('/auth/register', {
    ...input,
    email: normalizeEmail(input.email),
  });
  return data;
}

export async function logout(): Promise<void> {
  if (MOCK_API) return;
  try {
    await client.post('/auth/logout');
  } catch {
    // BE hiện không có /auth/logout — session client-side là source of truth.
  }
}

export async function me(): Promise<MeResponse> {
  if (MOCK_API) {
    // Không hardcode admin — dò user theo token đang lưu trong auth store.
    // Import lazy để tránh vòng phụ thuộc.
    const { useAuthStore } = await import('../../auth/store');
    const state = useAuthStore.getState();
    if (!state.token || !state.user) {
      const err = new Error('Cần đăng nhập (Bearer token).') as Error & {
        code?: string;
        status?: number;
      };
      err.code = 'no_session';
      err.status = 401;
      throw err;
    }
    const entry = Object.values(MOCK_USERS).find((u) => u.user.id === state.user!.id);
    const user = entry?.user ?? state.user;
    return { user, permissions: permissionsForRoles(user.roles) };
  }
  const { data } = await client.get<MeResponse>('/auth/me');
  return data;
}
