import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { hapticLight, hapticMedium } from '../utils/haptics';

const SUGGESTED = ['Biedronka', 'Lidl', '\u017babka', 'Kaufland', 'Auchan', 'Carrefour', 'Netto', 'Dino', 'Rossmann', 'Pepco'];

interface Props {
  visible: boolean;
  editStore?: { id: string; name: string } | null;
  onSave: (name: string) => boolean | void;
  onCancel: () => void;
}

export function StoreModal({ visible, editStore, onSave, onCancel }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(editStore?.name ?? '');
      setError('');
    }
  }, [visible, editStore]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(t('store.storeName')); return; }
    const result = onSave(trimmed);
    if (result === false) {
      setError(t('store.duplicateName'));
    } else {
      hapticMedium();
      onCancel();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={() => { Keyboard.dismiss(); onCancel(); }}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.pill, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {editStore ? t('store.editStore') : t('store.newStore')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: error ? colors.error : colors.border }]}
              value={name}
              onChangeText={v => { setName(v); setError(''); }}
              placeholder={t('store.storeNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

            {!editStore && (
              <View style={styles.suggestedSection}>
                <Text style={[styles.suggestedLabel, { color: colors.textSecondary }]}>{t('store.suggested')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {SUGGESTED.map(s => (
                    <Pressable
                      key={s}
                      style={[styles.chip, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => { hapticLight(); setName(s); setError(''); }}
                    >
                      <Text style={[styles.chipText, { color: colors.textPrimary }]}>{s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.buttons}>
              <Pressable style={[styles.btn, { backgroundColor: colors.surfaceElevated }]} onPress={onCancel}>
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  pill: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  errorText: { fontSize: 13, marginBottom: 8, marginLeft: 4 },
  suggestedSection: { marginTop: 12 },
  suggestedLabel: { fontSize: 13, marginBottom: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipText: { fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '600' },
});
