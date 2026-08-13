import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

/** Remote push was removed from Expo Go (SDK 53+). Skip there. */
function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

/**
 * Request permission + register Expo push token with the API.
 * No-ops in Expo Go — use a development build for real push.
 */
export async function ensurePushRegistration() {
  if (isExpoGo()) return null;

  const accessToken = useAppStore.getState().accessToken;
  if (!accessToken) return null;

  try {
    // Dynamic import so Expo Go never loads expo-notifications (it throws on import).
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const push = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await registerPushToken(accessToken, {
      token: push.data,
      platform: Platform.OS,
    });
    return push.data;
  } catch {
    // Emulator / missing projectId / unsupported runtime — inbox still works
    return null;
  }
}
