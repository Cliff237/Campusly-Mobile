import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSecureStore = Platform.OS !== 'web';

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (useSecureStore) {
      try {
        const secureValue = await SecureStore.getItemAsync(key);
        if (secureValue != null) return secureValue;
      } catch {
        // Fall through to AsyncStorage (web / unsupported SecureStore).
      }
    }

    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
    if (useSecureStore) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {
        // AsyncStorage already persisted the value.
      }
    }
  },

  async deleteItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    if (useSecureStore) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore SecureStore cleanup failures.
      }
    }
  },
};
