import { useRouter } from 'expo-router';
import { signOutWithApi } from '@/services/sessionBootstrap';

/** End the signed-in session (server revoke + local wipe) and return to Welcome. */
export function useSignOut() {
  const router = useRouter();

  return () => {
    void signOutWithApi().finally(() => {
      requestAnimationFrame(() => {
        try {
          if (router.canDismiss()) {
            router.dismissAll();
          }
        } catch {
          // ignore
        }
        router.replace('/welcome');
      });
    });
  };
}
