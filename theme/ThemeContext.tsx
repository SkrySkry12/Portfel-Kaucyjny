import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, type ColorScheme } from './colors';
import type { ThemeMode } from '../types';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DarkColors,
  isDark: true,
  mode: 'system',
});

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const value = useMemo(() => {
    let isDark: boolean;
    if (mode === 'system') {
      isDark = systemScheme === 'dark';
    } else {
      isDark = mode === 'dark';
    }
    return { colors: isDark ? DarkColors : LightColors, isDark, mode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
