import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../utils/haptics';
import type { StoreWithStats } from '../types';

interface Props {
  store: StoreWithStats;
  onPress: () => void;
  onLongPress?: () => void;
}

export function StoreCard({ store, onPress, onLongPress }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const currSymbol = currency === 'PLN' ? 'zł' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  const count = store?.couponCount ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        !isDark && styles.shadow,
      ]}
      onPress={() => { hapticLight(); onPress(); }}
      onLongPress={onLongPress}
      accessibilityLabel={store?.name ?? ''}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {store?.name ?? ''}
          </Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {t('common.couponCount', { count })}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {(store?.totalValue ?? 0).toFixed(2)} {currSymbol}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  count: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 4 },
  value: { fontSize: 16, fontWeight: '700' },
});
