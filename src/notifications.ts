import type { CycleEventRow, CycleSettingsRow } from './api.ts';
import { calculatePrePeriodNotificationDate } from './domain.ts';

export const DEFAULT_REMINDER_HOUR = 9;
export const DEFAULT_REMINDER_MINUTE = 0;
export const PRE_PERIOD_NOTIFICATION_TITLE = 'Symptom Story';
export const PRE_PERIOD_NOTIFICATION_BODY = 'A reminder you asked for is ready.';
export const PRE_PERIOD_REMINDER_NOTIFICATION_ID = 'symptom-story-pre-period-reminder';
export const PRE_PERIOD_ANDROID_CHANNEL_ID = 'pre-period-reminders';
export const PRE_PERIOD_NOTIFICATION_DATA = { screen: 'cycle', section: 'support-plan' } as const;
export const FOREGROUND_NOTIFICATION_BEHAVIOR = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
} as const;

export function getPlatformOS(): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    return rn?.Platform?.OS ?? 'node';
  } catch {
    return typeof window !== 'undefined' ? 'web' : 'node';
  }
}

type NotificationsModule = typeof import('expo-notifications');
let notificationsPromise: Promise<NotificationsModule | null> | null = null;

async function getExpoNotifications(): Promise<NotificationsModule | null> {
  const os = getPlatformOS();
  if (os === 'web' || os === 'node') return null;
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').catch(() => null);
  }
  return notificationsPromise;
}

export function getNotificationTargetTimestamp(
  notificationDateStr: string,
  hour = DEFAULT_REMINDER_HOUR,
  minute = DEFAULT_REMINDER_MINUTE,
): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(notificationDateStr);
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day, hour, minute, 0, 0);
}

export async function setupNotificationChannel(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => FOREGROUND_NOTIFICATION_BEHAVIOR,
    });
    if (getPlatformOS() === 'android') {
      await Notifications.setNotificationChannelAsync(PRE_PERIOD_ANDROID_CHANNEL_ID, {
        name: 'Pre-period reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {
    // Ignore channel creation errors on un-supported environments
  }
}

// Automatically configure handler and channel on module import for native platforms
void setupNotificationChannel();

export async function getNotificationPermissionStatus(): Promise<string> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return 'undetermined';
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.status;
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelPrePeriodNotification(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(PRE_PERIOD_REMINDER_NOTIFICATION_ID).catch(() => {});
    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    for (const item of scheduled) {
      if (
        item.identifier === PRE_PERIOD_REMINDER_NOTIFICATION_ID ||
        item.content.data?.screen === 'cycle'
      ) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {});
      }
    }
  } catch {
    // Ignore cancellation errors
  }
}

export async function reconcilePrePeriodNotification(
  settings: CycleSettingsRow | null,
  events: CycleEventRow[],
  nowDate = new Date(),
  mockNotificationClient?: {
    permissionStatus: string;
    scheduledCount: number;
    scheduledTriggerDate: Date | null;
  },
): Promise<boolean> {
  await cancelPrePeriodNotification();
  if (!settings || !settings.tracking_enabled || !settings.reminder_enabled) {
    return false;
  }
  const notificationDateStr = calculatePrePeriodNotificationDate(events, settings.reminder_days_before);
  if (!notificationDateStr) {
    return false;
  }
  const targetTimestamp = getNotificationTargetTimestamp(notificationDateStr);
  if (Number.isNaN(targetTimestamp.getTime()) || targetTimestamp.getTime() <= nowDate.getTime()) {
    return false;
  }
  if (mockNotificationClient) {
    if (mockNotificationClient.permissionStatus !== 'granted') return false;
    mockNotificationClient.scheduledCount++;
    mockNotificationClient.scheduledTriggerDate = targetTimestamp;
    return true;
  }
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    return false;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: PRE_PERIOD_REMINDER_NOTIFICATION_ID,
      content: {
        title: PRE_PERIOD_NOTIFICATION_TITLE,
        body: PRE_PERIOD_NOTIFICATION_BODY,
        data: PRE_PERIOD_NOTIFICATION_DATA,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetTimestamp,
        channelId: getPlatformOS() === 'android' ? PRE_PERIOD_ANDROID_CHANNEL_ID : undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}
