import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, RefreshControl, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCouponStore } from '../../stores/couponStore';
import { GlassCard } from '../../components/GlassCard';
import { BalanceCounter } from '../../components/BalanceCounter';
import { StoreCard } from '../../components/StoreCard';
import { EmptyState } from '../../components/EmptyState';
import { StoreModal } from '../../components/StoreModal';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium } from '../../utils/haptics';
import type { StoreWithStats } from '../../types';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { stores, totalBalance, activeCouponCount, loadStores, loadActiveCoupons, addStore, removeStore } = useCouponStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoreWithStats | null>(null);

  useFocusEffect(useCallback(() => {
    loadStores();
    loadActiveCoupons();
  }, []));

  const filteredStores = search.trim()
    ? (stores ?? []).filter(s => s?.name?.toLowerCase()?.includes(search.toLowerCase()))
    : stores ?? [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStores();
    loadActiveCoupons();
    setTimeout(() => setRefreshing(false), 300);
  }, [loadStores, loadActiveCoupons]);

  const handleAddStore = (name: string): boolean => {
    const result = addStore(name);
    return result !== null;
  };

  // Responsive padding based on screen width
  const horizontalPadding = width > 600 ? 32 : width > 400 ? 20 : 16;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={filteredStores}
        keyExtractor={item => item?.id ?? ''}
        contentContainerStyle={[styles.list, { paddingHorizontal: horizontalPadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <GlassCard gradient style={styles.balanceCard}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>{t('home.totalValue')}</Text>
              <BalanceCounter value={totalBalance} />
              <Text style={[styles.couponCount, { color: colors.textSecondary }]}>
                {activeCouponCount} {t('home.activeCoupons').toLowerCase()}
              </Text>
            </GlassCard>

            <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={t('home.searchPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onPress={() => router.push(`/store/${item?.id}`)}
            onLongPress={() => setDeleteTarget(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title={t('home.noStores')}
            description={t('home.noStoresDesc')}
            actionLabel={t('home.addStore')}
            onAction={() => setStoreModalVisible(true)}
          />
        }
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.9 : 1 }] },
        ]}
        onPress={() => { hapticMedium(); setStoreModalVisible(true); }}
        accessibilityLabel={t('home.addStore')}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>

      <StoreModal
        visible={storeModalVisible}
        onSave={handleAddStore}
        onCancel={() => setStoreModalVisible(false)}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        title={t('common.delete')}
        message={t('home.deleteStoreConfirm', { name: deleteTarget?.name ?? '' })}
        destructive
        onConfirm={() => { if (deleteTarget) removeStore(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingTop: 20, paddingBottom: 100 },
  balanceCard: { marginBottom: 20, alignItems: 'center', paddingVertical: 24 },
  balanceLabel: { fontSize: 14, marginBottom: 4 },
  couponCount: { fontSize: 13, marginTop: 8 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});
