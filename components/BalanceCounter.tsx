import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming, useDerivedValue } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface Props {
  value: number;
}

export function BalanceCounter({ value }: Props) {
  const { colors } = useTheme();
  const currency = useSettingsStore(s => s.currency);
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(value ?? 0, { duration: 800 });
  }, [value, animValue]);

  const displayValue = useDerivedValue(() => {
    return animValue.value.toFixed(2);
  });

  // For React Native, animated text is tricky. Use a simpler approach:
  // Display the target value formatted.
  const formatted = (value ?? 0).toFixed(2);
  const currSymbol = currency === 'PLN' ? 'zł' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

  return (
    <Text style={[styles.balance, { color: colors.textPrimary }]}>
      {formatted} <Text style={styles.currency}>{currSymbol}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 36, fontWeight: 'bold' },
  currency: { fontSize: 24, fontWeight: '600' },
});
