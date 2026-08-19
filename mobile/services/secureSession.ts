/**
 * JWT storage — Keychain (iOS) / Keystore (Android) via expo-secure-store.
 * Never persist access tokens in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'aaspaas.accessToken';
const LEGACY_STORAGE_KEY = 'aaspaas-session-v5';

export async function saveAccessToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    // Web / unsupported — fail closed (no token in insecure storage)
  }
}

export async function loadAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;
  } catch {
    /* unsupported platform */
  }
  return migrateLegacyToken();
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
      // Strip token from legacy blob so backups don't retain it
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
