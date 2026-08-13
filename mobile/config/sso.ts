/**
 * SSO feature flags + OAuth client IDs.
 * Set in `mobile/.env` (EXPO_PUBLIC_* are inlined at Metro bundler start).
 *
 * Restart Expo after changing these values.
 */

function envFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === '') return defaultValue;
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return defaultValue;
}

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';
const googleAndroidClientId =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';

/** Show Google SSO on login / create account */
export const SSO_GOOGLE_ENABLED = envFlag(
  process.env.EXPO_PUBLIC_SSO_GOOGLE,
  true,
);

/** Show Apple SSO on login / create account (iOS only in UI) */
export const SSO_APPLE_ENABLED = envFlag(
  process.env.EXPO_PUBLIC_SSO_APPLE,
  false,
);

/**
 * Allow `dev.*` tokens when real Google client IDs are missing.
 * Requires backend AUTH_DEV_SSO=true.
 */
export const SSO_DEV_MODE = envFlag(
  process.env.EXPO_PUBLIC_AUTH_DEV_SSO,
  !googleWebClientId,
);

export const ssoEnv = {
  googleEnabled: SSO_GOOGLE_ENABLED,
  appleEnabled: SSO_APPLE_ENABLED,
  allowDevSso: SSO_DEV_MODE,
  googleConfigured: Boolean(googleWebClientId),
  googleWebClientId,
  googleIosClientId,
  googleAndroidClientId,
  /** At least one SSO provider is on */
  anyEnabled: SSO_GOOGLE_ENABLED || SSO_APPLE_ENABLED,
} as const;
