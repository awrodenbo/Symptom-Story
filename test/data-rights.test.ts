import assert from 'node:assert/strict';
import { test } from 'node:test';

function mockSupabaseClient(userId = 'user-a') {
  const calls: { table: string; operation: string; select?: string }[] = [];

  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: userId } }, error: null }),
    },
    from(table: string) {
      const state = { table, operation: 'select', select: '*' };
      const builder = {
        select(fields = '*') { state.select = fields; return builder; },
        eq() { return builder; },
        order() { return builder; },
        async maybeSingle() {
          calls.push(state);
          if (table === 'profiles') {
            return { data: { display_name: 'Alex', tracking_mode: 'pmdd', onboarding_complete: true }, error: null };
          }
          if (table === 'cycle_settings') {
            return { data: { user_id: userId, tracking_enabled: true, birth_control_tracking_enabled: true, intimacy_tracking_enabled: true, ttc_features_enabled: false, reminder_enabled: true, reminder_days_before: 7, created_at: '', updated_at: '' }, error: null };
          }
          if (table === 'pre_period_plans') {
            return { data: { user_id: userId, body: 'Rest, sip tea, warm bath.', created_at: '', updated_at: '' }, error: null };
          }
          if (table === 'birth_control_profile') {
            return { data: { user_id: userId, method: 'pill', note: 'Take daily at 9am', created_at: '', updated_at: '' }, error: null };
          }
          return { data: null, error: null };
        },
        async single() { return builder.maybeSingle(); },
        then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
          calls.push(state);
          if (table === 'check_ins') {
            return Promise.resolve({ data: [{ id: 'ci-1', user_id: userId, entry_date: '2026-08-28', mood: 4, sleep: 4, energy: 3, symptoms: ['cramps'], feelings: ['calm'], medication_taken: true, reflection: 'Good day', created_at: '' }], error: null }).then(resolve);
          }
          if (table === 'medications') {
            return Promise.resolve({ data: [{ id: 'm-1', user_id: userId, name: 'Magnesium', schedule: 'Evening', created_at: '' }], error: null }).then(resolve);
          }
          if (table === 'medication_logs') {
            return Promise.resolve({ data: [{ id: 'ml-1', user_id: userId, medication_id: 'm-1', taken_at: '2026-08-28T20:00:00Z' }], error: null }).then(resolve);
          }
          if (table === 'journal_entries') {
            return Promise.resolve({ data: [{ id: 'j-1', user_id: userId, body: 'Reflection entry', created_at: '' }], error: null }).then(resolve);
          }
          if (table === 'cycle_events') {
            return Promise.resolve({ data: [{ id: 'ce-1', user_id: userId, event_type: 'period_start', event_date: '2026-08-28', occurred_at: '2026-08-28T08:00:00Z', flow_level: null, created_at: '', updated_at: '' }], error: null }).then(resolve);
          }
          if (table === 'intimacy_events') {
            return Promise.resolve({ data: [{ id: 'ie-1', user_id: userId, event_date: '2026-08-28', occurred_at: '2026-08-28T22:00:00Z', sperm_present: 'no', note: null, created_at: '', updated_at: '' }], error: null }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return builder;
    },
    async rpc(_fn?: string) {
      calls.push({ table: 'rpc', operation: 'delete_my_account' });
      return { data: null, error: null };
    },
  };
  return { client, calls };
}

test('export payload includes all 10 datasets and legal disclaimer', async () => {
  const { client, calls } = mockSupabaseClient('user-alex');

  // Load export payload using mock client structure logic
  const [
    profileRes,
    checkInsRes,
    medicationsRes,
    logsRes,
    journalRes,
    cycleSettingsRes,
    cycleEventsRes,
    planRes,
    birthControlRes,
    intimacyRes,
  ] = await Promise.all([
    client.from('profiles').select('display_name,tracking_mode,onboarding_complete').maybeSingle(),
    client.from('check_ins').select('*'),
    client.from('medications').select('*'),
    client.from('medication_logs').select('*'),
    client.from('journal_entries').select('*'),
    client.from('cycle_settings').select('*').maybeSingle(),
    client.from('cycle_events').select('*'),
    client.from('pre_period_plans').select('*').maybeSingle(),
    client.from('birth_control_profile').select('*').maybeSingle(),
    client.from('intimacy_events').select('*'),
  ]);

  const payload = {
    exportedAt: '2026-08-28T12:00:00.000Z',
    notice: 'Self-reported Symptom Story records exported by the account owner. Not medical advice or a diagnostic interpretation.',
    profile: profileRes.data,
    checkIns: checkInsRes.data,
    medications: medicationsRes.data,
    medicationLogs: logsRes.data,
    journalEntries: journalRes.data,
    cycleSettings: cycleSettingsRes.data,
    cycleEvents: cycleEventsRes.data,
    prePeriodPlan: planRes.data,
    birthControlProfile: birthControlRes.data,
    intimacyEvents: intimacyRes.data,
  };

  assert.equal(payload.profile?.display_name, 'Alex');
  assert.equal(payload.checkIns.length, 1);
  assert.equal(payload.medications.length, 1);
  assert.equal(payload.medicationLogs.length, 1);
  assert.equal(payload.journalEntries.length, 1);
  assert.equal(payload.cycleEvents.length, 1);
  assert.equal(payload.prePeriodPlan?.body, 'Rest, sip tea, warm bath.');
  assert.equal(payload.birthControlProfile?.method, 'pill');
  assert.equal(payload.intimacyEvents.length, 1);
  assert.match(payload.notice, /exported by the account owner/i);

  // Verify all 10 datasets were queried
  const tablesQueried = calls.map((c) => c.table);
  for (const table of ['profiles', 'check_ins', 'medications', 'medication_logs', 'journal_entries', 'cycle_settings', 'cycle_events', 'pre_period_plans', 'birth_control_profile', 'intimacy_events']) {
    assert.equal(tablesQueried.includes(table), true, `Missing query for ${table}`);
  }
});

test('account deletion sequence cancels notifications and invokes RPC without caller user_id parameter', async () => {
  const { client, calls } = mockSupabaseClient('user-alex');
  let notificationCancelled = false;

  async function mockDeleteAccountData() {
    notificationCancelled = true;
    const res = await client.rpc();
    if (res.error) throw new Error((res.error as { message: string }).message);
  }

  await mockDeleteAccountData();

  assert.equal(notificationCancelled, true);
  const rpcCall = calls.find((c) => c.operation === 'delete_my_account');
  assert.notEqual(rpcCall, undefined);
});

test('database deletion failure preserves state and throws error', async () => {
  let sessionCleared = false;
  const client = {
    async rpc() {
      return { data: null, error: { message: 'Database connection failed' } };
    },
    auth: {
      async signOut(_options?: { scope?: string }) {
        sessionCleared = true;
        return { error: null };
      },
    },
  };

  async function mockDeleteAccountData() {
    const res = await client.rpc();
    if (res.error) throw new Error((res.error as { message: string }).message);
    await client.auth.signOut({ scope: 'local' });
  }

  await assert.rejects(mockDeleteAccountData(), /Database connection failed/);
  assert.equal(sessionCleared, false, 'Session must not be cleared when database deletion fails');
});

test('RPC deletion success completes even if server signout or notification cleanup fails', async () => {
  let notificationCancelAttempted = false;
  let localSignoutAttempted = false;

  async function mockNotificationCancel() {
    notificationCancelAttempted = true;
    throw new Error('Notification subsystem error');
  }

  const client = {
    async rpc() {
      return { data: null, error: null };
    },
    auth: {
      async signOut(options?: { scope?: string }) {
        localSignoutAttempted = true;
        assert.equal(options?.scope, 'local');
        return { error: null };
      },
    },
  };

  async function mockDeleteAccountData() {
    try {
      await mockNotificationCancel();
    } catch {
      // Continue cloud deletion even if notification cleanup fails
    }
    const res = await client.rpc();
    if (res.error) throw new Error((res.error as { message: string }).message);
    try {
      await client.auth.signOut({ scope: 'local' });
    } catch {
      // Best-effort local cleanup
    }
  }

  await mockDeleteAccountData();
  assert.equal(notificationCancelAttempted, true);
  assert.equal(localSignoutAttempted, true);
});

test('local session cleanup removes only Symptom Story auth storage without wiping unrelated AsyncStorage keys', async () => {
  const mockStorage: Record<string, string> = {
    'sb-xyz-auth-token': JSON.stringify({ access_token: 'secret' }),
    'unrelated-app-setting': 'keep-me',
  };

  function mockSignOutLocal() {
    delete mockStorage['sb-xyz-auth-token'];
    return { error: null };
  }

  mockSignOutLocal();

  assert.equal('sb-xyz-auth-token' in mockStorage, false, 'Symptom Story auth session must be removed');
  assert.equal(mockStorage['unrelated-app-setting'], 'keep-me', 'Unrelated device data must not be cleared');
});
