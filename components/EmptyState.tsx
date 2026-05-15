import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={(icon as any) ?? 'folder-open-outline'} size={64} color={colors.textTertiary} />
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: colors.textTertiary }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, minHeight: 200 },
  title: { fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  desc: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  btn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
