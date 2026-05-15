import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCouponStore } from '../../stores/couponStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { BarcodeView } from '../../components/BarcodeView';
import { GlassCard } from '../../components/GlassCard';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticHeavy } from '../../utils/haptics';
import type { CouponWithStore } from '../../types';

export default function CouponDetailScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { getCouponById, markAsUsed, restoreCoupon, deleteCoupon, getCouponsByStore } = useCouponStore();
  const currency = useSettingsStore(s => s.currency);
  const currSymbol = currency === 'PLN' ? 'z\u0142' : currency === 'EUR' ? '\u20ac' : currency === 'USD' ? '$' : currency;

  const [coupon, setCoupon] = useState<CouponWithStore | null>(null);
  const [showUsedConfirm, setShowUsedConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fullscreenBarcode, setFullscreenBarcode] = useState(false);

  const reload = useCallback(() => {
    if (!id) return;
    const c = getCouponById(id);
    setCoupon(c);
  }, [id, getCouponById]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!coupon) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: colors.textSecondary }]}>{t('coupon.noCoupon')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isUsed = coupon.status === 'used';
  // Responsive barcode size
  const barcodeWidth = Math.min(width - 64, 340);
  const barcodeHeight = Math.round(barcodeWidth * 0.35);

  const handleMarkUsed = () => {
    markAsUsed(id);
    hapticSuccess();
    setShowUsedConfirm(false);
    reload();
  };

  const handleRestore = () => {
    restoreCoupon(id);
    hapticSuccess();
    setShowRestoreConfirm(false);
    reload();
  };

  const handleDelete = () => {
    deleteCoupon(id);
    hapticHeavy();
    setShowDeleteConfirm(false);
    router.back();
  };

  const handleNext = () => {
    const siblings = getCouponsByStore(coupon.storeId, 'active');
    const idx = siblings.findIndex(c => c?.id === id);
    const next = siblings[(idx + 1) % (siblings.length || 1)];
    if (next?.id && next.id !== id) {
      router.replace(`/coupon/${next.id}`);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    try { return new Date(d).toLocaleDateString('pl-PL'); } catch { return d; }
  };

  const daysUntilExpiry = coupon.expiresAt
    ? Math.ceil((new Date(coupon.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const expiryColor = daysUntilExpiry !== null
    ? daysUntilExpiry <= 0 ? colors.error
    : daysUntilExpiry <= 3 ? colors.warning
    : daysUntilExpiry <= 7 ? '#E6A817'
    : colors.success
    : colors.textSecondary;

  const expiryLabel = daysUntilExpiry !== null
    ? daysUntilExpiry <= 0 ? t('coupon.expired')
    : daysUntilExpiry === 1 ? t('coupon.expiresIn1Day')
    : t('coupon.expiresInDays', { count: daysUntilExpiry })
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('coupon.details')}</Text>
        {!isUsed && (
          <Pressable onPress={() => router.push(`/coupon-edit/${id}`)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: width > 400 ? 20 : 16 }]}>
        {/* Store tag */}
        <View style={[styles.storeTag, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="storefront-outline" size={16} color={colors.primary} />
          <Text style={[styles.storeTagText, { color: colors.primary }]}>{coupon.storeName}</Text>
        </View>

        {/* Amount display */}
        {coupon.amount != null && (
          <Text style={[styles.bigAmount, { color: colors.textPrimary }]}>
            {coupon.amount.toFixed(2)} {currSymbol}
          </Text>
        )}

        {/* Expiry badge */}
        {!isUsed && expiryLabel && (
          <View style={[styles.expiryBadge, { backgroundColor: expiryColor + '18', borderColor: expiryColor + '40' }]}>
            <Ionicons name={daysUntilExpiry !== null && daysUntilExpiry <= 3 ? 'warning-outline' : 'time-outline'} size={16} color={expiryColor} />
            <Text style={[styles.expiryBadgeText, { color: expiryColor }]}>{expiryLabel}</Text>
          </View>
        )}

        {/* Barcode */}
        <Pressable onPress={() => setFullscreenBarcode(true)} style={styles.barcodeContainer}>
          <BarcodeView value={coupon.barcode} width={barcodeWidth} height={barcodeHeight} />
          <Text style={[styles.barcodeText, { color: colors.textPrimary }]}>
            {coupon.barcode}
          </Text>
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>
            {t('coupon.fullscreenBarcode')}
          </Text>
        </Pressable>

        {/* Details */}
        <GlassCard style={styles.detailsCard}>
          {coupon.couponNumber ? <DetailRow label={t('coupon.couponNumber')} value={coupon.couponNumber} colors={colors} /> : null}
          <DetailRow label={t('coupon.dateAdded')} value={formatDate(coupon.dateAdded)} colors={colors} />
          {coupon.expiresAt && <DetailRow label={t('coupon.expiresAt')} value={formatDate(coupon.expiresAt)} colors={colors} valueColor={expiryColor} />}
          {isUsed && <DetailRow label={t('coupon.dateUsed')} value={formatDate(coupon.usedAt)} colors={colors} />}
          <DetailRow
            label={t('coupon.status')}
            value={isUsed ? t('common.used') : t('common.active')}
            colors={colors}
            valueColor={isUsed ? colors.textTertiary : colors.success}
          />
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          {!isUsed ? (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowUsedConfirm(true)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('coupon.markAsUsed')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowRestoreConfirm(true)}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('coupon.restore')}</Text>
            </Pressable>
          )}

          {!isUsed && (
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleNext}
            >
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>{t('coupon.nextCoupon')}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <Pressable style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(true)}>
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('coupon.deleteCoupon')}</Text>
        </Pressable>
      </ScrollView>

      {/* Fullscreen barcode modal */}
      <Modal visible={fullscreenBarcode} animationType="fade" onRequestClose={() => setFullscreenBarcode(false)}>
        <Pressable style={styles.fullscreenBg} onPress={() => setFullscreenBarcode(false)}>
          <View style={styles.fullscreenBarcode}>
            <BarcodeView value={coupon.barcode} width={Math.min(width - 40, 380)} height={160} />
            <Text style={styles.fullscreenText}>{coupon.barcode}</Text>
            {coupon.amount != null && (
              <Text style={styles.fullscreenAmount}>{coupon.amount.toFixed(2)} {currSymbol}</Text>
            )}
          </View>
        </Pressable>
      </Modal>

      <ConfirmSheet visible={showUsedConfirm} title={t('coupon.markAsUsed')} message={t('coupon.markAsUsedConfirm')} onConfirm={handleMarkUsed} onCancel={() => setShowUsedConfirm(false)} />
      <ConfirmSheet visible={showRestoreConfirm} title={t('coupon.restore')} message={t('coupon.restoreConfirm')} onConfirm={handleRestore} onCancel={() => setShowRestoreConfirm(false)} />
      <ConfirmSheet visible={showDeleteConfirm} title={t('coupon.deleteCoupon')} message={t('coupon.deleteConfirm')} destructive onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />
    </SafeAreaView>
  );
}

function DetailRow({ label, value, colors, valueColor }: { label: string; value: string; colors: any; valueColor?: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.1)' },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { padding: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16 },
  content: { paddingBottom: 40 },
  storeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 12 },
  storeTagText: { fontSize: 14, fontWeight: '600' },
  bigAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  expiryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  expiryBadgeText: { fontSize: 13, fontWeight: '600' },
  barcodeContainer: { alignItems: 'center', marginBottom: 20 },
  barcodeText: { fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), marginTop: 8 },
  tapHint: { fontSize: 12, marginTop: 4 },
  detailsCard: { marginBottom: 20 },
  actions: { gap: 12, marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { fontSize: 15 },
  fullscreenBg: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  fullscreenBarcode: { alignItems: 'center', padding: 20 },
  fullscreenText: { fontSize: 18, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), marginTop: 16, color: '#000' },
  fullscreenAmount: { fontSize: 24, fontWeight: 'bold', marginTop: 12, color: '#000' },
});
