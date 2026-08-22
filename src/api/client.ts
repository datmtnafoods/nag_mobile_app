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
type UnauthorizedHandler = (err: AxiosError) => void;

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
      onUnauthorized(error);
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    if (err.response?.status === 429) {
      return data?.message ?? 'Đăng nhập sai quá nhiều lần — thử lại sau 15 phút';
    }
    return data?.message ?? data?.error ?? err.message;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi';
}

/**
 * Lỗi do MẤT MẠNG (offline / DNS hỏng / backend không tới) — KHÁC lỗi nghiệp vụ
 * có response (4xx/5xx). Axios đặt `err.request` mà không có `err.response` khi
 * request gửi đi nhưng không nhận được phản hồi. Dùng để: hiện câu "đang offline"
 * thay vì "Network Error", và để sync-queue biết nên GIỮ lại thử sau (vs bỏ vì
 * lỗi nghiệp vụ). `ERR_NETWORK`/`ECONNABORTED` (timeout) cũng tính là mất mạng.
 */
export function laLoiMang(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (err.response) return false; // có phản hồi → lỗi nghiệp vụ, không phải mất mạng
    return (
      err.code === 'ERR_NETWORK' ||
      err.code === 'ECONNABORTED' ||
      Boolean(err.request)
    );
  }
  return false;
}

/** Trả về HTTP status kèm mock status (mock lỗi có gắn .status trong throw). */
export function apiErrorStatus(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) return err.response?.status;
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}
