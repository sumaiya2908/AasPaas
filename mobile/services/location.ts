import * as Location from 'expo-location';

export type ApproximateCoords = {
  latitude: number;
  longitude: number;
};

/** Current permission — does not prompt. */
export async function getLocationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/** Contextual request — never force on launch. */
export async function requestApproximateLocation(): Promise<ApproximateCoords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  return readApproximateLocation();
}

export async function readApproximateLocation(): Promise<ApproximateCoords | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}
