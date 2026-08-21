import * as Location from 'expo-location';

export type ApproximateCoords = {
  latitude: number;
  longitude: number;
};

/** Current permission status — does not prompt the user. */
export async function getLocationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/**
 * Request permission then read coords.
 * Returns null if denied or on error.
 */
export async function requestApproximateLocation(): Promise<ApproximateCoords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  return readApproximateLocation();
}

/**
 * Read location without prompting (permission must already be granted).
 * Times out after 8 s so the UI never hangs.
 */
export async function readApproximateLocation(): Promise<ApproximateCoords | null> {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 8000),
    );
    const read = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).then((pos) => ({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }));
    return await Promise.race([read, timeout]);
  } catch {
    // Permission revoked mid-session or hardware unavailable
    return null;
  }
}
