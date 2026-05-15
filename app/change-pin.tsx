import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { PinKeypad } from '../components/PinKeypad';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticError } from '../utils/haptics';

export default function ChangePinScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { changePin } = useAuthStore();
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePin = useCallback(async (pin: string) => {
    setError(null);
    if (step === 'current') {
      setCurrentPin(pin);
      setStep('new');
    } else if (step === 'new') {
      setNewPin(pin);
      setStep('confirm');
    } else {
      if (pin !== newPin) {
        hapticError();
        setError(t('changePin.pinMismatch'));
        setStep('new');
        setNewPin('');
        return;
      }
      const ok = await changePin(currentPin, pin);
      if (ok) {
        hapticSuccess();
        router.back();
      } else {
        hapticError();
        setError(t('changePin.wrongCurrentPin'));
        setStep('current');
        setCurrentPin('');
        setNewPin('');
      }
    }
  }, [step, currentPin, newPin, changePin, router, t]);

  const titles = {
    current: t('changePin.currentPin'),
    new: t('changePin.newPin'),
    confirm: t('changePin.confirmNewPin'),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('changePin.title')}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.content}>
        <PinKeypad title={titles[step]} onComplete={handlePin} error={error} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center' },
});
