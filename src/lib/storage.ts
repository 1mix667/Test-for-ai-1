import { Preferences } from '@capacitor/preferences';

/**
 * Хранилище. На Android это приватная песочница приложения
 * (SharedPreferences), другие приложения туда не лезут.
 * Ключи дополнительно шифруются AES-GCM, если задан PIN.
 */
export const KEYS_BLOB = 'vault.keys';
export const CHATS_BLOB = 'data.chats';
export const SETTINGS_BLOB = 'data.settings';

export async function getItem(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    return localStorage.getItem(key);
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch {
    localStorage.setItem(key, value);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch {
    localStorage.removeItem(key);
  }
}
