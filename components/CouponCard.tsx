import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import type { CouponWithStore } from '../types';
import { hapticLight } from '../utils/haptics';

interface Props {
  coupon: CouponWithStore;
  onPress: () => void;
  onMarkUsed?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function CouponCard({ coupon, onPress, onMarkUsed, onDelete, compact }: Props) {
  const { colors, isDark } = useTheme();
  const currency = useSettingsStore(s => s.currency);
  const isUsed = coupon?.status === 'used';
  const currSymbol = currency === 'PLN' ? 'zł' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity: isUsed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        !isDark && styles.shadow,
      ]}
      onPress={() => { hapticLight(); onPress(); }}
      accessibilityLabel={`Kupon ${coupon?.barcode ?? ''}`}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.store, { color: colors.textSecondary }]} numberOfLines={1}>
            {coupon?.storeName ?? ''}
          </Text>
          <Text style={[styles.amount, { color: colors.textPrimary }]}>
            {coupon?.amount != null ? `${coupon.amount.toFixed(2)} ${currSymbol}` : '—'}
          </Text>
          {!compact && (
            <Text style={[styles.barcode, { color: colors.textTertiary }]} numberOfLines={1}>
              {coupon?.barcode ?? ''}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: isUsed ? colors.textTertiary : colors.success + '20' }]}>
            <Text style={[styles.badgeText, { color: isUsed ? colors.textSecondary : colors.success }]}>
              {isUsed ? '✓' : '●'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, marginRight: 12 },
  store: { fontSize: 13, marginBottom: 2 },
  amount: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  barcode: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  right: { alignItems: 'center', gap: 8 },
  badge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
});
