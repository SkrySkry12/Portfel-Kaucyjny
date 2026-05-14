import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, hapticError } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  error?: string | null;
  maxLength?: number;
  onBiometric?: () => void;
  showBiometric?: boolean;
}

export function PinKeypad({ title, subtitle, onComplete, error, maxLength = 4, onBiometric, showBiometric }: Props) {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const shakeX = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  React.useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error, shakeX]);

  const handlePress = useCallback((digit: string) => {
    hapticLight();
    setPin(prev => {
      if (prev.length >= maxLength) return prev;
      const next = prev + digit;
      if (next.length === maxLength) {
        setTimeout(() => {
          onComplete(next);
          setPin('');
        }, 100);
      }
      return next;
    });
  }, [maxLength, onComplete]);

  const handleDelete = useCallback(() => {
    hapticLight();
    setPin(prev => prev.slice(0, -1));
  }, []);

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

      <Animated.View style={[styles.dotsRow, animStyle]}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length ? colors.primary : 'transparent',
                borderColor: i < pin.length ? colors.primary : colors.textTertiary,
              },
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <View style={styles.keypad}>
        {keys.map((key, i) => {
          if (key === '') {
            if (showBiometric && onBiometric) {
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: pressed ? colors.surfaceElevated : 'transparent' },
                  ]}
                  onPress={onBiometric}
                  accessibilityLabel="Biometrics"
                >
                  <Ionicons name="finger-print-outline" size={30} color={colors.primary} />
                </Pressable>
              );
            }
            return <View key={i} style={styles.keyEmpty} />;
          }
          if (key === 'del') {
            return (
              <Pressable key={i} style={styles.key} onPress={handleDelete} accessibilityLabel="Delete">
                <Ionicons name="backspace-outline" size={28} color={colors.textPrimary} />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? colors.surfaceElevated : 'transparent' },
              ]}
              onPress={() => handlePress(key)}
              accessibilityLabel={key}
            >
              <Text style={[styles.keyText, { color: colors.textPrimary }]}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16, marginTop: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  error: { fontSize: 14, marginBottom: 12 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, gap: 8 },
  key: { width: 80, height: 64, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  keyEmpty: { width: 80, height: 64 },
  keyText: { fontSize: 28, fontWeight: '500' },
});
