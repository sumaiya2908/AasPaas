import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { deleteAccountWithApi } from '@/services/sessionBootstrap';

/** Permanently delete account after confirmation. */
export function useDeleteAccount() {
  const router = useRouter();

  return () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, saves, and posts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAccountWithApi()
              .catch(() => {
                Alert.alert(
                  'Could not delete account',
                  'Check your connection and try again.',
                );
              })
              .finally(() => {
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
          },
        },
      ],
    );
  };
}
