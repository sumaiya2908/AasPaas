import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ssoEnv } from '@/config/sso';
import { API_BASE_URL } from '@/services/api';
import { oauthWithApi, useAppStore, type UserProfile } from '@/store/useAppStore';

WebBrowser.maybeCompleteAuthSession();

/** Add ONLY these in Google Cloud → Web client → Authorised redirect URIs */
export const GOOGLE_CONSOLE_REDIRECT_URIS = [
  'http://127.0.0.1:3001/api/auth/google/callback',
  'http://localhost:3001/api/auth/google/callback',
] as const;

export function getGoogleRedirectUri() {
  return GOOGLE_CONSOLE_REDIRECT_URIS[0];
}

export function canPromptGoogleAuth() {
  return ssoEnv.googleEnabled && Boolean(ssoEnv.googleWebClientId);
}

/**
 * Real Google login via API (localhost callback Google accepts).
 * Android emulator: `adb reverse tcp:3001 tcp:3001`
 */
export async function continueWithGoogle(nameHint?: string) {
  if (!ssoEnv.googleEnabled) {
    throw new Error('Google SSO is disabled (EXPO_PUBLIC_SSO_GOOGLE=false).');
  }

  if (!ssoEnv.googleWebClientId) {
    if (ssoEnv.allowDevSso) return continueWithGoogleDev(nameHint);
    throw new Error('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in mobile/.env');
  }

  const appRedirect = AuthSession.makeRedirectUri({
    scheme: 'aaspaas',
    path: 'oauth',
    preferLocalhost: true,
  });

  const startUrl = `${API_BASE_URL}/auth/google/start?appRedirect=${encodeURIComponent(appRedirect)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, appRedirect);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return null;
  }
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Google sign-in was not completed');
  }

  const payloadB64 = extractQueryParam(result.url, 'payload');
  if (!payloadB64) {
    throw new Error('Google sign-in returned no session payload');
  }

  const json = JSON.parse(base64UrlToUtf8(payloadB64)) as {
    accessToken: string;
    user: { id: string; email: string; name: string; provider: string };
    profile: {
      homeCityId: string | null;
      homeCity: string | null;
      interests: string[];
      travelStyle: string | null;
      aboutCity: string | null;
      completed: boolean;
    } | null;
  };

  const profile: UserProfile | null = json.profile
    ? {
        homeCityId: json.profile.homeCityId || 'home',
        homeCity: json.profile.homeCity || '',
        interests: json.profile.interests || [],
        travelStyle: json.profile.travelStyle || '',
        aboutCity: json.profile.aboutCity || '',
        completed: Boolean(json.profile.completed),
      }
    : null;

  useAppStore.getState().applyAuthSession({
    accessToken: json.accessToken,
    user: {
      id: json.user.id,
      name: json.user.name,
      email: json.user.email,
      provider:
        json.user.provider === 'google' || json.user.provider === 'apple'
          ? json.user.provider
          : 'google',
    },
    profile,
  });

  return json;
}

export async function continueWithGoogleDev(nameHint?: string) {
  if (!ssoEnv.googleEnabled) {
    throw new Error('Google SSO is disabled (EXPO_PUBLIC_SSO_GOOGLE=false).');
  }
  if (!ssoEnv.allowDevSso) {
    throw new Error(
      'Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
    );
  }
  const stamp = Date.now();
  return oauthWithApi({
    provider: 'google',
    idToken: `dev.google.${stamp}`,
    email: `google.user.${stamp}@aaspaas.local`,
    name: nameHint?.trim() || 'Google Traveler',
  });
}

export async function continueWithApple() {
  if (!ssoEnv.appleEnabled) {
    throw new Error('Apple SSO is disabled (EXPO_PUBLIC_SSO_APPLE=false).');
  }
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    if (ssoEnv.allowDevSso) {
      const stamp = Date.now();
      return oauthWithApi({
        provider: 'apple',
        idToken: `dev.apple.${stamp}`,
        email: `apple.user.${stamp}@aaspaas.local`,
        name: 'Apple Traveler',
      });
    }
    throw new Error('Apple Sign In is not available on this device');
  }

  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!cred.identityToken) {
    throw new Error('Apple did not return an identity token');
  }

  const name = [cred.fullName?.givenName, cred.fullName?.familyName]
    .filter(Boolean)
    .join(' ');

  return oauthWithApi({
    provider: 'apple',
    idToken: cred.identityToken,
    email: cred.email || undefined,
    name: name || undefined,
  });
}

function extractQueryParam(url: string, key: string): string | null {
  const qIndex = url.indexOf('?');
  if (qIndex < 0) return null;
  const query = url.slice(qIndex + 1).split('#')[0];
  for (const part of query.split('&')) {
    const [k, v] = part.split('=');
    if (decodeURIComponent(k) === key) {
      return decodeURIComponent((v || '').replace(/\+/g, ' '));
    }
  }
  return null;
}

function base64UrlToUtf8(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = globalThis.atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** @deprecated use ssoEnv from @/config/sso */
export const ssoConfig = ssoEnv;
