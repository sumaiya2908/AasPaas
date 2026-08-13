import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

/** Leave guest/browse session and open Welcome reliably. */
export function useGoToWelcome() {
  const router = useRouter();
  const exitToSignIn = useAppStore((s) => s.exitToSignIn);

  return () => {
    exitToSignIn();
    // Let store commit before navigating out of tabs/modals.
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
  };
}
