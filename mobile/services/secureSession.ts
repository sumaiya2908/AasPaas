/**
 * JWT + refresh token storage — Keychain (iOS) / Keystore (Android).
 * Never persist tokens in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'aaspaas.accessToken';
const REFRESH_KEY = 'aaspaas.refreshToken';
const LEGACY_STORAGE_KEY = 'aaspaas-session-v5';

export async function saveAccessToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
    }
  } catch {
    // Web / unsupported — fail closed
  }
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  } catch {
    // Web / unsupported
  }
}

export async function saveSessionTokens(input: {
  accessToken: string | null;
  refreshToken?: string | null;
}): Promise<void> {
  await saveAccessToken(input.accessToken);
  if (input.refreshToken !== undefined) {
    await saveRefreshToken(input.refreshToken);
  }
}

export async function loadAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_KEY);
    if (token) return token;
  } catch {
    /* unsupported platform */
  }
  return migrateLegacyToken();
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** One-time move from Zustand AsyncStorage blob → SecureStore. */
async function migrateLegacyToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } };
    const legacy = parsed.state?.accessToken;
    if (legacy && typeof legacy === 'string') {
      await saveAccessToken(legacy);
      parsed.state!.accessToken = null;
      await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(parsed));
      return legacy;
    }
  } catch {
    /* ignore corrupt legacy */
  }
  return null;
}

export async function clearAccessToken(): Promise<void> {
  await saveAccessToken(null);
}

export async function clearSessionTokens(): Promise<void> {
  await saveAccessToken(null);
  await saveRefreshToken(null);
}
