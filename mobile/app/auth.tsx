import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BackLink, GhostButton, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { SsoButtons } from '@/components/SsoButtons';
import { ssoEnv } from '@/config/sso';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { ApiError } from '@/services/api';
import { loginWithApi, registerWithApi, useAppStore } from '@/store/useAppStore';
import {
  canPromptGoogleAuth,
  continueWithApple,
  continueWithGoogle,
  continueWithGoogleDev,
  getGoogleRedirectUri,
} from '@/services/sso';
import { ensurePushRegistration } from '@/services/push';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<'signup' | 'signin'>(
    modeParam === 'signin' ? 'signin' : 'signup',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modeParam === 'signin' || modeParam === 'signup') {
      setMode(modeParam);
    }
  }, [modeParam]);

  const title = mode === 'signup' ? 'Create account' : 'Sign in';
  const canSubmit = useMemo(() => {
    const okEmail = email.includes('@') && email.includes('.');
    const okPass = password.trim().length >= 6;
    if (mode === 'signup') return name.trim().length > 1 && okEmail && okPass;
    return okEmail && okPass;
  }, [email, mode, name, password]);

  const afterAuth = async () => {
    void ensurePushRegistration();
    const profile = useAppStore.getState().profile;
    if (profile?.completed) {
      router.replace('/(tabs)');
    } else {
      router.replace('/profile-setup');
    }
  };

  const finishAuth = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === 'signup') {
        await registerWithApi({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
        });
      } else {
        await loginWithApi({
          email: email.trim(),
          password: password.trim(),
        });
      }
      await afterAuth();
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : 'Could not reach the server. Is the backend running on port 3001?';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    if (!ssoEnv.googleEnabled) return;
    setLoading(true);
    setError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (canPromptGoogleAuth()) {
        const session = await continueWithGoogle(name || undefined);
        if (!session) return; // cancelled
        await afterAuth();
        return;
      }
      await continueWithGoogleDev(name || undefined);
      await afterAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed';
      setError(
        `${msg}\n\nAdd this redirect URI in Google Cloud (Web client):\n${getGoogleRedirectUri()}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onApple = async () => {
    if (!ssoEnv.appleEnabled) return;
    setLoading(true);
    setError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await continueWithApple();
      await afterAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const ssoCopy = (() => {
    const parts: string[] = [];
    if (ssoEnv.googleEnabled) parts.push('Google');
    if (ssoEnv.appleEnabled) parts.push('Apple');
    parts.push('email');
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
  })();

  return (
    <Screen atmosphere>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: 8, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <BackLink label="Welcome" onPress={() => router.replace('/welcome')} />

          <Title style={{ marginTop: spacing.md }}>{title}</Title>
          <Muted style={{ marginTop: 8 }}>
            {mode === 'signup'
              ? `Use ${ssoCopy} — then set your home city.`
              : `Welcome back. Sign in with ${ssoCopy}.`}
          </Muted>

          <SsoButtons
            mode={mode}
            loading={loading}
            onGoogle={onGoogle}
            onApple={onApple}
            googleRedirectUri={getGoogleRedirectUri()}
          />

          {ssoEnv.anyEnabled ? (
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>or email</Text>
              <View style={styles.line} />
            </View>
          ) : null}

          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            placeholderTextColor={colors.textDim}
            secureTextEntry
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            onPress={finishAuth}
            disabled={!canSubmit}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />

          <GhostButton
            label={
              mode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New here? Create account'
            }
            onPress={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
            }}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  divider: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  or: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    marginTop: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
});
