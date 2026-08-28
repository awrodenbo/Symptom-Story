import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CycleEventRow, CycleSettingsRow } from '../src/api.ts';
import { calculatePrePeriodNotificationDate } from '../src/domain.ts';
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  FOREGROUND_NOTIFICATION_BEHAVIOR,
  PRE_PERIOD_NOTIFICATION_BODY,
  PRE_PERIOD_NOTIFICATION_DATA,
  PRE_PERIOD_NOTIFICATION_TITLE,
  PRE_PERIOD_REMINDER_NOTIFICATION_ID,
  cancelPrePeriodNotification,
  getNotificationTargetTimestamp,
  reconcilePrePeriodNotification,
} from '../src/notifications.ts';

const baseSettings: CycleSettingsRow = {
  user_id: 'user-1',
  tracking_enabled: true,
  birth_control_tracking_enabled: false,
  intimacy_tracking_enabled: false,
  ttc_features_enabled: false,
  reminder_enabled: true,
  reminder_days_before: 7,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// History with 3 completed 28-day cycles ending 2026-08-01.
// Next estimated start is 2026-08-29.
// With 7 days before, notification date is 2026-08-22.
const usableEvents: CycleEventRow[] = [
  { id: '1', user_id: 'user-1', event_type: 'period_start', event_date: '2026-05-10', occurred_at: '2026-05-10T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
  { id: '2', user_id: 'user-1', event_type: 'period_start', event_date: '2026-06-07', occurred_at: '2026-06-07T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
  { id: '3', user_id: 'user-1', event_type: 'period_start', event_date: '2026-07-05', occurred_at: '2026-07-05T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
  { id: '4', user_id: 'user-1', event_type: 'period_start', event_date: '2026-08-01', occurred_at: '2026-08-01T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
];

test('reminder-date calculation subtracts reminder_days_before from estimated date', () => {
  const date = calculatePrePeriodNotificationDate(usableEvents, 7);
  assert.equal(date, '2026-08-22');

  const date5 = calculatePrePeriodNotificationDate(usableEvents, 5);
  assert.equal(date5, '2026-08-24');

  // Invalid reminder range returns null
  assert.equal(calculatePrePeriodNotificationDate(usableEvents, 0), null);
  assert.equal(calculatePrePeriodNotificationDate(usableEvents, 15), null);
  assert.equal(calculatePrePeriodNotificationDate(usableEvents, 7.5), null);
});

test('insufficient-history behavior returns null and does not produce a notification date', () => {
  const singleEvent: CycleEventRow[] = [
    { id: '1', user_id: 'user-1', event_type: 'period_start', event_date: '2026-08-01', occurred_at: '2026-08-01T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
  ];
  assert.equal(calculatePrePeriodNotificationDate([], 7), null);
  assert.equal(calculatePrePeriodNotificationDate(singleEvent, 7), null);
});

test('getNotificationTargetTimestamp uses default 9:00 AM local time', () => {
  const target = getNotificationTargetTimestamp('2026-08-22');
  assert.equal(target.getFullYear(), 2026);
  assert.equal(target.getMonth(), 7); // 0-indexed August
  assert.equal(target.getDate(), 22);
  assert.equal(target.getHours(), DEFAULT_REMINDER_HOUR);
  assert.equal(target.getMinutes(), DEFAULT_REMINDER_MINUTE);
});

test('privacy-safe notification content and payload structure', () => {
  assert.equal(PRE_PERIOD_NOTIFICATION_TITLE, 'Symptom Story');
  assert.equal(PRE_PERIOD_NOTIFICATION_BODY, 'A reminder you asked for is ready.');
  assert.deepEqual(PRE_PERIOD_NOTIFICATION_DATA, { screen: 'cycle', section: 'support-plan' });

  // Verify no sensitive health terms exist in body or payload data
  const bodyAndData = `${PRE_PERIOD_NOTIFICATION_BODY} ${JSON.stringify(PRE_PERIOD_NOTIFICATION_DATA)}`;
  assert.equal(/period|bleeding|flow|pregnant|ovulation|fertility|medication|intimacy|sperm/i.test(bodyAndData), false);
});

test('past or today target date does not schedule a notification', async () => {
  // If target date is 2026-08-22 at 09:00 AM, and now is 2026-08-23, target is in past
  const nowInFuture = new Date(2026, 7, 23, 10, 0, 0);
  const scheduled = await reconcilePrePeriodNotification(baseSettings, usableEvents, nowInFuture);
  assert.equal(scheduled, false);
});

test('disabling reminders or tracking cancels pending notification', async () => {
  const disabledReminderSettings: CycleSettingsRow = { ...baseSettings, reminder_enabled: false };
  const disabledTrackingSettings: CycleSettingsRow = { ...baseSettings, tracking_enabled: false };
  const nowBeforeTarget = new Date(2026, 7, 10, 9, 0, 0);

  const res1 = await reconcilePrePeriodNotification(disabledReminderSettings, usableEvents, nowBeforeTarget);
  assert.equal(res1, false);

  const res2 = await reconcilePrePeriodNotification(disabledTrackingSettings, usableEvents, nowBeforeTarget);
  assert.equal(res2, false);
});

test('permission denial prevents scheduling', async () => {
  const nowBeforeTarget = new Date(2026, 7, 10, 9, 0, 0);
  const mockClient = { permissionStatus: 'denied', scheduledCount: 0, scheduledTriggerDate: null };
  const scheduled = await reconcilePrePeriodNotification(baseSettings, usableEvents, nowBeforeTarget, mockClient);
  assert.equal(scheduled, false);
  assert.equal(mockClient.scheduledCount, 0);
});

test('granted permission schedules notification and cycle change reschedules to new date', async () => {
  const nowBeforeTarget = new Date(2026, 7, 10, 9, 0, 0);
  const mockClient = { permissionStatus: 'granted', scheduledCount: 0, scheduledTriggerDate: null as Date | null };

  const scheduled = await reconcilePrePeriodNotification(baseSettings, usableEvents, nowBeforeTarget, mockClient);
  assert.equal(scheduled, true);
  assert.equal(mockClient.scheduledCount, 1);
  assert.equal(mockClient.scheduledTriggerDate?.getFullYear(), 2026);
  assert.equal(mockClient.scheduledTriggerDate?.getMonth(), 7); // August
  assert.equal(mockClient.scheduledTriggerDate?.getDate(), 22);

  // When a new period start is added on 2026-08-29 (moving next period to 2026-09-26 and 7-day reminder to 2026-09-19)
  const updatedEvents: CycleEventRow[] = [
    ...usableEvents,
    { id: '5', user_id: 'user-1', event_type: 'period_start', event_date: '2026-08-29', occurred_at: '2026-08-29T08:00:00Z', flow_level: null, created_at: '', updated_at: '' },
  ];

  const rescheduled = await reconcilePrePeriodNotification(baseSettings, updatedEvents, nowBeforeTarget, mockClient);
  assert.equal(rescheduled, true);
  assert.equal(mockClient.scheduledCount, 2);
  assert.equal(mockClient.scheduledTriggerDate?.getDate(), 19);
  assert.equal(mockClient.scheduledTriggerDate?.getMonth(), 8); // September
});

test('foreground notification behavior suppresses intrusive banners, sounds, badges, and lists while active', () => {
  assert.deepEqual(FOREGROUND_NOTIFICATION_BEHAVIOR, {
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  });
});
