import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  Platform, KeyboardAvoidingView, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useCouponStore } from '../stores/couponStore';
import { StoreModal } from '../components/StoreModal';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticMedium } from '../utils/haptics';

export default function ScannerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { storeId = '', storeName = '' } = useLocalSearchParams<{ storeId: string; storeName: string }>();
  const { stores, addStore, addCoupon, loadStores } = useCouponStore();

  const [selectedStoreId, setSelectedStoreId] = useState(storeId || '');
  const [selectedStoreName, setSelectedStoreName] = useState(storeName || '');
  const [barcode, setBarcode] = useState('');
  const [amount, setAmount] = useState('');
  const [couponNumber, setCouponNumber] = useState('');
  const [error, setError] = useState('');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [cameraLoading, setCameraLoading] = useState(false);

  // Check camera permission on mount
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    (async () => {
      try {
        const { Camera } = await import('expo-camera');
        const { status } = await Camera.getCameraPermissionsAsync();
        if (mounted) setCameraPermission(status === 'granted' ? 'granted' : 'undetermined');
      } catch (e) {
        console.warn('Camera permission check failed:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted' ? 'granted' : 'denied');
      if (status === 'granted') setScanning(true);
    } catch (e) {
      setCameraPermission('denied');
    }
  }, []);

  const handleStartScan = useCallback(async () => {
    if (Platform.OS === 'web') return;
    setCameraLoading(true);
    try {
      if (cameraPermission === 'granted') {
        setScanning(true);
      } else {
        await requestCameraPermission();
      }
    } finally {
      setCameraLoading(false);
    }
  }, [cameraPermission, requestCameraPermission]);

  const handleSave = () => {
    setError('');
    if (!barcode.trim()) { setError(t('scanner.barcodeRequired')); return; }
    if (!selectedStoreId) { setError(t('scanner.storeRequired')); return; }
    const parsedAmount = amount ? parseFloat(amount.replace(',', '.')) : null;
    addCoupon({
      storeId: selectedStoreId,
      amount: parsedAmount,
      barcode: barcode.trim(),
      couponNumber: couponNumber.trim() || null,
    });
    hapticSuccess();
    router.back();
  };

  const handleAddStore = (name: string): boolean => {
    const id = addStore(name);
    if (id) {
      setSelectedStoreId(id);
      setSelectedStoreName(name);
      loadStores();
      return true;
    }
    return false;
  };

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (data) {
      setBarcode(data);
      setScanning(false);
      hapticMedium();
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { if (scanning) { setScanning(false); } else { router.back(); } }} style={styles.backBtn}>
            <Ionicons name={scanning ? 'arrow-back' : 'close'} size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {scanning ? t('scanner.scanBarcode') : t('scanner.title')}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {scanning && Platform.OS !== 'web' ? (
          <BarcodeScanView
            colors={colors}
            t={t}
            onScanned={handleBarcodeScanned}
            onClose={() => setScanning(false)}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {/* Store selector */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.selectStore')}</Text>
            {selectedStoreId ? (
              <Pressable
                style={[styles.storeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}
                onPress={() => setShowStoreSelector(true)}
              >
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                <Text style={[styles.storeChipText, { color: colors.textPrimary }]}>{selectedStoreName}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : (
              <View style={styles.storeButtons}>
                <Pressable
                  style={[styles.selectStoreBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => setShowStoreSelector(true)}
                >
                  <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                  <Text style={[styles.selectStoreTxt, { color: colors.primary }]} numberOfLines={1}>{t('scanner.selectStore')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.selectStoreBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => setShowStoreModal(true)}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={[styles.selectStoreTxt, { color: colors.primary }]} numberOfLines={1}>{t('home.addStore')}</Text>
                </Pressable>
              </View>
            )}

            {/* Barcode field */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.barcode')}</Text>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.input, styles.barcodeInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                value={barcode}
                onChangeText={setBarcode}
                placeholder={t('scanner.barcodePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="default"
              />
              {Platform.OS !== 'web' && (
                <Pressable
                  style={[styles.scanBtn, { backgroundColor: cameraLoading ? colors.textTertiary : colors.primary }]}
                  onPress={handleStartScan}
                  disabled={cameraLoading}
                >
                  {cameraLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="scan-outline" size={22} color="#FFF" />
                  )}
                </Pressable>
              )}
            </View>

            {/* Camera permission denied */}
            {cameraPermission === 'denied' && Platform.OS !== 'web' && (
              <Pressable
                style={[styles.permissionBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}
                onPress={() => Linking.openSettings()}
              >
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  {t('scanner.cameraPermissionDesc')}
                </Text>
              </Pressable>
            )}

            {/* Amount */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.amount')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
              value={amount}
              onChangeText={setAmount}
              placeholder={t('scanner.amountPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />

            {/* Web camera note */}
            {Platform.OS === 'web' && (
              <Text style={[styles.webNote, { color: colors.textTertiary }]}>
                {t('scanner.noCameraWeb')}
              </Text>
            )}

            {/* Coupon number */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('scanner.couponNumber')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
              value={couponNumber}
              onChangeText={setCouponNumber}
              placeholder={t('scanner.couponNumberPlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={22} color="#FFF" />
              <Text style={styles.saveBtnText}>{t('scanner.saveCoupon')}</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Store selector bottom sheet */}
        {showStoreSelector && (
          <StoreSelector
            stores={stores ?? []}
            colors={colors}
            t={t}
            onSelect={(s: { id: string; name: string }) => {
              setSelectedStoreId(s.id);
              setSelectedStoreName(s.name);
              setShowStoreSelector(false);
            }}
            onClose={() => setShowStoreSelector(false)}
            onAddNew={() => { setShowStoreSelector(false); setShowStoreModal(true); }}
          />
        )}

        <StoreModal
          visible={showStoreModal}
          onSave={handleAddStore}
          onCancel={() => setShowStoreModal(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StoreSelector({ stores, colors, t, onSelect, onClose, onAddNew }: any) {
  return (
    <Pressable style={selectorStyles.backdrop} onPress={onClose}>
      <Pressable style={[selectorStyles.sheet, { backgroundColor: colors.surface }]} onPress={(e: any) => e.stopPropagation()}>
        <View style={[selectorStyles.pill, { backgroundColor: colors.textTertiary }]} />
        <Text style={[selectorStyles.title, { color: colors.textPrimary }]}>{t('scanner.selectStore')}</Text>
        <ScrollView style={selectorStyles.list}>
          {(stores ?? []).map((s: any) => (
            <Pressable key={s?.id} style={selectorStyles.item} onPress={() => onSelect(s)}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={[selectorStyles.itemText, { color: colors.textPrimary }]}>{s?.name}</Text>
            </Pressable>
          ))}
          <Pressable style={selectorStyles.item} onPress={onAddNew}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[selectorStyles.itemText, { color: colors.primary }]}>{t('home.addStore')}</Text>
          </Pressable>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function BarcodeScanView({ colors, t, onScanned, onClose }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [CameraViewComponent, setCameraViewComponent] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cameraModule = await import('expo-camera');
        const { status } = await cameraModule.Camera.requestCameraPermissionsAsync();
        if (mounted) {
          setHasPermission(status === 'granted');
          if (status === 'granted') {
            setCameraViewComponent(() => cameraModule.CameraView);
          }
        }
      } catch (e) {
        if (mounted) setHasPermission(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (hasPermission === null) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: '#FFF', marginTop: 16, fontSize: 16 }}>
          {t('scanner.cameraPermission')}...
        </Text>
      </View>
    );
  }

  if (hasPermission === false || !CameraViewComponent) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          {t('scanner.cameraPermission')}
        </Text>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 24, paddingHorizontal: 32 }]}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.saveBtnText}>{t('scanner.grantPermission')}</Text>
        </Pressable>
        <Pressable style={{ marginTop: 16 }} onPress={onClose}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const CamView = CameraViewComponent;

  return (
    <View style={styles.flex}>
      <CamView
        style={styles.flex}
        facing="back"
        onBarcodeScanned={onScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'codabar'] }}
      />
      <Pressable style={[scanStyles.closeBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
        <Ionicons name="close" size={24} color={colors.textPrimary} />
      </Pressable>
      <View style={scanStyles.overlay}>
        <View style={scanStyles.scanArea} />
        <Text style={scanStyles.hint}>{t('scanner.scanBarcode')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { padding: 8, marginLeft: -4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  form: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  barcodeRow: { flexDirection: 'row', gap: 8 },
  barcodeInput: { flex: 1 },
  scanBtn: { width: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  storeChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  storeChipText: { flex: 1, fontSize: 16 },
  storeButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  selectStoreBtn: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12 },
  selectStoreTxt: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  error: { fontSize: 14, marginTop: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  permissionBox: { marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  permissionText: { fontSize: 13, flex: 1 },
  webNote: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
});

const selectorStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  pill: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  list: { maxHeight: 300 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.15)' },
  itemText: { fontSize: 16 },
});

const scanStyles = StyleSheet.create({
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanArea: { width: 280, height: 160, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 16 },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 16, fontWeight: '500' },
});
