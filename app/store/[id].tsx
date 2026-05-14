import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCouponStore } from '../../stores/couponStore';
import { CouponCard } from '../../components/CouponCard';
import { EmptyState } from '../../components/EmptyState';
import { StoreModal } from '../../components/StoreModal';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { getStoreById } from '../../services/database';
import type { CouponWithStore } from '../../types';

export default function StoreDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { getCouponsByStore, removeStore, editStore, markAsUsed, deleteCoupon, refreshAll } = useCouponStore();
  const currency = useSettingsStore(s => s.currency);
  const currSymbol = currency === 'PLN' ? 'z\u0142' : currency === 'EUR' ? '\u20ac' : currency === 'USD' ? '$' : currency;

  const [tab, setTab] = useState<'active' | 'used'>('active');
  const [coupons, setCoupons] = useState<CouponWithStore[]>([]);
  const [storeName, setStoreName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const reload = useCallback(() => {
    if (!id) return;
    const store = getStoreById(id);
    setStoreName(store?.name ?? '');
    const list = getCouponsByStore(id, tab);
    setCoupons(list);
  }, [id, tab, getCouponsByStore]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const totalValue = (coupons ?? []).reduce((s, c) => s + (c?.amount ?? 0), 0);
  const horizontalPadding = width > 400 ? 16 : 12;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload();
    setTimeout(() => setRefreshing(false), 300);
  }, [reload]);

  const handleEditStore = (name: string): boolean => {
    const ok = editStore(id, name);
    if (ok) {
      setStoreName(name);
      reload();
    }
    return ok;
  };

  const handleDeleteStore = () => {
    removeStore(id);
    setDeleteConfirm(false);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{storeName}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {totalValue.toFixed(2)} {currSymbol}
          </Text>
        </View>
        <Pressable onPress={() => setEditModalVisible(true)} hitSlop={8}>
          <Ionicons name="pencil-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['active', 'used'] as const).map(t2 => (
          <Pressable
            key={t2}
            style={[styles.tab, tab === t2 && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t2)}
          >
            <Text style={[styles.tabText, { color: tab === t2 ? colors.primary : colors.textTertiary }]}>
              {t(`store.${t2 === 'active' ? 'activeCoupons' : 'usedCoupons'}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={coupons ?? []}
        keyExtractor={item => item?.id ?? ''}
        contentContainerStyle={[styles.list, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <CouponCard
            coupon={item}
            onPress={() => router.push(`/coupon/${item?.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="ticket-outline"
            title={t('store.noCoupons')}
            description={t('store.noCouponsDesc')}
            actionLabel={tab === 'active' ? t('store.scanCoupon') : undefined}
            onAction={tab === 'active' ? () => router.push({ pathname: '/scanner', params: { storeId: id, storeName } }) : undefined}
          />
        }
      />

      {/* FAB for adding coupons */}
      {tab === 'active' && (
        <Pressable
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.9 : 1 }] }]}
          onPress={() => router.push({ pathname: '/scanner', params: { storeId: id, storeName } })}
          accessibilityLabel={t('store.scanCoupon')}
        >
          <Ionicons name="scan-outline" size={24} color="#FFF" />
        </Pressable>
      )}

      <StoreModal
        visible={editModalVisible}
        editStore={{ id, name: storeName }}
        onSave={handleEditStore}
        onCancel={() => setEditModalVisible(false)}
      />

      <ConfirmSheet
        visible={deleteConfirm}
        title={t('common.delete')}
        message={t('home.deleteStoreConfirm', { name: storeName })}
        destructive
        onConfirm={handleDeleteStore}
        onCancel={() => setDeleteConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { padding: 8, marginLeft: -4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerSub: { fontSize: 14 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.15)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  list: { paddingTop: 16, paddingBottom: 100 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});
