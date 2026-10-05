import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The web preview has no Keychain; fall back to AsyncStorage there only.
const isWeb = Platform.OS === 'web';

/** flutter_secure_storage equivalent (Keychain / Keystore). */
export const secureStorage = {
  async read(key: string): Promise<string | null> {
    try {
      return isWeb ? await AsyncStorage.getItem(`secure:${key}`) : await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async write(key: string, value: string): Promise<void> {
    if (isWeb) await AsyncStorage.setItem(`secure:${key}`, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string): Promise<void> {
    try {
      if (isWeb) await AsyncStorage.removeItem(`secure:${key}`);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      // already gone
    }
  },
};

/** shared_preferences equivalent. Values are JSON-encoded. */
export const prefs = {
  async getString(key: string): Promise<string | null> {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === 'string' ? parsed : v;
    } catch {
      return v;
    }
  },
  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async getBool(key: string): Promise<boolean | null> {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    return v === 'true';
  },
  async setBool(key: string, value: boolean): Promise<void> {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  },
  async getInt(key: string): Promise<number | null> {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  },
  async setInt(key: string, value: number): Promise<void> {
    await AsyncStorage.setItem(key, String(value));
  },
  async getJson<T>(key: string): Promise<T | null> {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  },
  async setJson(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async getStringList(key: string): Promise<string[] | null> {
    const v = await prefs.getJson<unknown>(key);
    return Array.isArray(v) ? v.map(String) : null;
  },
  async setStringList(key: string, value: string[]): Promise<void> {
    await prefs.setJson(key, value);
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
