import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:5000';

function getExpoDevHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.linkingUri,
    (Constants as { debuggerHost?: string }).debuggerHost,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '');

    const host = withoutProtocol
      .split('/')[0]
      ?.split(':')[0];

    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1'
    ) {
      return host;
    }
  }

  return null;
}

function resolveApiUrl(): string {
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

  // This resolver is only needed for native mobile.
  if (Platform.OS === 'web') {
    return envUrl.replace(/\/$/, '');
  }

  try {
    const parsed = new URL(envUrl);

    const isLoopback =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1';

    // If the developer explicitly supplied a real IP/domain,
    // keep it.
    if (!isLoopback) {
      return envUrl.replace(/\/$/, '');
    }

    // Development build running on a physical device:
    // obtain the PC's current LAN IP from Expo.
    const lanHost = getExpoDevHost();

    if (lanHost) {
      parsed.hostname = lanHost;

      return parsed.toString().replace(/\/$/, '');
    }

    // Android emulator fallback.
    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2';

      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    // Keep the environment URL if it cannot be parsed.
  }

  return envUrl.replace(/\/$/, '');
}

export const API_URL = resolveApiUrl();

console.log('Campusly API URL:', API_URL);