import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCouponStore } from '../stores/couponStore';
import { initDatabase } from '../services/database';
import '../services/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { isInitialized, isFirstLaunch, isLocked, handleAppStateChange } = useAuthStore();
  const appState = useRef(AppState.currentState);
  const hasNavigated = useRef(false);

  // Auto-lock listener
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      handleAppStateChange(nextState);
      appState.current = nextState;
    });
    return () => sub?.remove?.();
  }, [handleAppStateChange]);

  // Auth-based navigation — runs whenever auth state or current route changes
  useEffect(() => {
    if (!isInitialized) return;

    const currentSegment = segments?.[0];
    const inOnboarding = currentSegment === 'onboarding';
    const inLock = currentSegment === 'lock';

    // Small delay on first navigation to let Stack mount
    const delay = hasNavigated.current ? 0 : 150;
    const timer = setTimeout(() => {
      try {
        if (isFirstLaunch && !inOnboarding) {
          router.replace('/onboarding');
        } else if (!isFirstLaunch && isLocked && !inLock) {
          router.replace('/lock');
        } else if (!isFirstLaunch && !isLocked && (inLock || inOnboarding)) {
          router.replace('/tabs/home');
        }
      } catch (e) {
        console.warn('Navigation error:', e);
      }
      hasNavigated.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [isInitialized, isFirstLaunch, isLocked, segments]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="lock" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="store/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="coupon/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="coupon-edit/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="change-pin" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const theme = useSettingsStore(s => s.theme);
  const initialize = useAuthStore(s => s.initialize);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const refreshAll = useCouponStore(s => s.refreshAll);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        initDatabase();
        loadSettings();
        await initialize();
        refreshAll();
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        if (mounted) SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider mode={theme}>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
