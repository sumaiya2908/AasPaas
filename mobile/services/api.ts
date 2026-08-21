import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Android emulator → host machine via 10.0.2.2
 * iOS simulator → localhost
 * Physical device / Expo Go → use the Metro host LAN IP
 */
function resolveApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri ||
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  const lanHost = typeof hostUri === 'string' ? hostUri.split(':')[0] : null;

  if (Platform.OS === 'android') {
    if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
      return `http://${lanHost}:3001/api`;
    }
    return 'http://10.0.2.2:3001/api';
  }

  if (lanHost && lanHost !== 'localhost') {
    return `http://${lanHost}:3001/api`;
  }

  return 'http://localhost:3001/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Internal — prevents infinite refresh retry loops */
  _retried?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

/** Register handler for expired/invalid JWT (401 on authenticated requests). */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

/** Try refresh before signing out on 401. Returns new access token or null. */
export function onRefreshAttempt(handler: () => Promise<string | null>) {
  refreshHandler = handler;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      options.token &&
      refreshHandler &&
      !options._retried &&
      !path.startsWith('/auth/refresh')
    ) {
      const newToken = await refreshHandler();
      if (newToken) {
        return apiRequest<T>(path, {
          ...options,
          token: newToken,
          _retried: true,
        });
      }
    }
    if (res.status === 401 && options.token) {
      unauthorizedHandler?.();
    }
    const msg =
      (data as { message?: string | string[] })?.message ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  return data as T;
}
