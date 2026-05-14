import { create } from 'zustand';
import { getSetting, setSetting, deleteAllData } from '../services/database';
import { savePin, verifyPin, hasPinSet, clearPin } from '../utils/pin';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, type AppStateStatus } from 'react-native';

interface AuthState {
  isInitialized: boolean;
  isFirstLaunch: boolean;
  isLocked: boolean;
  biometricsEnabled: boolean;
  biometricsAvailable: boolean;
  biometricsEnrolled: boolean;
  failedAttempts: number;
  cooldownUntil: number | null;
  backgroundTimestamp: number | null;
  autoLockTimeout: number;

  initialize: () => Promise<void>;
  completeOnboarding: (pin: string, enableBiometrics: boolean) => Promise<void>;
  unlock: () => void;
  lock: () => void;
  verifyPinAttempt: (pin: string) => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
  checkBiometricAvailability: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  toggleBiometrics: (enable: boolean) => Promise<boolean>;
  resetAll: () => Promise<void>;
  handleAppStateChange: (state: AppStateStatus) => void;
}

async function checkBiometrics(): Promise<{ available: boolean; enrolled: boolean }> {
  if (Platform.OS === 'web') return { available: false, enrolled: false };
  try {
    const available = await LocalAuthentication.hasHardwareAsync();
    if (!available) return { available: false, enrolled: false };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return { available, enrolled };
  } catch {
    return { available: false, enrolled: false };
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isInitialized: false,
  isFirstLaunch: true,
  isLocked: true,
  biometricsEnabled: false,
  biometricsAvailable: false,
  biometricsEnrolled: false,
  failedAttempts: 0,
  cooldownUntil: null,
  backgroundTimestamp: null,
  autoLockTimeout: 30,

  initialize: async () => {
    try {
      const onboardingComplete = getSetting('onboardingComplete');
      const biometricsEnabled = getSetting('biometricsEnabled') === 'true';
      const timeout = parseInt(getSetting('autoLockTimeout') ?? '30', 10);
      const { available, enrolled } = await checkBiometrics();
      set({
        isInitialized: true,
        isFirstLaunch: onboardingComplete !== 'true',
        isLocked: onboardingComplete === 'true',
        biometricsEnabled: biometricsEnabled && available && enrolled,
        biometricsAvailable: available,
        biometricsEnrolled: enrolled,
        autoLockTimeout: timeout || 30,
      });
    } catch {
      set({ isInitialized: true, isFirstLaunch: true, isLocked: false });
    }
  },

  checkBiometricAvailability: async () => {
    const { available, enrolled } = await checkBiometrics();
    set({ biometricsAvailable: available, biometricsEnrolled: enrolled });
  },

  completeOnboarding: async (pin: string, enableBiometrics: boolean) => {
    await savePin(pin);
    setSetting('onboardingComplete', 'true');
    setSetting('biometricsEnabled', enableBiometrics ? 'true' : 'false');
    set({
      isFirstLaunch: false,
      isLocked: false,
      biometricsEnabled: enableBiometrics,
    });
  },

  unlock: () => set({ isLocked: false, failedAttempts: 0, cooldownUntil: null }),

  lock: () => set({ isLocked: true }),

  verifyPinAttempt: async (pin: string) => {
    const { cooldownUntil, failedAttempts } = get();
    if (cooldownUntil && Date.now() < cooldownUntil) return false;
    const ok = await verifyPin(pin);
    if (ok) {
      set({ isLocked: false, failedAttempts: 0, cooldownUntil: null });
      return true;
    }
    const newAttempts = failedAttempts + 1;
    const cooldown = newAttempts >= 5 ? Date.now() + 30000 : null;
    set({ failedAttempts: newAttempts, cooldownUntil: cooldown });
    return false;
  },

  authenticateWithBiometrics: async () => {
    if (Platform.OS === 'web') return false;
    try {
      // Re-check enrollment before attempting
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        set({ biometricsEnrolled: false });
        return false;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Odblokuj Portfel Kaucyjny',
        fallbackLabel: 'Użyj PIN',
        cancelLabel: 'Anuluj',
        disableDeviceFallback: true,
      });

      if (result?.success) {
        set({ isLocked: false, failedAttempts: 0, cooldownUntil: null });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Biometric auth error:', e);
      return false;
    }
  },

  changePin: async (currentPin: string, newPin: string) => {
    const ok = await verifyPin(currentPin);
    if (!ok) return false;
    await savePin(newPin);
    return true;
  },

  toggleBiometrics: async (enable: boolean) => {
    if (enable && Platform.OS !== 'web') {
      // Fresh check — hardware + enrollment
      const { available, enrolled } = await checkBiometrics();
      set({ biometricsAvailable: available, biometricsEnrolled: enrolled });

      if (!available || !enrolled) {
        return false;
      }

      // Verify identity before enabling
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Potwierdź tożsamość',
          cancelLabel: 'Anuluj',
          disableDeviceFallback: true,
        });
        if (!result?.success) return false;
      } catch { return false; }
    }
    setSetting('biometricsEnabled', enable ? 'true' : 'false');
    set({ biometricsEnabled: enable });
    return true;
  },

  resetAll: async () => {
    deleteAllData();
    await clearPin();
    set({
      isFirstLaunch: true,
      isLocked: false,
      biometricsEnabled: false,
      failedAttempts: 0,
      cooldownUntil: null,
    });
  },

  handleAppStateChange: (nextState: AppStateStatus) => {
    const { isFirstLaunch, isLocked, autoLockTimeout, backgroundTimestamp } = get();
    if (isFirstLaunch) return;
    if (nextState === 'background' || nextState === 'inactive') {
      set({ backgroundTimestamp: Date.now() });
    } else if (nextState === 'active' && !isLocked) {
      if (backgroundTimestamp) {
        const elapsed = (Date.now() - backgroundTimestamp) / 1000;
        if (elapsed > autoLockTimeout) {
          set({ isLocked: true, backgroundTimestamp: null });
        } else {
          set({ backgroundTimestamp: null });
        }
      }
    }
  },
}));
