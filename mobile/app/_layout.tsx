import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Literata_600SemiBold,
  Literata_700Bold,
} from '@expo-google-fonts/literata';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [readyFallback, setReadyFallback] = useState(false);
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Literata_600SemiBold,
    Literata_700Bold,
  });

  useEffect(() => {
    if (error) {
      console.warn('Font load failed, continuing with system fonts', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error || readyFallback) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, readyFallback]);

  useEffect(() => {
    const t = setTimeout(() => setReadyFallback(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!loaded && !error && !readyFallback) return null;

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile-setup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="choose-city" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="city/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="place/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ask" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="share" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="journey/build" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="journey/result" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}
