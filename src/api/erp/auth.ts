import { client, MOCK_API } from '../client';

export type LoginInput = {
  username: string;
  password: string;
};

export type User = {
  id: string;
  username: string;
  fullName?: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: '123456',
    user: {
      id: 'u_mock_admin',
      username: 'admin',
      fullName: 'Admin (mock)',
      roles: ['admin', 'staff'],
    },
  },
  npp: {
    password: '123456',
    user: {
      id: 'u_mock_npp',
      username: 'npp',
      fullName: 'Nhà phân phối (mock)',
      roles: ['npp'],
    },
  },
};

async function mockLogin(input: LoginInput): Promise<LoginResponse> {
  await new Promise((r) => setTimeout(r, 400));
  const entry = MOCK_USERS[input.username];
  if (!entry || entry.password !== input.password) {
    const error = new Error('Sai tên đăng nhập hoặc mật khẩu');
    (error as Error & { code?: string }).code = 'MOCK_AUTH_FAILED';
    throw error;
  }
  return {
    accessToken: 'mock_token_' + entry.user.id,
    user: entry.user,
  };
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  if (MOCK_API) return mockLogin(input);
  const { data } = await client.post<LoginResponse>('/auth/login', input);
  return data;
}

export async function logout(): Promise<void> {
  if (MOCK_API) return;
  try {
    await client.post('/auth/logout');
  } catch {
    // ignore server errors on logout — client state is source of truth
  }
}

export async function me(): Promise<User> {
  if (MOCK_API) {
    return MOCK_USERS.admin.user;
  }
  const { data } = await client.get<User>('/auth/me');
  return data;
}
