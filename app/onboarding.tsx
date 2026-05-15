import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { PinKeypad } from '../components/PinKeypad';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticError } from '../utils/haptics';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { completeOnboarding, biometricsAvailable, biometricsEnrolled, checkBiometricAvailability } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check biometrics on mount
  useEffect(() => {
    if (Platform.OS !== 'web') {
      checkBiometricAvailability();
    }
  }, []);

  const canOfferBiometrics = biometricsAvailable && biometricsEnrolled && Platform.OS !== 'web';

  const handlePinSet = useCallback((entered: string) => {
    if (step === 1) {
      setPin(entered);
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (entered === pin) {
        hapticSuccess();
        setError(null);
        if (canOfferBiometrics) {
          setStep(3);
        } else {
          completeOnboarding(pin, false).then(() => router.replace('/tabs/home'));
        }
      } else {
        hapticError();
        setError(t('onboarding.pinMismatch'));
        setStep(1);
        setPin('');
      }
    }
  }, [step, pin, canOfferBiometrics, completeOnboarding, router, t]);

  const handleBiometrics = async (enable: boolean) => {
    await completeOnboarding(pin, enable);
    hapticSuccess();
    router.replace('/tabs/home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={48} color={colors.primary} />
        <Text style={[styles.welcome, { color: colors.textPrimary }]}>{t('onboarding.welcome')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('onboarding.subtitle')}</Text>
      </View>

      {step < 3 ? (
        <PinKeypad
          title={step === 1 ? t('onboarding.setPinTitle') : t('onboarding.confirmPinTitle')}
          subtitle={step === 1 ? t('onboarding.setPinDesc') : t('onboarding.confirmPinDesc')}
          onComplete={handlePinSet}
          error={error}
        />
      ) : (
        <View style={styles.biometricsCard}>
          <Ionicons
            name="finger-print-outline"
            size={56}
            color={colors.primary}
          />
          <Text style={[styles.bioTitle, { color: colors.textPrimary }]}>{t('onboarding.biometricsTitle')}</Text>
          <Text style={[styles.bioDesc, { color: colors.textSecondary }]}>{t('onboarding.biometricsDesc')}</Text>
          <View style={styles.bioButtons}>
            <Pressable
              style={({ pressed }) => [styles.bioBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => handleBiometrics(true)}
            >
              <Ionicons name="finger-print-outline" size={20} color="#FFF" />
              <Text style={styles.bioBtnText}>{t('onboarding.enableBiometrics')}</Text>
            </Pressable>
            <Pressable style={styles.bioSkip} onPress={() => handleBiometrics(false)}>
              <Text style={[styles.bioSkipText, { color: colors.textSecondary }]}>{t('onboarding.skipBiometrics')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.dots}>
        {(canOfferBiometrics ? [1, 2, 3] : [1, 2]).map(i => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.textTertiary }]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  welcome: { fontSize: 28, fontWeight: 'bold', marginTop: 12 },
  subtitle: { fontSize: 16, marginTop: 4 },
  biometricsCard: { alignItems: 'center', padding: 32 },
  bioTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  bioDesc: { fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  bioButtons: { width: '100%', gap: 12, maxWidth: 280 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  bioBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bioSkip: { paddingVertical: 12, alignItems: 'center' },
  bioSkipText: { fontSize: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'absolute', bottom: 40, left: 0, right: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
