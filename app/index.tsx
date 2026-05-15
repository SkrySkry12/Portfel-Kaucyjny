import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isInitialized, isFirstLaunch, isLocked } = useAuthStore();

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  if (isFirstLaunch) return <Redirect href="/onboarding" />;
  if (isLocked) return <Redirect href="/lock" />;
  return <Redirect href="/tabs/home" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0F1A' },
});
