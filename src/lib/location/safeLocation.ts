// src/lib/location/safeLocation.ts
import { Platform } from 'react-native';

let ExpoLocationModule: any = null;
let isLocationModuleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-location');
  if (mod) {
    ExpoLocationModule = mod;
    isLocationModuleAvailable = true;
  }
} catch {
  ExpoLocationModule = null;
  isLocationModuleAvailable = false;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  isFallback: boolean;
}

/**
 * Check whether device location hardware / module is active
 */
export function hasNativeLocationSupport(): boolean {
  return isLocationModuleAvailable || (Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.geolocation);
}

/**
 * Safely request foreground location permission without crashing on missing native binaries
 */
export async function requestSafeLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  if (!ExpoLocationModule) {
    return false;
  }

  try {
    const res = await ExpoLocationModule.requestForegroundPermissionsAsync();
    return res?.status === 'granted';
  } catch (err) {
    console.warn('[SafeLocation] requestForegroundPermissionsAsync failed:', err);
    return false;
  }
}

/**
 * Safely obtain current device coordinates.
 * Falls back to default Douala coordinates if native module is absent, permission denied, or GPS times out.
 */
export async function getSafeCurrentPosition(defaultCoords?: [number, number]): Promise<LocationCoords> {
  const fallbackLat = defaultCoords ? defaultCoords[0] : 4.051056;
  const fallbackLng = defaultCoords ? defaultCoords[1] : 9.708528;

  // Web geolocation
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 60000,
        });
      });
      return {
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        isFallback: false,
      };
    } catch {
      // Fall through to default
    }
  }

  // Native Expo Location
  if (ExpoLocationModule) {
    try {
      const granted = await requestSafeLocationPermission();
      if (granted) {
        const accuracy = ExpoLocationModule.Accuracy?.Balanced ?? 3;
        const res = await ExpoLocationModule.getCurrentPositionAsync({ accuracy });
        if (res?.coords) {
          return {
            latitude: Number(res.coords.latitude.toFixed(6)),
            longitude: Number(res.coords.longitude.toFixed(6)),
            isFallback: false,
          };
        }
      }
    } catch (err) {
      console.warn('[SafeLocation] getCurrentPositionAsync failed:', err);
    }
  }

  // Graceful fallback
  return {
    latitude: fallbackLat,
    longitude: fallbackLng,
    isFallback: true,
  };
}
