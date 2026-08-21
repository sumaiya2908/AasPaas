/**
 * Cold-start session restore — validate token with /auth/me, sync saves, re-register push.
 * Users stay signed in across app close/reopen unless token is invalid or expired.
 */

import { router } from 'expo-router';
import { ApiError, onRefreshAttempt } from '@/services/api';
import * as api from '@/services/aaspaasApi';
import { ensurePushRegistration } from '@/services/push';
import {
  loadAccessToken,
  loadRefreshToken,
  saveSessionTokens,
} from '@/services/secureSession';
import {
  mapApiProfileFromStore,
  syncSavesWithApi,
  useAppStore,
  type AppUser,
} from '@/store/useAppStore';

function mapProvider(raw: string): AppUser['provider'] {
  if (raw === 'google' || raw === 'apple') return raw;
  return 'email';
}

/** Apply a full auth response (login/register/oauth/exchange/refresh). */
export async function applyAuthResponse(res: api.AuthResponse) {
  await saveSessionTokens({
    accessToken: res.accessToken,
    refreshToken: res.refreshToken ?? null,
  });
  useAppStore.getState().applyAuthSession({
    accessToken: res.accessToken,
    user: {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      provider: mapProvider(res.user.provider),
    },
    profile: mapApiProfileFromStore(res.profile),
  });
  await syncSavesWithApi();
  void ensurePushRegistration();
}

/** Attempt token refresh; returns new access token or null. */
export async function tryRefreshSession(): Promise<string | null> {
  const refreshToken = await loadRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await api.refreshSession(refreshToken);
    await applyAuthResponse(res);
    return res.accessToken;
  } catch {
    return null;
  }
}

/** Wire refresh handler for apiRequest 401 auto-retry. Call once in root layout. */
export function initSessionRefreshHandler() {
  onRefreshAttempt(tryRefreshSession);
}

/**
 * Restore session after app relaunch or return to the index gate.
 */
export async function bootstrapSession(): Promise<boolean> {
  return runBootstrapSession();
}

async function runBootstrapSession(): Promise<boolean> {
  const token = await loadAccessToken();
  const state = useAppStore.getState();

  if (token) {
    useAppStore.setState({ accessToken: token });
  }

  const { user, isGuest } = useAppStore.getState();

  if (isGuest && !user) {
    return true;
  }

  if (user && !isGuest) {
    if (!token) {
      useAppStore.getState().signOut();
      return false;
    }

    try {
      const me = await api.fetchMe(token);
      useAppStore.getState().applyAuthSession({
        accessToken: token,
        user: {
          id: me.user.id,
          name: me.user.name,
          email: me.user.email,
          provider: mapProvider(me.user.provider),
        },
        profile: mapApiProfileFromStore(me.profile),
      });
      await syncSavesWithApi();
      void ensurePushRegistration();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        const refreshed = await tryRefreshSession();
        if (refreshed) return true;
        useAppStore.getState().signOut();
        return false;
      }
      return true;
    }
  }

  return true;
}

/** Clear session when any authenticated API call returns 401. */
export function handleUnauthorizedSession() {
  const { user, isGuest } = useAppStore.getState();
  if (!user || isGuest) return;

  void (async () => {
    const refreshed = await tryRefreshSession();
    if (refreshed) return;
    useAppStore.getState().signOut();
    requestAnimationFrame(() => {
      try {
        if (router.canDismiss?.()) {
          router.dismissAll();
        }
      } catch {
        // ignore
      }
      router.replace('/welcome');
    });
  })();
}

/** Server logout + local wipe. */
export async function signOutWithApi() {
  const refreshToken = await loadRefreshToken();
  if (refreshToken) {
    await api.logoutSession(refreshToken).catch(() => undefined);
  }
  useAppStore.getState().signOut();
}

/** Delete account on server then sign out locally. */
export async function deleteAccountWithApi() {
  const token = useAppStore.getState().accessToken;
  if (!token) {
    useAppStore.getState().signOut();
    return;
  }
  await api.deleteAccount(token);
  await signOutWithApi();
}
