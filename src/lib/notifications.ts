import { Platform } from 'react-native';
import { api } from './api';
import { API_URL } from './config';

// Conditional import to support Expo Go (SDK 53+)
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // TODO: Set up notification category with action button for attendance
  // This requires the correct format for Expo SDK 57 - currently commented out due to API compatibility issues
  // if (Platform.OS === 'android') {
  //   Notifications.setNotificationCategoryAsync('ATTENDANCE', {
  //     actions: [
  //       {
  //         identifier: 'MARK_PRESENT',
  //         title: 'Mark Present',
  //         allowsTextInput: false,
  //       },
  //     ],
  //   });
  // }
} catch (error) {
  console.warn('[Notifications] expo-notifications not available (may be running in Expo Go):', error);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) {
    console.log('[Notifications] expo-notifications not available, skipping permission request');
    return false;
  }

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
  if (!Notifications) {
    console.log('[Notifications] expo-notifications not available, skipping push token retrieval');
    return null;
  }

  try {
    // With Firebase configured via plugins, expo-notifications automatically uses FCM on Android
    // and Expo push service on iOS
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '04c2c085-1d53-4135-bb58-238136c1fdef',
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
    console.log('[Notifications] Registering push token:', { pushToken, deviceIdentifier });
    await apiRequest(
      '/notifications/register-token',
      {
        method: 'POST',
        body: JSON.stringify({
          pushToken: pushToken,
          deviceIdentifier: deviceIdentifier,
        }),
      },
      accessToken,
    );
    console.log('[Notifications] Push token registered with backend successfully');
  } catch (error) {
    console.error('[Notifications] Failed to register push token:', error);
    throw error;
  }
}

export function setupNotificationListener(callback: (notification: any, action?: string) => void): () => void {
  if (!Notifications) {
    console.log('[Notifications] expo-notifications not available, skipping notification listener setup');
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response: { notification: { request: { content: any; }; }; actionIdentifier: string; }) => {
    const notification = response.notification.request.content;
    console.log('[Notifications] Notification tapped:', notification);
    console.log('[Notifications] Action identifier:', response.actionIdentifier);
    
    // Pass both notification data and action identifier to callback
    callback(notification, response.actionIdentifier);
  });

  return () => subscription.remove();
}

export function setupForegroundNotificationListener(callback: (notification: any) => void): () => void {
  if (!Notifications) {
    console.log('[Notifications] expo-notifications not available, skipping foreground notification listener setup');
    return () => {};
  }

  const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
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
