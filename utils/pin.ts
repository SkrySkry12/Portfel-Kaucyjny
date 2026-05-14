import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'pin_hash';
const SALT_KEY = 'pin_salt';

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return await SecureStore.getItemAsync(key);
}

async function secureDel(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch {}
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function hashPin(pin: string, salt?: string): Promise<string> {
  const s = salt ?? Math.random().toString(36).substring(2, 18);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${s}:${pin}`
  );
  return `${s}:${hash}`;
}

export async function savePin(pin: string): Promise<void> {
  const result = await hashPin(pin);
  await secureSet(PIN_KEY, result);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await secureGet(PIN_KEY);
  if (!stored) return false;
  const [salt] = stored.split(':');
  if (!salt) return false;
  const check = await hashPin(pin, salt);
  return check === stored;
}

export async function hasPinSet(): Promise<boolean> {
  const stored = await secureGet(PIN_KEY);
  return !!stored;
}

export async function clearPin(): Promise<void> {
  await secureDel(PIN_KEY);
  await secureDel(SALT_KEY);
}

export { secureSet, secureGet, secureDel };
