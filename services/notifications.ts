import { Platform } from 'react-native';
import * as db from './database';
import type { CouponWithStore } from '../types';

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch {
      return null;
    }
  }
  return Notifications;
}

/**
 * Request notification permissions (iOS needs explicit ask, Android auto-grants)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const notif = await getNotifications();
  if (!notif) return false;

  try {
    const { status: existing } = await notif.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await notif.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === 'granted';
  } catch (e) {
    console.warn('Notification permission error:', e);
    return false;
  }
}

/**
 * Setup notification handler (how to display when app is in foreground)
 */
export async function setupNotificationHandler(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  notif.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Cancel all scheduled notifications and reschedule based on current coupons
 */
export async function scheduleExpiryNotifications(): Promise<void> {
  const notif = await getNotifications();
  if (!notif) return;

  try {
    // Check if user granted permission — if not, don't schedule
    const { status } = await notif.getPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel all existing scheduled notifications
    await notif.cancelAllScheduledNotificationsAsync();

    // Get coupons expiring in next 30 days
    let expiringCoupons: CouponWithStore[] = [];
    try {
      expiringCoupons = db.getExpiringCoupons(30);
    } catch {
      return;
    }

    for (const coupon of expiringCoupons) {
      if (!coupon.expiresAt) continue;

      const expiresDate = new Date(coupon.expiresAt);
      const now = new Date();

      // Days until expiry
      const msUntilExpiry = expiresDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

      const storeName = coupon.storeName || '?';
      const amountStr = coupon.amount ? `${coupon.amount.toFixed(2)} zł` : '';

      // Notification 3 days before expiry
      if (daysUntilExpiry > 3) {
        const threeDaysBefore = new Date(expiresDate.getTime() - 3 * 24 * 60 * 60 * 1000);
        threeDaysBefore.setHours(10, 0, 0, 0);

        if (threeDaysBefore > now) {
          await notif.scheduleNotificationAsync({
            content: {
              title: '⏰ Kupon wygasa za 3 dni!',
              body: `Kupon ${storeName}${amountStr ? ` (${amountStr})` : ''} wygasa ${formatDate(expiresDate)}. Wykorzystaj go!`,
              data: { couponId: coupon.id, type: 'expiry_warning' },
              sound: true,
            },
            trigger: {
              type: notif.SchedulableTriggerInputTypes.DATE,
              date: threeDaysBefore,
            },
          });
        }
      }

      // Notification 1 day before expiry
      if (daysUntilExpiry > 1) {
        const oneDayBefore = new Date(expiresDate.getTime() - 1 * 24 * 60 * 60 * 1000);
        oneDayBefore.setHours(10, 0, 0, 0);

        if (oneDayBefore > now) {
          await notif.scheduleNotificationAsync({
            content: {
              title: '🔴 Kupon wygasa jutro!',
              body: `Kupon ${storeName}${amountStr ? ` (${amountStr})` : ''} wygasa jutro! Nie zapomnij go wykorzystać.`,
              data: { couponId: coupon.id, type: 'expiry_urgent' },
              sound: true,
            },
            trigger: {
              type: notif.SchedulableTriggerInputTypes.DATE,
              date: oneDayBefore,
            },
          });
        }
      }

      // Notification on expiry day
      if (daysUntilExpiry > 0) {
        const expiryMorning = new Date(expiresDate);
        expiryMorning.setHours(9, 0, 0, 0);

        if (expiryMorning > now) {
          await notif.scheduleNotificationAsync({
            content: {
              title: '❌ Kupon wygasa dzisiaj!',
              body: `Kupon ${storeName}${amountStr ? ` (${amountStr})` : ''} wygasa DZISIAJ! Ostatnia szansa.`,
              data: { couponId: coupon.id, type: 'expiry_today' },
              sound: true,
            },
            trigger: {
              type: notif.SchedulableTriggerInputTypes.DATE,
              date: expiryMorning,
            },
          });
        }
      }
    }
  } catch (e) {
    console.warn('Error scheduling notifications:', e);
  }
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}
