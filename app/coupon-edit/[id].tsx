import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCouponStore } from '../../stores/couponStore';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { GlassCard } from '../../components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess } from '../../utils/haptics';
import type { ChangeHistoryEntry, CouponWithStore } from '../../types';

export default function CouponEditScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { getCouponById, updateCoupon } = useCouponStore();

  const [coupon, setCoupon] = useState<CouponWithStore | null>(null);
  const [amount, setAmount] = useState('');
  const [barcode, setBarcode] = useState('');
  const [couponNumber, setCouponNumber] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    const c = getCouponById(id);
    if (c) {
      setCoupon(c);
      setAmount(c.amount != null ? String(c.amount) : '');
      setBarcode(c.barcode ?? '');
      setCouponNumber(c.couponNumber ?? '');
    }
  }, [id]));

  if (!coupon) return null;

  const changeHistory: ChangeHistoryEntry[] = (() => {
    try { return JSON.parse(coupon.changeHistory ?? '[]') ?? []; } catch { return []; }
  })();

  const hasChanges = () => {
    const newAmt = amount ? parseFloat(amount.replace(',', '.')) : null;
    return (
      (newAmt !== coupon.amount) ||
      (barcode.trim() !== (coupon.barcode ?? '')) ||
      (couponNumber.trim() !== (coupon.couponNumber ?? ''))
    );
  };

  const handleSave = () => {
    if (!hasChanges()) return;
    const newAmt = amount ? parseFloat(amount.replace(',', '.')) : null;
    const entries: ChangeHistoryEntry[] = [...changeHistory];
    const now = new Date().toISOString();

    if (newAmt !== coupon.amount) {
      entries.push({ field: 'amount', oldValue: String(coupon.amount ?? ''), newValue: String(newAmt ?? ''), changedAt: now, biometricVerified: false });
    }
    if (barcode.trim() !== (coupon.barcode ?? '')) {
      entries.push({ field: 'barcode', oldValue: coupon.barcode ?? '', newValue: barcode.trim(), changedAt: now, biometricVerified: false });
    }
    if (couponNumber.trim() !== (coupon.couponNumber ?? '')) {
      entries.push({ field: 'couponNumber', oldValue: coupon.couponNumber ?? '', newValue: couponNumber.trim(), changedAt: now, biometricVerified: false });
    }

    updateCoupon(id, {
      amount: newAmt,
      barcode: barcode.trim(),
      couponNumber: couponNumber.trim() || null,
      modifiedData: JSON.stringify({ amount: newAmt, barcode: barcode.trim(), couponNumber: couponNumber.trim() || null }),
      changeHistory: JSON.stringify(entries),
    });

    hapticSuccess();
    setShowConfirm(false);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('edit.title')}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.amount')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.barcode')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]} value={barcode} onChangeText={setBarcode} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.couponNumber')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]} value={couponNumber} onChangeText={setCouponNumber} />

          {/* Change history */}
          {changeHistory.length > 0 && (
            <Pressable onPress={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
              <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              <Text style={[styles.historyLabel, { color: colors.primary }]}>{t('edit.changeHistory')} ({changeHistory.length})</Text>
            </Pressable>
          )}
          {showHistory && changeHistory.map((entry, i) => (
            <GlassCard key={i} style={styles.historyCard}>
              <Text style={[styles.historyField, { color: colors.textPrimary }]}>{entry.field}</Text>
              <Text style={[styles.historyChange, { color: colors.textSecondary }]}>{entry.oldValue} → {entry.newValue}</Text>
              <Text style={[styles.historyDate, { color: colors.textTertiary }]}>{new Date(entry.changedAt).toLocaleString('pl-PL')}</Text>
            </GlassCard>
          ))}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: hasChanges() ? colors.primary : colors.textTertiary }]}
            onPress={() => hasChanges() ? setShowConfirm(true) : null}
            disabled={!hasChanges()}
          >
            <Text style={styles.saveBtnText}>{t('edit.saveChanges')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet visible={showConfirm} title={t('edit.confirmChanges')} message={t('edit.confirmChangesDesc')} onConfirm={handleSave} onCancel={() => setShowConfirm(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  form: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  historyLabel: { fontSize: 14, fontWeight: '600' },
  historyCard: { marginTop: 8, padding: 12 },
  historyField: { fontSize: 14, fontWeight: '600' },
  historyChange: { fontSize: 13, marginTop: 2 },
  historyDate: { fontSize: 12, marginTop: 4 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
