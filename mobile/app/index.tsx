import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { loadAccessToken } from '@/services/secureSession';
import { useAppStore } from '@/store/useAppStore';

/**
 * Initial route gate. Navigates in useEffect (not during render) to avoid
 * Expo Router linking "state update on unmounted component" races.
 */
export default function Gate() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s._hasHydrated);
  const user = useAppStore((s) => s.user);
  const isGuest = useAppStore((s) => s.isGuest);
  const profile = useAppStore((s) => s.profile);
  const setHasHydrated = useAppStore((s) => s.setHasHydrated);

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      const token = await loadAccessToken();
      if (cancelled) return;
      if (token) {
        useAppStore.setState({ accessToken: token });
      }
      setHasHydrated(true);
    };

    const unsub = useAppStore.persist.onFinishHydration(() => {
      void finish();
    });
    if (useAppStore.persist.hasHydrated()) {
      void finish();
    } else {
      const fallback = setTimeout(() => {
        void finish();
      }, 1500);
      return () => {
        cancelled = true;
        unsub();
        clearTimeout(fallback);
      };
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, [setHasHydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let href: '/welcome' | '/profile-setup' | '/(tabs)' = '/welcome';
    if (!user && !isGuest) {
      href = '/welcome';
    } else if (user && !profile?.completed) {
      href = '/profile-setup';
    } else {
      href = '/(tabs)';
    }

    const t = requestAnimationFrame(() => {
      router.replace(href);
    });
    return () => cancelAnimationFrame(t);
  }, [hydrated, user, isGuest, profile?.completed, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
