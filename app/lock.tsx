import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { PinKeypad } from '../components/PinKeypad';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticError } from '../utils/haptics';

export default function LockScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    biometricsEnabled, biometricsEnrolled, failedAttempts, cooldownUntil,
    verifyPinAttempt, authenticateWithBiometrics, resetAll, checkBiometricAvailability,
  } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const mountedRef = useRef(true);

  // Check biometric availability on mount
  useEffect(() => {
    mountedRef.current = true;
    if (Platform.OS !== 'web') {
      checkBiometricAvailability();
    }
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-trigger biometrics on mount with delay for Expo Go
  useEffect(() => {
    if (!biometricsEnabled || !biometricsEnrolled || Platform.OS === 'web' || biometricAttempted) return;

    // Small delay to let the screen render and Expo Go settle
    const timer = setTimeout(async () => {
      if (!mountedRef.current) return;
      setBiometricAttempted(true);
      try {
        const ok = await authenticateWithBiometrics();
        if (ok && mountedRef.current) {
          hapticSuccess();
        }
      } catch (e) {
        console.warn('Auto biometric failed:', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [biometricsEnabled, biometricsEnrolled]);

  // Retry biometrics when app comes back to foreground
  useEffect(() => {
    if (Platform.OS === 'web' || !biometricsEnabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && biometricsEnabled && biometricsEnrolled) {
        setBiometricAttempted(false);
      }
    });
    return () => sub?.remove?.();
  }, [biometricsEnabled, biometricsEnrolled]);

  // Cooldown timer
  useEffect(() => {
    if (!cooldownUntil) { setCooldownSeconds(0); return; }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const handlePin = useCallback(async (pin: string) => {
    if (cooldownSeconds > 0) return;
    const ok = await verifyPinAttempt(pin);
    if (ok) {
      hapticSuccess();
      setError(null);
    } else {
      hapticError();
      setError(t('lock.wrongPin'));
    }
  }, [cooldownSeconds, verifyPinAttempt, t]);

  const handleBiometricPress = useCallback(async () => {
    try {
      const ok = await authenticateWithBiometrics();
      if (ok) {
        hapticSuccess();
      } else {
        setError(t('lock.wrongPin'));
      }
    } catch (e) {
      console.warn('Biometric press error:', e);
    }
  }, [authenticateWithBiometrics, t]);

  const handleReset = async () => {
    await resetAll();
    setShowReset(false);
    router.replace('/onboarding');
  };

  const canUseBiometrics = biometricsEnabled && biometricsEnrolled && Platform.OS !== 'web';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={40} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('lock.title')}</Text>
      </View>

      {cooldownSeconds > 0 ? (
        <View style={styles.cooldown}>
          <Ionicons name="time-outline" size={32} color={colors.warning} />
          <Text style={[styles.cooldownText, { color: colors.warning }]}>
            {t('lock.cooldown', { seconds: cooldownSeconds })}
          </Text>
        </View>
      ) : (
        <PinKeypad
          title={t('lock.enterPin')}
          onComplete={handlePin}
          error={error}
          showBiometric={canUseBiometrics}
          onBiometric={handleBiometricPress}
        />
      )}

      {failedAttempts > 0 && failedAttempts < 5 && cooldownSeconds <= 0 && (
        <Text style={[styles.attemptsText, { color: colors.warning }]}>
          {t('lock.attemptsLeft', { count: 5 - failedAttempts })}
        </Text>
      )}

      <Pressable style={styles.forgot} onPress={() => setShowReset(true)}>
        <Text style={[styles.forgotText, { color: colors.textTertiary }]}>{t('lock.forgotPin')}</Text>
      </Pressable>

      <ConfirmSheet
        visible={showReset}
        title={t('lock.forgotPin')}
        message={t('lock.forgotPinWarning')}
        destructive
        onConfirm={handleReset}
        onCancel={() => setShowReset(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  cooldown: { alignItems: 'center', padding: 32 },
  cooldownText: { fontSize: 16, marginTop: 8 },
  attemptsText: { textAlign: 'center', fontSize: 13, marginTop: 8 },
  forgot: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  forgotText: { fontSize: 14 },
});
