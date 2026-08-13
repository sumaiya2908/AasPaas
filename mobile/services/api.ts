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
    // Emulator special case; physical Android still needs LAN IP
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
};

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
    const msg =
      (data as { message?: string | string[] })?.message ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  return data as T;
}
