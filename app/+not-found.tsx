import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';

export default function NotFound() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>404</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>Strona nie znaleziona</Text>
      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/tabs/home')}>
        <Text style={styles.btnText}>Wr\u00f3\u0107 do ekranu g\u0142\u00f3wnego</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 16, marginBottom: 24 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
