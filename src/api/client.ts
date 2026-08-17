import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

export const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === '1';

function inferDevBaseUrl(): string | null {
  // In Expo Go / dev, Constants.expoConfig.hostUri is "192.168.x.x:8081".
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost ??
    null;
  if (!hostUri) return null;
  const host = String(hostUri).split(':')[0];
  return host ? `http://${host}:5000` : null;
}

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl && envUrl.length > 0 && !envUrl.includes('<LAN-IP>')) return envUrl;
  if (__DEV__) return inferDevBaseUrl() ?? 'http://localhost:5000';
  if (MOCK_API) return 'mock://';
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL bắt buộc cho production build (hoặc bật EXPO_PUBLIC_MOCK_API=1).',
  );
}

export const API_BASE_URL = resolveBaseUrl();

// Chặn cleartext ở production trừ khi Mock. LAN http chỉ chấp nhận trong __DEV__.
if (!__DEV__ && !MOCK_API && !API_BASE_URL.startsWith('https://')) {
  throw new Error(`Cleartext API base URL bị từ chối cho production: ${API_BASE_URL}`);
}

type TokenGetter = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenGetter = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

export function configureAuth(opts: { getToken: TokenGetter; onUnauthorized: UnauthorizedHandler }) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi';
}
