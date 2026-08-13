import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { ssoEnv } from '@/config/sso';

type Props = {
  mode: 'signup' | 'signin';
  loading?: boolean;
  onGoogle: () => void;
  onApple: () => void;
  /** Expo's redirect URI — add this exact string in Google Cloud Console */
  googleRedirectUri?: string | null;
};

export function SsoButtons({
  mode,
  loading,
  onGoogle,
  onApple,
  googleRedirectUri,
}: Props) {
  const googleLabel =
    mode === 'signup' ? 'Continue with Google' : 'Sign in with Google';
  const appleLabel =
    mode === 'signup' ? 'Continue with Apple' : 'Sign in with Apple';

  if (!ssoEnv.anyEnabled) return null;

  return (
    <View style={styles.wrap}>
      {ssoEnv.googleEnabled ? (
        <Pressable
          onPress={onGoogle}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={googleLabel}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.googleMark}>G</Text>
          <Text style={styles.text}>{googleLabel}</Text>
        </Pressable>
      ) : null}

      {ssoEnv.appleEnabled && Platform.OS === 'ios' ? (
        <Pressable
          onPress={onApple}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={appleLabel}
          style={({ pressed }) => [
            styles.btn,
            styles.apple,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.text, styles.appleText]}>{appleLabel}</Text>
        </Pressable>
      ) : null}

      {ssoEnv.googleEnabled &&
      !ssoEnv.googleConfigured &&
      ssoEnv.allowDevSso ? (
        <Text style={styles.devHint}>
          Dev SSO is on (no Google client IDs). Add EXPO_PUBLIC_GOOGLE_* keys for
          real Google login.
        </Text>
      ) : null}

      {ssoEnv.googleConfigured && googleRedirectUri ? (
        <Text selectable style={styles.devHint}>
          Google Cloud → Web client → Authorised redirect URIs (must be exactly):
          {'\n'}
          {googleRedirectUri}
          {'\n'}http://localhost:3001/api/auth/google/callback
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    gap: 10,
  },
  btn: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
  },
  apple: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  googleMark: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    color: colors.primary,
    width: 20,
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  appleText: {
    color: colors.white,
  },
  devHint: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 16,
  },
});
