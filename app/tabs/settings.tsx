import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { exportAllData } from '../../services/database';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { hapticMedium } from '../../utils/haptics';
import type { ThemeMode } from '../../types';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme, language, currency, setTheme, setLanguage, setCurrency } = useSettingsStore();
  const { biometricsEnabled, biometricsAvailable, biometricsEnrolled, toggleBiometrics, resetAll, checkBiometricAvailability } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bioSwitchLoading, setBioSwitchLoading] = useState(false);

  // Re-check biometrics when screen mounts
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      checkBiometricAvailability();
    }
  }, []);

  const handleExport = async () => {
    try {
      const data = exportAllData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfel_kaucyjny_export_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const { File, Paths } = await import('expo-file-system');
        const { shareAsync } = await import('expo-sharing');
        const file = new File(Paths.cache, `portfel_export_${Date.now()}.json`);
        await file.write(json);
        await shareAsync(file.uri);
      }
      hapticMedium();
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const handleDeleteAll = async () => {
    await resetAll();
    setShowDeleteConfirm(false);
    router.replace('/onboarding');
  };

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: t('settings.themeSystem'), value: 'system' },
    { label: t('settings.themeLight'), value: 'light' },
    { label: t('settings.themeDark'), value: 'dark' },
  ];

  const langOptions = [
    { label: t('settings.langPl'), value: 'pl' },
    { label: t('settings.langEn'), value: 'en' },
    { label: t('settings.langDe'), value: 'de' },
    { label: t('settings.langFr'), value: 'fr' },
    { label: t('settings.langEs'), value: 'es' },
    { label: t('settings.langUk'), value: 'uk' },
    { label: t('settings.langCs'), value: 'cs' },
  ];

  const currencyOptions = [
    { label: 'PLN (zł)', value: 'PLN' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'USD ($)', value: 'USD' },
  ];

  const horizontalPadding = width > 400 ? 20 : 16;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>

        {/* Security */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('settings.security')}</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <SettingRow
            icon="key-outline" label={t('settings.changePin')} colors={colors}
            onPress={() => router.push('/change-pin')}
          />
          {Platform.OS !== 'web' && (
            <Pressable
              style={({ pressed }) => [styles.bioRow, { opacity: pressed ? 0.7 : 1 }]}
              disabled={bioSwitchLoading || !biometricsAvailable}
              onPress={async () => {
                setBioSwitchLoading(true);
                try {
                  const newVal = !biometricsEnabled;
                  if (newVal) {
                    await checkBiometricAvailability();
                  }
                  const ok = await toggleBiometrics(newVal);
                  if (!ok && newVal) {
                    await checkBiometricAvailability();
                  }
                } finally {
                  setBioSwitchLoading(false);
                }
              }}
            >
              <View style={styles.bioRowLeft}>
                <Ionicons name="finger-print-outline" size={20} color={colors.textPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('settings.biometrics')}</Text>
                  {!biometricsAvailable ? (
                    <Text style={styles.bioSubtext}>{t('settings.biometricsNotAvailable')}</Text>
                  ) : !biometricsEnrolled ? (
                    <Text style={[styles.bioSubtext, { color: colors.warning }]}>{t('settings.biometricsNotEnrolled')}</Text>
                  ) : biometricsEnabled ? (
                    <Text style={[styles.bioSubtext, { color: colors.success }]}>{t('settings.biometricsOn')}</Text>
                  ) : (
                    <Text style={styles.bioSubtext}>{t('settings.biometricsOff')}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.bioIndicator, { backgroundColor: biometricsEnabled ? colors.success : colors.textTertiary }]} />
            </Pressable>
          )}
        </View>

        {/* Appearance */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('settings.appearance')}</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('settings.theme')}</Text>
          <View style={styles.optionRow}>
            {themeOptions.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.optionBtn, theme === opt.value && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setTheme(opt.value)}
              >
                <Text style={[styles.optionText, { color: theme === opt.value ? colors.primary : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.cardLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t('settings.language')}</Text>
          <View style={styles.optionRow}>
            {langOptions.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.optionBtn, language === opt.value && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setLanguage(opt.value)}
              >
                <Text style={[styles.optionText, { color: language === opt.value ? colors.primary : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.cardLabel, { color: colors.textSecondary, marginTop: 12 }]}>Waluta</Text>
          <View style={styles.optionRow}>
            {currencyOptions.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.optionBtn, currency === opt.value && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setCurrency(opt.value)}
              >
                <Text style={[styles.optionText, { color: currency === opt.value ? colors.primary : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Data */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('settings.data')}</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <SettingRow icon="download-outline" label={t('settings.exportData')} colors={colors} onPress={handleExport} />
          <SettingRow
            icon="trash-outline" label={t('settings.deleteAll')} colors={colors}
            danger onPress={() => setShowDeleteConfirm(true)}
          />
        </View>

        {/* Info */}
        <Text style={[styles.section, { color: colors.textSecondary }]}>{t('settings.info')}</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{t('settings.version')}</Text>
            <Text style={[styles.rowValue, { color: colors.textTertiary }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={showDeleteConfirm}
        title={t('settings.deleteAll')}
        message={t('settings.deleteAllConfirm')}
        destructive
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, colors, onPress, danger }: {
  icon: string; label: string; colors: any; onPress: () => void; danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <View style={styles.switchLeft}>
        <Ionicons name={icon as any} size={20} color={danger ? colors.error : colors.textPrimary} />
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.textPrimary }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  bioRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  bioRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bioSubtext: { fontSize: 12, color: '#888', marginTop: 2 },
  bioIndicator: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16 },
  cardLabel: { fontSize: 13, paddingHorizontal: 14, paddingTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, padding: 10, paddingTop: 6, flexWrap: 'wrap' },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  optionText: { fontSize: 14, fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  rowValue: { fontSize: 16 },
});
