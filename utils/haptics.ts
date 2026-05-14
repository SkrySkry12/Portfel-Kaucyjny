import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticLight(): void {
  if (Platform.OS === 'web') return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
}

export function hapticMedium(): void {
  if (Platform.OS === 'web') return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}

export function hapticHeavy(): void {
  if (Platform.OS === 'web') return;
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
}

export function hapticSuccess(): void {
  if (Platform.OS === 'web') return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
}

export function hapticError(): void {
  if (Platform.OS === 'web') return;
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
}
