import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCouponStore } from '../../stores/couponStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CouponCard } from '../../components/CouponCard';
import { EmptyState } from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import type { CouponWithStore, SortOption } from '../../types';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { usedCoupons, loadUsedCoupons } = useCouponStore();
  const currency = useSettingsStore(s => s.currency);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadUsedCoupons(); }, []));

  const totalRedeemed = (usedCoupons ?? []).reduce((sum, c) => sum + (c?.amount ?? 0), 0);
  const currSymbol = currency === 'PLN' ? 'z\u0142' : currency === 'EUR' ? '\u20ac' : currency === 'USD' ? '$' : currency;

  const sorted = [...(usedCoupons ?? [])].sort((a, b) => {
    if (sortBy === 'amount') return (b?.amount ?? 0) - (a?.amount ?? 0);
    if (sortBy === 'store') return (a?.storeName ?? '').localeCompare(b?.storeName ?? '');
    return (b?.usedAt ?? '').localeCompare(a?.usedAt ?? '');
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsedCoupons();
    setTimeout(() => setRefreshing(false), 300);
  }, [loadUsedCoupons]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('history.title')}</Text>
        <Text style={[styles.redeemed, { color: colors.textSecondary }]}>
          {t('history.totalRedeemed')}: {totalRedeemed.toFixed(2)} {currSymbol}
        </Text>
      </View>

      <View style={styles.sortRow}>
        {(['date', 'amount', 'store'] as SortOption[]).map(opt => (
          <Pressable
            key={opt}
            style={[styles.sortBtn, sortBy === opt && { backgroundColor: colors.primary + '20' }]}
            onPress={() => setSortBy(opt)}
          >
            <Text style={[styles.sortText, { color: sortBy === opt ? colors.primary : colors.textSecondary }]}>
              {t(`history.sort${opt.charAt(0).toUpperCase() + opt.slice(1)}` as any)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item?.id ?? ''}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <CouponCard coupon={item} onPress={() => router.push(`/coupon/${item?.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState icon="time-outline" title={t('history.empty')} description={t('history.emptyDesc')} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  redeemed: { fontSize: 14 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  sortText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 100 },
});
