export type RoleId =
  | 'admin'
  | 'sales_staff'
  | 'field_staff'
  | 'npp'
  | 'agent'
  | 'htx'
  | 'viewer'
  | 'seed_producer';

export type AuthProvider = 'entra' | 'entra_external' | 'local';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: RoleId[];
  nurseryIds: string[];
  department?: string;
  salesTerritory?: string;
  group?: string;
  provider?: AuthProvider;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  permissions: string[];
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface MeResponse {
  user: User;
  permissions: string[];
}
