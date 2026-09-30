import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { API_URL } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        console.warn('[Notifications] Failed to set notification channel (may not work in Expo Go):', error);
        // Continue anyway - notification channel setup is not critical for login
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }

    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to request notification permission:', error);
    return false;
  }
}

export async function getPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '33849529-b7ce-4730-9ed5-59c522a9cfdc',
    });
    console.log('[Notifications] Push token obtained:', token.data);
    return token.data;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

export async function registerPushTokenWithBackend(
  accessToken: string,
  pushToken: string,
  deviceIdentifier: string,
): Promise<void> {
  try {
    await apiRequest(
      '/notifications/register-token',
      {
        method: 'POST',
        body: JSON.stringify({
          push_token: pushToken,
          device_identifier: deviceIdentifier,
        }),
      },
      accessToken,
    );
    console.log('[Notifications] Push token registered with backend');
  } catch (error) {
    console.error('[Notifications] Failed to register push token:', error);
    throw error;
  }
}

export function setupNotificationListener(callback: (notification: any) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const notification = response.notification.request.content;
    console.log('[Notifications] Notification tapped:', notification);
    callback(notification);
  });

  return () => subscription.remove();
}

export function setupForegroundNotificationListener(callback: (notification: any) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notifications] Foreground notification received:', notification);
    callback(notification);
  });

  return () => subscription.remove();
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const url = API_URL + endpoint;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
