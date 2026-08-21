import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { bootstrapSession } from '@/services/sessionBootstrap';
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
    // Reset so the routing effect waits for bootstrap to finish.
    setHasHydrated(false);
    let cancelled = false;

    const run = async () => {
      await bootstrapSession();
      if (!cancelled) setHasHydrated(true);
    };

    if (useAppStore.persist.hasHydrated()) {
      void run();
    } else {
      const unsub = useAppStore.persist.onFinishHydration(() => {
        void run();
      });
      const fallback = setTimeout(() => {
        void run();
      }, 2000);
      return () => {
        cancelled = true;
        unsub();
        clearTimeout(fallback);
      };
    }

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
